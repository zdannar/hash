import { genEntityId } from "../../../util";
import { DbUser } from "../../../types/dbTypes";
import {
  MutationCreateUserArgs,
  Resolver,
  Visibility,
} from "../../autoGeneratedTypes";
import { GraphQLContext } from "../../context";

export const createUser: Resolver<
  Promise<DbUser>,
  {},
  GraphQLContext,
  MutationCreateUserArgs
> = async (_, { email, shortname }, { dataSources }) => {
  const id = genEntityId();
  // TODO: should check for uniqueness of email

  const entity = await dataSources.db.createEntity({
    accountId: id,
    entityId: id,
    createdById: id, // Users "create" themselves
    type: "User",
    properties: { email, shortname },
  });

  const user: DbUser = {
    ...entity,
    id: entity.entityId,
    accountId: entity.accountId,
    type: "User",
    visibility: Visibility.Public, // TODO
  };

  return user;
};
