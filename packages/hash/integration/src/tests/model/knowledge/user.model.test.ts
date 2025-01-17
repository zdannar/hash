import { getRequiredEnv } from "@hashintel/hash-backend-utils/environment";
import {
  createGraphClient,
  ensureSystemGraphIsInitialized,
} from "@hashintel/hash-api/src/graph";
import { Logger } from "@hashintel/hash-backend-utils/logger";

import { UserModel } from "@hashintel/hash-api/src/model";
import {
  kratosIdentityApi,
  createKratosIdentity,
} from "@hashintel/hash-api/src/auth/ory-kratos";
import { systemUserAccountId } from "@hashintel/hash-api/src/graph/system-user";
import { TypeSystemInitializer } from "@blockprotocol/type-system";
import { createTestOrg, generateRandomShortname } from "../../util";

jest.setTimeout(60000);

const logger = new Logger({
  mode: "dev",
  level: "debug",
  serviceName: "integration-tests",
});

const graphApiHost = getRequiredEnv("HASH_GRAPH_API_HOST");
const graphApiPort = parseInt(getRequiredEnv("HASH_GRAPH_API_PORT"), 10);

const graphApi = createGraphClient(logger, {
  host: graphApiHost,
  port: graphApiPort,
});

const shortname = generateRandomShortname("userTest");

describe("User model class", () => {
  beforeAll(async () => {
    await TypeSystemInitializer.initialize();
    await ensureSystemGraphIsInitialized({ graphApi, logger });
  });

  let createdUser: UserModel;

  let kratosIdentityId: string;

  it("can create a user", async () => {
    const identity = await createKratosIdentity({
      traits: {
        emails: ["alice@example.com"],
      },
    });

    kratosIdentityId = identity.id;

    createdUser = await UserModel.createUser(graphApi, {
      emails: ["alice@example.com"],
      kratosIdentityId,
      actorId: systemUserAccountId,
    });
  });

  it("cannot create a user with a kratos identity id that is already taken", async () => {
    await expect(
      UserModel.createUser(graphApi, {
        emails: ["bob@example.com"],
        kratosIdentityId,
        actorId: systemUserAccountId,
      }),
    ).rejects.toThrowError(`"${kratosIdentityId}" already exists.`);
  });

  it("can get the account id", () => {
    expect(createdUser.getEntityUuid()).toBeDefined();
  });

  it("can update the shortname of a user", async () => {
    createdUser = await createdUser.updateShortname(graphApi, {
      updatedShortname: shortname,
      actorId: createdUser.getEntityUuid(),
    });
  });

  it("can update the preferred name of a user", async () => {
    createdUser = await createdUser.updatePreferredName(graphApi, {
      updatedPreferredName: "Alice",
      actorId: createdUser.getEntityUuid(),
    });
  });

  it("can get a user by its shortname", async () => {
    const fetchedUser = await UserModel.getUserByShortname(graphApi, {
      shortname,
    });

    expect(fetchedUser).not.toBeNull();

    expect(fetchedUser).toEqual(createdUser);
  });

  it("can get a user by its kratos identity id", async () => {
    const fetchedUser = await UserModel.getUserByKratosIdentityId(graphApi, {
      kratosIdentityId,
    });

    expect(fetchedUser).not.toBeNull();

    expect(fetchedUser).toEqual(createdUser);
  });

  it("can join an org", async () => {
    const testOrg = await createTestOrg(graphApi, "userModelTest", logger);

    const orgEntityUuid = testOrg.getEntityUuid();

    expect(await createdUser.isMemberOfOrg(graphApi, { orgEntityUuid })).toBe(
      false,
    );

    await createdUser.joinOrg(graphApi, {
      org: testOrg,
      responsibility: "developer",
      actorId: systemUserAccountId,
    });

    expect(await createdUser.isMemberOfOrg(graphApi, { orgEntityUuid })).toBe(
      true,
    );
  });

  afterAll(async () => {
    await kratosIdentityApi.deleteIdentity({ id: kratosIdentityId });
  });
});
