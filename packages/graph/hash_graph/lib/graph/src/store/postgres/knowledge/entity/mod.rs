mod read;

use std::{collections::hash_map::Entry, future::Future, pin::Pin};

use async_trait::async_trait;
use error_stack::{IntoReport, Report, Result, ResultExt};
use futures::FutureExt;
use tokio_postgres::GenericClient;
use type_system::uri::VersionedUri;
use uuid::Uuid;

use crate::{
    identifier::{
        knowledge::{
            EntityEditionId, EntityId, EntityIdAndTimestamp, EntityRecordId, EntityVersion,
        },
        ontology::OntologyTypeEditionId,
        DecisionTimespan, DecisionTimestamp, GraphElementEditionId, TransactionTimespan,
    },
    knowledge::{Entity, EntityLinkOrder, EntityMetadata, EntityProperties, EntityUuid, LinkData},
    provenance::{OwnedById, ProvenanceMetadata, UpdatedById},
    store::{
        crud::Read,
        error::{EntityDoesNotExist, RaceConditionOnUpdate},
        postgres::{DependencyContext, DependencyStatus},
        query::Filter,
        AsClient, EntityStore, InsertionError, PostgresStore, QueryError, UpdateError,
    },
    subgraph::{
        edges::{
            Edge, EdgeResolveDepths, GraphResolveDepths, KnowledgeGraphEdgeKind,
            KnowledgeGraphOutwardEdges, OutgoingEdgeResolveDepth, OutwardEdge, SharedEdgeKind,
        },
        query::StructuralQuery,
        vertices::KnowledgeGraphVertex,
        Subgraph,
    },
};

impl<C: AsClient> PostgresStore<C> {
    /// Internal method to read an [`Entity`] into a [`DependencyContext`].
    ///
    /// This is used to recursively resolve a type, so the result can be reused.
    #[expect(clippy::too_many_lines)]
    pub(crate) fn traverse_entity<'a>(
        &'a self,
        entity_edition_id: EntityEditionId,
        dependency_context: &'a mut DependencyContext,
        subgraph: &'a mut Subgraph,
        current_resolve_depth: GraphResolveDepths,
    ) -> Pin<Box<dyn Future<Output = Result<(), QueryError>> + Send + 'a>> {
        async move {
            let dependency_status = dependency_context
                .knowledge_dependency_map
                .insert(&entity_edition_id, current_resolve_depth);

            // Explicitly converting the unique reference to a shared reference to the vertex to
            // avoid mutating it by accident
            let entity: Option<&KnowledgeGraphVertex> = match dependency_status {
                DependencyStatus::Unresolved => {
                    match subgraph.vertices.knowledge_graph.entry(entity_edition_id) {
                        Entry::Occupied(entry) => Some(entry.into_mut()),
                        Entry::Vacant(entry) => {
                            let entity = Read::<Entity>::read_one(
                                self,
                                &Filter::for_entity_by_edition_id(entity_edition_id),
                            )
                            .await?;
                            Some(entry.insert(KnowledgeGraphVertex::Entity(entity)))
                        }
                    }
                }
                DependencyStatus::Resolved => None,
            };

            if let Some(KnowledgeGraphVertex::Entity(entity)) = entity {
                let entity_type_id =
                    OntologyTypeEditionId::from(entity.metadata().entity_type_id());
                let entity_edition_id = entity.metadata().edition_id();

                if current_resolve_depth.is_of_type.outgoing > 0 {
                    subgraph.edges.insert(Edge::KnowledgeGraph {
                        edition_id: entity_edition_id,
                        outward_edge: KnowledgeGraphOutwardEdges::ToOntology(OutwardEdge {
                            kind: SharedEdgeKind::IsOfType,
                            reversed: false,
                            right_endpoint: entity_type_id.clone(),
                        }),
                    });

                    self.traverse_entity_type(
                        &entity_type_id,
                        dependency_context,
                        subgraph,
                        GraphResolveDepths {
                            is_of_type: OutgoingEdgeResolveDepth {
                                outgoing: current_resolve_depth.is_of_type.outgoing - 1,
                                ..current_resolve_depth.is_of_type
                            },
                            ..current_resolve_depth
                        },
                    )
                    .await?;
                }

                if current_resolve_depth.has_left_entity.incoming > 0 {
                    for outgoing_link_entity in <Self as Read<Entity>>::read(
                        self,
                        &Filter::for_outgoing_link_by_source_entity_edition_id(entity_edition_id),
                    )
                    .await?
                    {
                        // We want to log the time the link entity was *first* added from this
                        // entity. We therefore need to find the timestamp of the first link
                        // entity
                        // TODO: this is very slow, we should update structural querying to be
                        //       able to  get the first timestamp of something efficiently
                        let mut all_outgoing_link_lower_decision_timestamps: Vec<_> =
                            <Self as Read<Entity>>::read(
                                self,
                                &Filter::for_entity_by_entity_id(
                                    outgoing_link_entity.metadata().edition_id().base_id(),
                                ),
                            )
                            .await?
                            .into_iter()
                            .map(|entity| {
                                entity
                                    .metadata()
                                    .edition_id()
                                    .version()
                                    .transaction_time()
                                    .as_start_bound_timestamp()
                            })
                            .collect();

                        all_outgoing_link_lower_decision_timestamps.sort();

                        let earliest_timestamp = all_outgoing_link_lower_decision_timestamps
                            .into_iter()
                            .next()
                            .expect(
                                "we got the edition id from the entity in the first place, there \
                                 must be at least one version",
                            );

                        subgraph.edges.insert(Edge::KnowledgeGraph {
                            edition_id: entity_edition_id,
                            outward_edge: KnowledgeGraphOutwardEdges::ToKnowledgeGraph(
                                OutwardEdge {
                                    // (HasLeftEntity, reversed=true) is equivalent to an
                                    // outgoing link `Entity`
                                    kind: KnowledgeGraphEdgeKind::HasLeftEntity,
                                    reversed: true,
                                    right_endpoint: EntityIdAndTimestamp::new(
                                        outgoing_link_entity.metadata().edition_id().base_id(),
                                        earliest_timestamp,
                                    ),
                                },
                            ),
                        });

                        self.traverse_entity(
                            outgoing_link_entity.metadata().edition_id(),
                            dependency_context,
                            subgraph,
                            GraphResolveDepths {
                                has_left_entity: EdgeResolveDepths {
                                    incoming: current_resolve_depth.has_left_entity.incoming - 1,
                                    ..current_resolve_depth.has_left_entity
                                },
                                ..current_resolve_depth
                            },
                        )
                        .await?;
                    }
                }

                if current_resolve_depth.has_right_entity.incoming > 0 {
                    for incoming_link_entity in <Self as Read<Entity>>::read(
                        self,
                        &Filter::for_incoming_link_by_source_entity_edition_id(entity_edition_id),
                    )
                    .await?
                    {
                        // We want to log the time the link entity was *first* added from this
                        // entity. We therefore need to find the timestamp of the first link
                        // entity
                        // TODO: this is very slow, we should update structural querying to be
                        //       able to get the first timestamp of something efficiently
                        let mut all_incoming_link_lower_decision_timestamps: Vec<_> =
                            <Self as Read<Entity>>::read(
                                self,
                                &Filter::for_entity_by_entity_id(
                                    incoming_link_entity.metadata().edition_id().base_id(),
                                ),
                            )
                            .await?
                            .into_iter()
                            .map(|entity| {
                                entity
                                    .metadata()
                                    .edition_id()
                                    .version()
                                    .transaction_time()
                                    .as_start_bound_timestamp()
                            })
                            .collect();

                        all_incoming_link_lower_decision_timestamps.sort();

                        let earliest_timestamp = all_incoming_link_lower_decision_timestamps
                            .into_iter()
                            .next()
                            .expect(
                                "we got the edition id from the entity in the first place, there \
                                 must be at least one version",
                            );

                        subgraph.edges.insert(Edge::KnowledgeGraph {
                            edition_id: entity_edition_id,
                            outward_edge: KnowledgeGraphOutwardEdges::ToKnowledgeGraph(
                                OutwardEdge {
                                    // (HasRightEntity, reversed=true) is equivalent to an
                                    // incoming link `Entity`
                                    kind: KnowledgeGraphEdgeKind::HasRightEntity,
                                    reversed: true,
                                    right_endpoint: EntityIdAndTimestamp::new(
                                        incoming_link_entity.metadata().edition_id().base_id(),
                                        earliest_timestamp,
                                    ),
                                },
                            ),
                        });

                        self.traverse_entity(
                            incoming_link_entity.metadata().edition_id(),
                            dependency_context,
                            subgraph,
                            GraphResolveDepths {
                                has_right_entity: EdgeResolveDepths {
                                    incoming: current_resolve_depth.has_right_entity.incoming - 1,
                                    ..current_resolve_depth.has_right_entity
                                },
                                ..current_resolve_depth
                            },
                        )
                        .await?;
                    }
                }

                if current_resolve_depth.has_left_entity.outgoing > 0 {
                    for left_entity in <Self as Read<Entity>>::read(
                        self,
                        &Filter::for_left_entity_by_entity_edition_id(entity_edition_id),
                    )
                    .await?
                    {
                        // We want to log the time _this_ link entity was *first* added from the
                        // left entity. We therefore need to find the timestamp of this entity
                        // TODO: this is very slow, we should update structural querying to be
                        //       able to get the first timestamp of something efficiently
                        let mut all_self_lower_decision_timestamps: Vec<_> =
                            <Self as Read<Entity>>::read(
                                self,
                                &Filter::for_entity_by_entity_id(entity_edition_id.base_id()),
                            )
                            .await?
                            .into_iter()
                            .map(|entity| {
                                entity
                                    .metadata()
                                    .edition_id()
                                    .version()
                                    .transaction_time()
                                    .as_start_bound_timestamp()
                            })
                            .collect();

                        all_self_lower_decision_timestamps.sort();

                        let earliest_timestamp = all_self_lower_decision_timestamps
                            .into_iter()
                            .next()
                            .expect(
                                "we got the edition id from the entity in the first place, there \
                                 must be at least one version",
                            );

                        subgraph.edges.insert(Edge::KnowledgeGraph {
                            edition_id: entity_edition_id,
                            outward_edge: KnowledgeGraphOutwardEdges::ToKnowledgeGraph(
                                OutwardEdge {
                                    // (HasLeftEndpoint, reversed=true) is equivalent to an
                                    // outgoing `Link` `Entity`
                                    kind: KnowledgeGraphEdgeKind::HasLeftEntity,
                                    reversed: false,
                                    right_endpoint: EntityIdAndTimestamp::new(
                                        left_entity.metadata().edition_id().base_id(),
                                        earliest_timestamp,
                                    ),
                                },
                            ),
                        });

                        self.traverse_entity(
                            left_entity.metadata().edition_id(),
                            dependency_context,
                            subgraph,
                            GraphResolveDepths {
                                has_left_entity: EdgeResolveDepths {
                                    outgoing: current_resolve_depth.has_left_entity.outgoing - 1,
                                    ..current_resolve_depth.has_left_entity
                                },
                                ..current_resolve_depth
                            },
                        )
                        .await?;
                    }
                }

                if current_resolve_depth.has_right_entity.outgoing > 0 {
                    for right_entity in <Self as Read<Entity>>::read(
                        self,
                        &Filter::for_right_entity_by_entity_edition_id(entity_edition_id),
                    )
                    .await?
                    {
                        // We want to log the time _this_ link entity was *first* added to the
                        // right entity. We therefore need to find the timestamp of this entity
                        // TODO: this is very slow, we should update structural querying to be
                        //       able to  get the first timestamp of something efficiently
                        let mut all_self_lower_decision_timestamps: Vec<_> =
                            <Self as Read<Entity>>::read(
                                self,
                                &Filter::for_entity_by_entity_id(entity_edition_id.base_id()),
                            )
                            .await?
                            .into_iter()
                            .map(|entity| {
                                entity
                                    .metadata()
                                    .edition_id()
                                    .version()
                                    .transaction_time()
                                    .as_start_bound_timestamp()
                            })
                            .collect();

                        all_self_lower_decision_timestamps.sort();

                        let earliest_timestamp = all_self_lower_decision_timestamps
                            .into_iter()
                            .next()
                            .expect(
                                "we got the edition id from the entity in the first place, there \
                                 must be at least one version",
                            );

                        subgraph.edges.insert(Edge::KnowledgeGraph {
                            edition_id: entity_edition_id,
                            outward_edge: KnowledgeGraphOutwardEdges::ToKnowledgeGraph(
                                OutwardEdge {
                                    // (HasLeftEndpoint, reversed=true) is equivalent to an
                                    // outgoing `Link` `Entity`
                                    kind: KnowledgeGraphEdgeKind::HasRightEntity,
                                    reversed: false,
                                    right_endpoint: EntityIdAndTimestamp::new(
                                        right_entity.metadata().edition_id().base_id(),
                                        earliest_timestamp,
                                    ),
                                },
                            ),
                        });

                        self.traverse_entity(
                            right_entity.metadata().edition_id(),
                            dependency_context,
                            subgraph,
                            GraphResolveDepths {
                                has_right_entity: EdgeResolveDepths {
                                    outgoing: current_resolve_depth.has_right_entity.outgoing - 1,
                                    ..current_resolve_depth.has_right_entity
                                },
                                ..current_resolve_depth
                            },
                        )
                        .await?;
                    }
                }
            }

            Ok(())
        }
        .boxed()
    }
}

#[async_trait]
impl<C: AsClient> EntityStore for PostgresStore<C> {
    async fn create_entity(
        &mut self,
        owned_by_id: OwnedById,
        entity_uuid: Option<EntityUuid>,
        decision_time: Option<DecisionTimestamp>,
        updated_by_id: UpdatedById,
        archived: bool,
        entity_type_id: VersionedUri,
        properties: EntityProperties,
        link_data: Option<LinkData>,
    ) -> Result<EntityMetadata, InsertionError> {
        let entity_id = EntityId::new(
            owned_by_id,
            entity_uuid.unwrap_or_else(|| EntityUuid::new(Uuid::new_v4())),
        );

        let entity_type_version_id = self
            .version_id_by_uri(&entity_type_id)
            .await
            .change_context(InsertionError)?;

        let properties = serde_json::to_value(properties)
            .into_report()
            .change_context(InsertionError)?;

        let row = self
            .as_client()
            .query_one(
                r#"
                SELECT
                    entity_record_id,
                    decision_time,
                    transaction_time
                FROM
                    create_entity(
                        _owned_by_id := $1,
                        _entity_uuid := $2,
                        _decision_time := $3,
                        _updated_by_id := $4,
                        _archived := $5,
                        _entity_type_version_id := $6,
                        _properties := $7,
                        _left_owned_by_id := $8,
                        _left_entity_uuid := $9,
                        _right_owned_by_id := $10,
                        _right_entity_uuid := $11,
                        _left_to_right_order := $12,
                        _right_to_left_order := $13
                    );
                "#,
                &[
                    &entity_id.owned_by_id(),
                    &entity_id.entity_uuid(),
                    &decision_time,
                    &updated_by_id,
                    &archived,
                    &entity_type_version_id,
                    &properties,
                    &link_data
                        .as_ref()
                        .map(|metadata| metadata.left_entity_id().owned_by_id()),
                    &link_data
                        .as_ref()
                        .map(|metadata| metadata.left_entity_id().entity_uuid()),
                    &link_data
                        .as_ref()
                        .map(|metadata| metadata.right_entity_id().owned_by_id()),
                    &link_data
                        .as_ref()
                        .map(|metadata| metadata.right_entity_id().entity_uuid()),
                    &link_data.as_ref().map(LinkData::left_to_right_order),
                    &link_data.as_ref().map(LinkData::right_to_left_order),
                ],
            )
            .await
            .into_report()
            .change_context(InsertionError)?;

        Ok(EntityMetadata::new(
            EntityEditionId::new(
                entity_id,
                EntityRecordId::new(row.get(0)),
                EntityVersion::new(
                    DecisionTimespan::new(row.get(1)),
                    TransactionTimespan::new(row.get(2)),
                ),
            ),
            entity_type_id,
            ProvenanceMetadata::new(updated_by_id),
            archived,
        ))
    }

    #[doc(hidden)]
    #[cfg(feature = "__internal_bench")]
    async fn insert_entities_batched_by_type(
        &mut self,
        entities: impl IntoIterator<
            Item = (
                OwnedById,
                Option<EntityUuid>,
                EntityProperties,
                Option<LinkData>,
                Option<DecisionTimestamp>,
            ),
            IntoIter: Send,
        > + Send,
        actor_id: UpdatedById,
        entity_type_id: &VersionedUri,
    ) -> Result<Vec<EntityMetadata>, InsertionError> {
        let transaction = PostgresStore::new(
            self.as_mut_client()
                .transaction()
                .await
                .into_report()
                .change_context(InsertionError)?,
        );

        let entities = entities.into_iter();
        let mut entity_ids = Vec::with_capacity(entities.size_hint().0);
        let mut entity_editions = Vec::with_capacity(entities.size_hint().0);
        let mut entity_versions = Vec::with_capacity(entities.size_hint().0);
        for (owned_by_id, entity_uuid, properties, link_data, decision_time) in entities {
            entity_ids.push((
                EntityId::new(
                    owned_by_id,
                    entity_uuid.unwrap_or_else(|| EntityUuid::new(Uuid::new_v4())),
                ),
                link_data.as_ref().map(LinkData::left_entity_id),
                link_data.as_ref().map(LinkData::right_entity_id),
            ));
            entity_editions.push((
                properties,
                link_data.as_ref().and_then(LinkData::left_to_right_order),
                link_data.as_ref().and_then(LinkData::right_to_left_order),
            ));
            entity_versions.push(decision_time);
        }

        // TODO: match on and return the relevant error
        //   https://app.asana.com/0/1200211978612931/1202574350052904/f
        transaction
            .insert_entity_ids(entity_ids.iter().copied())
            .await?;

        // Using one entity type per entity would result in more lookups, which results in a more
        // complex logic and/or be inefficient.
        // Please see the documentation for this function on the trait for more information.
        let entity_type_version_id = transaction
            .version_id_by_uri(entity_type_id)
            .await
            .change_context(InsertionError)?;

        let entity_record_ids = transaction
            .insert_entity_records(entity_editions, entity_type_version_id, actor_id)
            .await?;

        let entity_versions = transaction
            .insert_entity_versions(
                entity_ids
                    .iter()
                    .copied()
                    .zip(entity_record_ids.iter().copied())
                    .zip(entity_versions)
                    .map(|(((entity_id, ..), entity_edition_id), decision_time)| {
                        (entity_id, entity_edition_id, decision_time)
                    }),
            )
            .await?;

        transaction
            .client
            .commit()
            .await
            .into_report()
            .change_context(InsertionError)?;

        Ok(entity_ids
            .into_iter()
            .zip(entity_versions)
            .zip(entity_record_ids)
            .map(|(((entity_id, ..), entity_version), entity_record_id)| {
                EntityMetadata::new(
                    EntityEditionId::new(entity_id, entity_record_id, entity_version),
                    entity_type_id.clone(),
                    ProvenanceMetadata::new(actor_id),
                    false,
                )
            })
            .collect())
    }

    async fn get_entity<'f: 'q, 'q>(
        &self,
        query: &'f StructuralQuery<'q, Entity>,
    ) -> Result<Subgraph, QueryError> {
        let StructuralQuery {
            ref filter,
            graph_resolve_depths,
        } = *query;

        let mut subgraph = Subgraph::new(graph_resolve_depths);
        let mut dependency_context = DependencyContext::default();

        for entity in Read::<Entity>::read(self, filter).await? {
            let entity_edition_id = entity.metadata().edition_id();

            // Insert the vertex into the subgraph to avoid another lookup when traversing it
            subgraph
                .vertices
                .knowledge_graph
                .insert(entity_edition_id, KnowledgeGraphVertex::Entity(entity));

            self.traverse_entity(
                entity_edition_id,
                &mut dependency_context,
                &mut subgraph,
                graph_resolve_depths,
            )
            .await?;

            subgraph
                .roots
                .insert(GraphElementEditionId::KnowledgeGraph(entity_edition_id));
        }

        Ok(subgraph)
    }

    async fn update_entity(
        &mut self,
        entity_id: EntityId,
        decision_time: Option<DecisionTimestamp>,
        updated_by_id: UpdatedById,
        archived: bool,
        entity_type_id: VersionedUri,
        properties: EntityProperties,
        link_order: EntityLinkOrder,
    ) -> Result<EntityMetadata, UpdateError> {
        let entity_type_version_id = self
            .version_id_by_uri(&entity_type_id)
            .await
            .change_context(UpdateError)?;

        let properties = serde_json::to_value(properties)
            .into_report()
            .change_context(UpdateError)?;

        // The transaction is required to check if the update happened. If there were no returned
        // row, it either means, that there was no entity with that parameters or a race condition
        // happened.
        let transaction = PostgresStore::new(
            self.as_mut_client()
                .transaction()
                .await
                .into_report()
                .change_context(UpdateError)?,
        );

        if transaction
            .as_client()
            .query_opt(
                r#"
                 SELECT EXISTS (
                    SELECT 1 FROM entity_ids WHERE owned_by_id = $1 AND entity_uuid = $2
                 );"#,
                &[&entity_id.owned_by_id(), &entity_id.entity_uuid()],
            )
            .await
            .into_report()
            .change_context(UpdateError)?
            .is_none()
        {
            return Err(Report::new(EntityDoesNotExist)
                .attach(entity_id)
                .change_context(UpdateError));
        }

        let row = transaction
            .as_client()
            .query_opt(
                r#"
                SELECT
                    entity_record_id,
                    decision_time,
                    transaction_time
                FROM
                    update_entity(
                        _owned_by_id := $1,
                        _entity_uuid := $2,
                        _decision_time := $3,
                        _updated_by_id := $4,
                        _archived := $5,
                        _entity_type_version_id := $6,
                        _properties := $7,
                        _left_to_right_order := $8,
                        _right_to_left_order := $9
                    );
                "#,
                &[
                    &entity_id.owned_by_id(),
                    &entity_id.entity_uuid(),
                    &decision_time,
                    &updated_by_id,
                    &archived,
                    &entity_type_version_id,
                    &properties,
                    &link_order.left_to_right(),
                    &link_order.right_to_left(),
                ],
            )
            .await
            .into_report()
            .change_context(UpdateError)?;

        let Some(row) = row else {
            return Err(Report::new(RaceConditionOnUpdate)
                .attach(entity_id)
                .change_context(UpdateError));
        };

        transaction
            .client
            .commit()
            .await
            .into_report()
            .change_context(UpdateError)?;

        Ok(EntityMetadata::new(
            EntityEditionId::new(
                entity_id,
                EntityRecordId::new(row.get(0)),
                EntityVersion::new(
                    DecisionTimespan::new(row.get(1)),
                    TransactionTimespan::new(row.get(2)),
                ),
            ),
            entity_type_id,
            ProvenanceMetadata::new(updated_by_id),
            archived,
        ))
    }
}
