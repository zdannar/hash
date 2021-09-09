import { ApolloError } from "apollo-server-express";

import { QueryGetEntityTypeArgs, Resolver } from "../../apiTypes.gen";
import { GraphQLContext } from "../../context";
import { EntityTypeWithoutTypeFields } from "../../../model";
import { EntityType } from "../../../model";

export const getEntityType: Resolver<
  Promise<EntityTypeWithoutTypeFields>,
  {},
  GraphQLContext,
  QueryGetEntityTypeArgs
  > = async (_, { entityTypeId }, { dataSources }) => {

  const entityType = await EntityType.getEntityType(dataSources.db)({ entityTypeId});

  if (!entityType) {
    throw new ApolloError(
      `EntityType with entityId ${entityTypeId} not found`, "NOT_FOUND"
    );
  }

  return entityType.toGQLEntityType();
};
