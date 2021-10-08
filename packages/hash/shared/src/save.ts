/* eslint-disable no-param-reassign */
import { ApolloClient } from "@apollo/client";
import { isEqual, uniqBy } from "lodash";
import { Node as ProsemirrorNode, Schema } from "prosemirror-model";
import { BlockEntity, getTextEntityFromBlock } from "./entity";
import { EntityStore, EntityStoreType, isBlockEntity } from "./entityStore";
import {
  SystemTypeName,
  TextPropertiesText,
  UpdatePageAction,
  UpdatePageContentsMutation,
  UpdatePageContentsMutationVariables,
} from "./graphql/apiTypes.gen";
import { updatePageContents } from "./queries/page.queries";
import {
  entityIdExists,
  EntityNode,
  findEntityNodes,
  nodeToComponentId,
} from "./util";

const nodeToEntityProperties = (node: ProsemirrorNode<Schema>) => {
  if (node.type.isTextblock) {
    const texts: TextPropertiesText[] = [];

    node.content.descendants((child) => {
      if (child.type.name === "text") {
        const marks = new Set<string>(
          child.marks.map((mark) => mark.type.name)
        );

        texts.push({
          text: child.text ?? "",
          ...(marks.has("strong") ? { bold: true } : {}),
          ...(marks.has("em") ? { italics: true } : {}),
          ...(marks.has("underlined") ? { underline: true } : {}),
        });
      }
    });

    return { texts };
  }
};

/**
 * Our operations need to combine the actions from the previous operation,
 * but the actual code to do this is a bit mundane / messes up code clarity,
 * so I've extracted that to a wrapper function. This means each operation
 * only needs to handle creating their own actions
 */
const defineOperation =
  <T extends any[]>(
    fn: (
      entities: BlockEntity[],
      ...args: T
    ) => readonly [UpdatePageAction[], BlockEntity[]]
  ) =>
  (
    existingActions: UpdatePageAction[],
    entities: BlockEntity[],
    ...args: T
  ): [UpdatePageAction[], BlockEntity[]] => {
    const [nextActions, nextEntities] = fn(entities, ...args);

    return [[...existingActions, ...nextActions], nextEntities];
  };

const removeBlocks = defineOperation(
  (entities: BlockEntity[], nodes: EntityNode[]) => {
    const draftBlockEntityIds = new Set(
      nodes.map((node) => node.attrs.entityId)
    );

    const removedBlockEntities = entities
      .map((block, position) => [block, position] as const)
      .filter(([block]) => !draftBlockEntityIds.has(block.entityId));

    const updatedEntities = entities.filter(
      (_, position) =>
        !removedBlockEntities.some(
          ([, removedPosition]) => removedPosition === position
        )
    );

    const actions = removedBlockEntities.map(
      ([, position], idx): UpdatePageAction => ({
        /**
         * Each removal results in the position of further removals being
         * subtracted by 1 – luckily we can just used the index in the array to
         * work this out
         */
        removeBlock: { position: position - idx },
      })
    );

    return [actions, updatedEntities] as const;
  }
);

const moveBlocks = defineOperation(
  (entities: BlockEntity[], nodes: EntityNode[]) => {
    const entitiesWithoutNewBlocks = nodes.filter(
      (node) => !!node.attrs.entityId
    );

    const actions: UpdatePageAction[] = [];
    entities = [...entities];

    for (let position = 0; position < entities.length; position++) {
      const block = entities[position];
      const positionInDoc = entitiesWithoutNewBlocks.findIndex(
        (node) => node.attrs.entityId === block.entityId
      );

      if (positionInDoc < 0) {
        throw new Error(
          "invariant: found removed block whilst calculating movements"
        );
      }

      if (position !== positionInDoc) {
        actions.push({
          moveBlock: {
            currentPosition: position,
            newPosition: positionInDoc,
          },
        });
        entities.splice(position, 1);
        entities.splice(positionInDoc, 0, block);

        /**
         * @todo figure out how to calculate movements without starting again
         * after each movement
         */
        position = 0;
      }
    }
    return [actions, entities] as const;
  }
);

/**
 * @warning this does not apply its actions to the entities it returns as it is
 *          not necessary for the pipeline of calculations. Be wary of this.
 */
const insertBlocks = defineOperation(
  (entities: BlockEntity[], nodes: EntityNode[], accountId: string) => {
    const actions: UpdatePageAction[] = [];
    const exists = entityIdExists(entities);

    for (const [position, node] of Object.entries(nodes)) {
      if (exists(node.attrs.entityId)) {
        continue;
      }

      actions.push({
        insertNewBlock: {
          position: Number(position),
          componentId: nodeToComponentId(node),
          accountId,
          entityProperties: nodeToEntityProperties(node),
          // @todo support new non-text nodes
          systemTypeName: SystemTypeName.Text,
        },
      });
    }

    return [actions, entities] as const;
  }
);

/**
 * @warning this does not apply its actions to the entities it returns as it is
 *          not necessary for the pipeline of calculations. Be wary of this.
 */
const updateBlocks = defineOperation(
  (entities: BlockEntity[], nodes: EntityNode[], entityStore: EntityStore) => {
    const exists = entityIdExists(entities);

    /**
     * Currently when the same block exists on the page in multiple locations,
     * we prioritise the content of the first one that has changed when it
     * comes to working out if an un update is required. We need a better way
     * of handling this (i.e, take the *last* one that changed, and also more
     * immediately sync updates between changed blocks to prevent work being
     * lost)
     *
     * @todo improve this
     */
    const actions = uniqBy(
      nodes
        /**
         * An updated block also contains an updated entity, so we need to
         * create a list of entities that we need to post updates to via
         * GraphQL
         */
        .flatMap((node) => {
          const { entityId } = node.attrs;

          if (!exists(entityId)) {
            return [];
          }

          const savedEntity = (
            entityStore as Record<string, EntityStoreType | undefined>
          )[entityId];

          if (!savedEntity) {
            throw new Error("Entity missing from entity store");
          }

          if (!isBlockEntity(savedEntity)) {
            throw new Error("Non-block entity found when saving");
          }

          const childEntityId = savedEntity.properties.entity.entityId;
          const savedChildEntity = entityStore[childEntityId];

          if (!savedChildEntity) {
            throw new Error("Child entity missing from entity store");
          }

          // @todo could probably get this from entity store
          const existingBlock = entities.find(
            (entity) => entity.entityId === entityId
          );

          if (!existingBlock) {
            throw new Error("Cannot find existing block entity");
          }

          const updates: UpdatePageAction[] = [];
          const componentId = nodeToComponentId(node);

          if (componentId !== existingBlock.properties.componentId) {
            updates.push({
              updateEntity: {
                entityId,
                accountId: savedEntity.accountId,
                properties: {
                  componentId,
                  entityId: savedChildEntity.entityId,
                  accountId: savedChildEntity.accountId,
                },
              },
            });
          }

          if (node.type.isTextblock) {
            const textEntity = getTextEntityFromBlock(savedEntity);

            if (!textEntity) {
              throw new Error(
                "invariant: text entity missing for updating text node"
              );
            }

            const { texts } = textEntity.properties;
            const entityProperties = nodeToEntityProperties(node);

            if (!isEqual(texts, entityProperties?.texts)) {
              updates.push({
                updateEntity: {
                  entityId: textEntity.entityId,
                  accountId: textEntity.accountId,
                  properties: entityProperties,
                },
              });
            }
          }

          return updates;
        }),
      (action) => action.updateEntity?.entityId
    );

    return [actions, entities] as const;
  }
);

/**
 * This function (and the various subfunctions) are written to be as
 * readable as possible, as a priority over performance. Splitting it up into
 * processing each type of operation one at a time means I'm probably looping
 * more often that I need to. But it also makes the logic much more simple.
 *
 * This function loops through all the blocks on a page in order to
 * generate a list of actions to sync the api with the changes made by a
 * user. In order to do this, for each category of action, it loops through the
 * page blocks at least once, and compares them to result of the previous
 * action (or, if the first time, the result of the last save). When it finds a
 * difference, it produces an action which can reproduce that difference on
 * the API, and also emits a new version of the document with this action
 * applied optimistically, in order to aid further change calculations –
 * this is because each action is applied on the document produced by the
 * previous document, so we need to track this as our actions are developed.
 *
 * @todo this needs to be able to handle multiple blocks of the same id
 *       appearing on the same page
 */
const calculateSaveActions = (
  accountId: string,
  doc: ProsemirrorNode<Schema>,
  blocks: BlockEntity[],
  entityStore: EntityStore
) => {
  const blockEntityNodes = findEntityNodes(doc).map(([node]) => node);
  let actions: UpdatePageAction[] = [];

  blocks = [...blocks];
  [actions, blocks] = removeBlocks(actions, blocks, blockEntityNodes);
  [actions, blocks] = moveBlocks(actions, blocks, blockEntityNodes);
  [actions, blocks] = insertBlocks(
    actions,
    blocks,
    blockEntityNodes,
    accountId
  );
  [actions] = updateBlocks(actions, blocks, blockEntityNodes, entityStore);
  return actions;
};

export const updatePageMutation = async (
  accountId: string,
  entityId: string,
  doc: ProsemirrorNode<Schema>,
  blocks: BlockEntity[],
  entityStore: EntityStore,
  client: ApolloClient<any>
) => {
  const actions = calculateSaveActions(accountId, doc, blocks, entityStore);

  const res = await client.mutate<
    UpdatePageContentsMutation,
    UpdatePageContentsMutationVariables
  >({
    variables: { actions, accountId, entityId },
    mutation: updatePageContents,
  });

  if (!res.data) {
    throw new Error("Failed");
  }

  await client.reFetchObservableQueries();

  return res.data.updatePageContents;
};
