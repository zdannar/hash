import { useMemo } from "react";
import { useQuery } from "@apollo/client";
import { types } from "@hashintel/hash-shared/ontology-types";
import { getRoots } from "@hashintel/hash-subgraph/src/stdlib/roots";
import { Subgraph, SubgraphRootTypes } from "@hashintel/hash-subgraph";
import { constructUser, User } from "../../lib/user";
import {
  GetAllLatestEntitiesQuery,
  GetAllLatestEntitiesQueryVariables,
} from "../../graphql/apiTypes.gen";
import { getAllLatestEntitiesQuery } from "../../graphql/queries/knowledge/entity.queries";

export const useUsers = (
  cache = false,
): {
  loading: boolean;
  users?: User[];
} => {
  const { data, loading } = useQuery<
    GetAllLatestEntitiesQuery,
    GetAllLatestEntitiesQueryVariables
  >(getAllLatestEntitiesQuery, {
    variables: {
      rootEntityTypeIds: [types.entityType.user.entityTypeId],
      constrainsValuesOn: { outgoing: 0 },
      constrainsPropertiesOn: { outgoing: 0 },
      constrainsLinksOn: { outgoing: 0 },
      constrainsLinkDestinationsOn: { outgoing: 0 },
      isOfType: { outgoing: 1 },
      hasLeftEntity: { incoming: 1, outgoing: 1 },
      hasRightEntity: { incoming: 1, outgoing: 1 },
    },
    /** @todo reconsider caching. This is done for testing/demo purposes. */
    fetchPolicy: cache ? "cache-first" : "no-cache",
  });

  const { getAllLatestEntities: subgraph } = data ?? {};

  const users = useMemo(() => {
    if (!subgraph) {
      return undefined;
    }

    // Sharing the same resolved map makes the map below slightly more efficient
    const resolvedUsers = {};
    const resolvedOrgs = {};

    /** @todo - Is there a way we can ergonomically encode this in the GraphQL type? */
    return getRoots(subgraph as Subgraph<SubgraphRootTypes["entity"]>).map(
      ({ metadata: { editionId } }) =>
        constructUser({
          subgraph,
          userEntityEditionId: editionId,
          resolvedUsers,
          resolvedOrgs,
        }),
    );
  }, [subgraph]);

  return {
    loading,
    users,
  };
};
