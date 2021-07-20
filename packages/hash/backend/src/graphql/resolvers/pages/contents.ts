import { Resolver, Visibility } from "../../autoGeneratedTypes";
import { DbBlock, DbPage } from "../../../types/dbTypes";
import { GraphQLContext } from "../../context";
import { ApolloError } from "apollo-server-express";

export const contents: Resolver<
  Promise<DbBlock[]>,
  DbPage["properties"],
  GraphQLContext
> = async ({ contents }, _, { dataSources }) => {
  // TODO: make a getEntities DB query which can retrieve multiple in the same
  // transaction.
  const entities = await Promise.all(
    contents.map(async ({ accountId, entityId }) => {
      return await dataSources.db.getEntity({
        accountId,
        entityId: entityId,
      });
    })
  );

  entities.forEach((entity, i) => {
    if (!entity) {
      const { accountId, entityId } = contents[i];
      throw new ApolloError(
        `entity ${entityId} not found in account ${accountId}`,
        "NOT_FOUND"
      );
    }
  });

  const res = entities.map((entity) => ({
    ...entity,
    id: entity!.entityId,
    accountId: entity!.accountId,
    visibility: Visibility.Public, // TODO: get from entity metadata
  })) as DbBlock[];

  return res;
};
