import { Logger } from "@hashintel/hash-backend-utils/logger";
import { GraphApi } from "@hashintel/hash-graph-client";
import { types } from "@hashintel/hash-shared/ontology-types";
import { logger } from "../logger";

import { EntityTypeModel, PropertyTypeModel } from "../model";
import { propertyTypeInitializer, entityTypeInitializer } from "../model/util";

// eslint-disable-next-line import/no-mutable-exports
export let SYSTEM_TYPES: {
  dataType: {};
  propertyType: {
    // General account related
    shortName: PropertyTypeModel;

    // User-related
    email: PropertyTypeModel;
    kratosIdentityId: PropertyTypeModel;
    preferredName: PropertyTypeModel;

    // Org-related
    orgName: PropertyTypeModel;
    orgSize: PropertyTypeModel;
    orgProvidedInfo: PropertyTypeModel;

    // OrgMembership-related
    responsibility: PropertyTypeModel;

    // Block-related
    componentId: PropertyTypeModel;

    // Page-related
    archived: PropertyTypeModel;
    summary: PropertyTypeModel;
    title: PropertyTypeModel;
    index: PropertyTypeModel;
    icon: PropertyTypeModel;

    // Text-related
    tokens: PropertyTypeModel;

    // Comment-related
    resolvedAt: PropertyTypeModel;
    deletedAt: PropertyTypeModel;

    // HASH Instance related
    userSelfRegistrationIsEnabled: PropertyTypeModel;
    userRegistrationByInviteIsEnabled: PropertyTypeModel;
    orgSelfRegistrationIsEnabled: PropertyTypeModel;
  };
  entityType: {
    hashInstance: EntityTypeModel;
    user: EntityTypeModel;
    org: EntityTypeModel;
    block: EntityTypeModel;
    comment: EntityTypeModel;
    page: EntityTypeModel;
    text: EntityTypeModel;
    /**
     * @todo: deprecate all uses of this dummy entity type
     * @see https://app.asana.com/0/1202805690238892/1203015527055368/f
     */
    dummy: EntityTypeModel;
  };
  linkEntityType: {
    // HASHInstance-related
    admin: EntityTypeModel;

    // User-related
    orgMembership: EntityTypeModel;

    // Block-related
    blockData: EntityTypeModel;

    // Page-related
    contains: EntityTypeModel;
    parent: EntityTypeModel;

    // Comment-related
    hasText: EntityTypeModel;
    author: EntityTypeModel;
  };
};

const userSelfRegistrationIsEnabledPropertyTypeInitializer =
  propertyTypeInitializer({
    ...types.propertyType.userSelfRegistrationIsEnabled,
    possibleValues: [{ primitiveDataType: "boolean" }],
  });

const orgSelfRegistrationIsEnabledPropertyTypeInitializer =
  propertyTypeInitializer({
    ...types.propertyType.orgSelfRegistrationIsEnabled,
    possibleValues: [{ primitiveDataType: "boolean" }],
  });

const userRegistrationByInviteIsEnabledPropertyTypeInitializer =
  propertyTypeInitializer({
    ...types.propertyType.userRegistrationByInviteIsEnabled,
    possibleValues: [{ primitiveDataType: "boolean" }],
  });

export const adminLinkEntityTypeInitializer = entityTypeInitializer(
  types.linkEntityType.admin,
);

export const hashInstanceEntityTypeInitializer = async (graphApi: GraphApi) => {
  /* eslint-disable @typescript-eslint/no-use-before-define */

  const userSelfRegistrationIsEnabledPropertyTypeModel =
    await SYSTEM_TYPES_INITIALIZERS.propertyType.userSelfRegistrationIsEnabled(
      graphApi,
    );

  const orgSelfRegistrationIsEnabledPropertyTypeModel =
    await SYSTEM_TYPES_INITIALIZERS.propertyType.orgSelfRegistrationIsEnabled(
      graphApi,
    );

  const userRegistrationByInviteIsEnabledPropertyTypeModel =
    await SYSTEM_TYPES_INITIALIZERS.propertyType.userRegistrationByInviteIsEnabled(
      graphApi,
    );

  const adminLinkEntityTypeModel =
    await SYSTEM_TYPES_INITIALIZERS.linkEntityType.admin(graphApi);

  const userEntityTypeModel = await SYSTEM_TYPES_INITIALIZERS.entityType.user(
    graphApi,
  );

  /* eslint-enable @typescript-eslint/no-use-before-define */

  return entityTypeInitializer({
    ...types.entityType.hashInstance,
    properties: [
      {
        propertyTypeModel: userSelfRegistrationIsEnabledPropertyTypeModel,
        required: true,
      },
      {
        propertyTypeModel: orgSelfRegistrationIsEnabledPropertyTypeModel,
        required: true,
      },
      {
        propertyTypeModel: userRegistrationByInviteIsEnabledPropertyTypeModel,
        required: true,
      },
    ],
    outgoingLinks: [
      {
        linkEntityTypeModel: adminLinkEntityTypeModel,
        destinationEntityTypeModels: [userEntityTypeModel],
      },
    ],
  })(graphApi);
};

// Generate the schema for the org provided info property type
export const orgProvidedInfoPropertyTypeInitializer = async (
  graphApi: GraphApi,
) => {
  const orgSizePropertyTypeModel =
    // eslint-disable-next-line @typescript-eslint/no-use-before-define
    await SYSTEM_TYPES_INITIALIZERS.propertyType.orgSize(graphApi);

  const orgSizeBaseUri = orgSizePropertyTypeModel.getBaseUri();

  return propertyTypeInitializer({
    ...types.propertyType.orgProvidedInfo,
    possibleValues: [
      {
        propertyTypeObjectProperties: {
          [orgSizeBaseUri]: {
            $ref: orgSizePropertyTypeModel.getSchema().$id,
          },
        },
      },
    ],
  })(graphApi);
};

// Generate the schema for the org entity type
export const orgEntityTypeInitializer = async (graphApi: GraphApi) => {
  /* eslint-disable @typescript-eslint/no-use-before-define */
  const shortnamePropertyTypeModel =
    await SYSTEM_TYPES_INITIALIZERS.propertyType.shortName(graphApi);

  const orgNamePropertyTypeModel =
    await SYSTEM_TYPES_INITIALIZERS.propertyType.orgName(graphApi);

  const orgProvidedInfoPropertyTypeModel =
    await SYSTEM_TYPES_INITIALIZERS.propertyType.orgProvidedInfo(graphApi);
  /* eslint-enable @typescript-eslint/no-use-before-define */

  return entityTypeInitializer({
    ...types.entityType.org,
    properties: [
      {
        propertyTypeModel: shortnamePropertyTypeModel,
        required: true,
      },
      {
        propertyTypeModel: orgNamePropertyTypeModel,
        required: true,
      },
      {
        propertyTypeModel: orgProvidedInfoPropertyTypeModel,
        required: false,
      },
    ],
  })(graphApi);
};

const shortnamePropertyTypeInitializer = propertyTypeInitializer({
  ...types.propertyType.shortName,
  possibleValues: [{ primitiveDataType: "text" }],
});

const orgNamePropertyTypeInitializer = propertyTypeInitializer({
  ...types.propertyType.orgName,
  possibleValues: [{ primitiveDataType: "text" }],
});

const orgSizePropertyTypeInitializer = propertyTypeInitializer({
  ...types.propertyType.orgSize,
  possibleValues: [{ primitiveDataType: "text" }],
});

const emailPropertyTypeInitializer = propertyTypeInitializer({
  ...types.propertyType.email,
  possibleValues: [{ primitiveDataType: "text" }],
});

const kratosIdentityIdPropertyTypeInitializer = propertyTypeInitializer({
  ...types.propertyType.kratosIdentityId,
  possibleValues: [{ primitiveDataType: "text" }],
});

const preferredNamePropertyTypeInitializer = propertyTypeInitializer({
  ...types.propertyType.preferredName,
  possibleValues: [{ primitiveDataType: "text" }],
});

const responsibilityPropertyTypeInitializer = propertyTypeInitializer({
  ...types.propertyType.responsibility,
  possibleValues: [{ primitiveDataType: "text" }],
});

const orgMembershipLinkEntityTypeInitializer = async (graphApi: GraphApi) => {
  /* eslint-disable @typescript-eslint/no-use-before-define */
  const responsibilityPropertyTypeModel =
    await SYSTEM_TYPES_INITIALIZERS.propertyType.responsibility(graphApi);
  /* eslint-enable @typescript-eslint/no-use-before-define */

  return entityTypeInitializer({
    ...types.linkEntityType.orgMembership,
    properties: [
      {
        propertyTypeModel: responsibilityPropertyTypeModel,
        required: true,
      },
    ],
  })(graphApi);
};

const userEntityTypeInitializer = async (graphApi: GraphApi) => {
  /* eslint-disable @typescript-eslint/no-use-before-define */
  const shortnamePropertyTypeModel =
    await SYSTEM_TYPES_INITIALIZERS.propertyType.shortName(graphApi);

  const emailPropertyTypeModel =
    await SYSTEM_TYPES_INITIALIZERS.propertyType.email(graphApi);

  const kratosIdentityIdPropertyTypeModel =
    await SYSTEM_TYPES_INITIALIZERS.propertyType.kratosIdentityId(graphApi);

  const preferredNamePropertyTypeModel =
    await SYSTEM_TYPES_INITIALIZERS.propertyType.preferredName(graphApi);

  const orgEntityTypeModel = await SYSTEM_TYPES_INITIALIZERS.entityType.org(
    graphApi,
  );

  const orgMembershipLinkEntityTypeModel =
    await SYSTEM_TYPES_INITIALIZERS.linkEntityType.orgMembership(graphApi);

  /* eslint-enable @typescript-eslint/no-use-before-define */

  return entityTypeInitializer({
    ...types.entityType.user,
    properties: [
      {
        propertyTypeModel: shortnamePropertyTypeModel,
      },
      {
        propertyTypeModel: emailPropertyTypeModel,
        required: true,
        array: { minItems: 1 },
      },
      {
        propertyTypeModel: kratosIdentityIdPropertyTypeModel,
        required: true,
      },
      {
        propertyTypeModel: preferredNamePropertyTypeModel,
        required: true,
      },
    ],
    outgoingLinks: [
      {
        linkEntityTypeModel: orgMembershipLinkEntityTypeModel,
        destinationEntityTypeModels: [orgEntityTypeModel],
        maxItems: 1,
      },
    ],
  })(graphApi);
};

const componentIdPropertyTypeInitializer = propertyTypeInitializer({
  ...types.propertyType.componentId,
  possibleValues: [{ primitiveDataType: "text" }],
});

const blockDataLinkEntityTypeInitializer = entityTypeInitializer(
  types.linkEntityType.blockData,
);

const blockEntityTypeInitializer = async (graphApi: GraphApi) => {
  /* eslint-disable @typescript-eslint/no-use-before-define */

  const componentIdPropertyTypeModel =
    await SYSTEM_TYPES_INITIALIZERS.propertyType.componentId(graphApi);

  const blockDataLinkEntityTypeModel =
    await SYSTEM_TYPES_INITIALIZERS.linkEntityType.blockData(graphApi);

  const dummyEntityTypeModel = await SYSTEM_TYPES_INITIALIZERS.entityType.dummy(
    graphApi,
  );

  /* eslint-enable @typescript-eslint/no-use-before-define */

  return entityTypeInitializer({
    ...types.entityType.block,
    properties: [
      {
        propertyTypeModel: componentIdPropertyTypeModel,
        required: true,
      },
    ],
    outgoingLinks: [
      {
        linkEntityTypeModel: blockDataLinkEntityTypeModel,
        /**
         * @todo: unset this when the destination entity type can be undefined
         * @see https://app.asana.com/0/1202805690238892/1203015527055368/f
         */
        destinationEntityTypeModels: [dummyEntityTypeModel],
        required: true,
        maxItems: 1,
      },
    ],
  })(graphApi);
};

const tokensPropertyTypeInitializer = propertyTypeInitializer({
  ...types.propertyType.tokens,
  /**
   * @todo: potentially improve this property type to be composed of nested property type definitions
   * @see https://app.asana.com/0/1202805690238892/1203045933021778/f
   */
  possibleValues: [{ primitiveDataType: "object" }],
});

const textEntityTypeInitializer = async (graphApi: GraphApi) => {
  /* eslint-disable @typescript-eslint/no-use-before-define */

  const tokensPropertyTypeModel =
    await SYSTEM_TYPES_INITIALIZERS.propertyType.tokens(graphApi);

  /* eslint-enable @typescript-eslint/no-use-before-define */
  return entityTypeInitializer({
    ...types.entityType.text,
    properties: [
      {
        propertyTypeModel: tokensPropertyTypeModel,
        required: true,
        array: true,
      },
    ],
  })(graphApi);
};

/**
 * @todo: remove this dummy entity type once we are able to define the block data link type without it
 * @see https://app.asana.com/0/1202805690238892/1203015527055368/f
 */
const dummyEntityTypeInitializer = async (graphApi: GraphApi) => {
  return entityTypeInitializer({
    ...types.entityType.dummy,
    properties: [],
  })(graphApi);
};

const archivedPropertyTypeInitializer = propertyTypeInitializer({
  ...types.propertyType.archived,
  possibleValues: [{ primitiveDataType: "boolean" }],
});

const summaryPropertyTypeInitializer = propertyTypeInitializer({
  ...types.propertyType.summary,
  possibleValues: [{ primitiveDataType: "text" }],
});

const titlePropertyTypeInitializer = propertyTypeInitializer({
  ...types.propertyType.title,
  possibleValues: [{ primitiveDataType: "text" }],
});

const indexPropertyTypeInitializer = propertyTypeInitializer({
  ...types.propertyType.index,
  possibleValues: [{ primitiveDataType: "text" }],
});

const iconPropertyTypeInitializer = propertyTypeInitializer({
  ...types.propertyType.icon,
  possibleValues: [{ primitiveDataType: "text" }],
});

const containsLinkEntityTypeInitializer = entityTypeInitializer(
  types.linkEntityType.contains,
);

const parentLinkEntityTypeInitializer = entityTypeInitializer(
  types.linkEntityType.parent,
);

const pageEntityTypeInitializer = async (graphApi: GraphApi) => {
  /* eslint-disable @typescript-eslint/no-use-before-define */

  const summaryPropertyTypeModel =
    await SYSTEM_TYPES_INITIALIZERS.propertyType.summary(graphApi);

  const archivedPropertyTypeModel =
    await SYSTEM_TYPES_INITIALIZERS.propertyType.archived(graphApi);

  const titlePropertyTypeModel =
    await SYSTEM_TYPES_INITIALIZERS.propertyType.title(graphApi);

  const indexPropertyTypeModel =
    await SYSTEM_TYPES_INITIALIZERS.propertyType.index(graphApi);

  const iconPropertyTypeModel =
    await SYSTEM_TYPES_INITIALIZERS.propertyType.icon(graphApi);

  const containsLinkEntityTypeModel =
    await SYSTEM_TYPES_INITIALIZERS.linkEntityType.contains(graphApi);

  const parentLinkTypeTypeModel =
    await SYSTEM_TYPES_INITIALIZERS.linkEntityType.parent(graphApi);

  const blockEntityTypeModel = await SYSTEM_TYPES_INITIALIZERS.entityType.block(
    graphApi,
  );

  /* eslint-enable @typescript-eslint/no-use-before-define */

  return entityTypeInitializer({
    ...types.entityType.page,
    properties: [
      {
        propertyTypeModel: summaryPropertyTypeModel,
      },
      {
        propertyTypeModel: archivedPropertyTypeModel,
      },
      {
        propertyTypeModel: iconPropertyTypeModel,
      },
      {
        propertyTypeModel: titlePropertyTypeModel,
        required: true,
      },
      {
        propertyTypeModel: indexPropertyTypeModel,
        required: true,
      },
    ],
    outgoingLinks: [
      {
        linkEntityTypeModel: containsLinkEntityTypeModel,
        destinationEntityTypeModels: [blockEntityTypeModel],
        required: true,
        ordered: true,
      },
      {
        linkEntityTypeModel: parentLinkTypeTypeModel,
        destinationEntityTypeModels: ["SELF_REFERENCE"],
        maxItems: 1,
      },
    ],
  })(graphApi);
};

const resolvedAtPropertyTypeInitializer = propertyTypeInitializer({
  ...types.propertyType.resolvedAt,
  possibleValues: [{ primitiveDataType: "text" }],
});

const deletedAtPropertyTypeInitializer = propertyTypeInitializer({
  ...types.propertyType.deletedAt,
  possibleValues: [{ primitiveDataType: "text" }],
});

const hasTextLinkEntityTypeInitializer = entityTypeInitializer(
  types.linkEntityType.hasText,
);

const authorLinkEntityTypeInitializer = entityTypeInitializer(
  types.linkEntityType.author,
);

const commentEntityTypeInitializer = async (graphApi: GraphApi) => {
  /* eslint-disable @typescript-eslint/no-use-before-define */

  const resolvedAtPropertyTypeModel =
    await SYSTEM_TYPES_INITIALIZERS.propertyType.resolvedAt(graphApi);

  const deletedAtPropertyTypeModel =
    await SYSTEM_TYPES_INITIALIZERS.propertyType.deletedAt(graphApi);

  const hasTextLinkEntityTypeModel =
    await SYSTEM_TYPES_INITIALIZERS.linkEntityType.hasText(graphApi);

  const parentLinkTypeTypeModel =
    await SYSTEM_TYPES_INITIALIZERS.linkEntityType.parent(graphApi);

  const authorLinkTypeTypeModel =
    await SYSTEM_TYPES_INITIALIZERS.linkEntityType.author(graphApi);

  const userEntityTypeModel = await SYSTEM_TYPES_INITIALIZERS.entityType.user(
    graphApi,
  );

  const textEntityTypeModel = await SYSTEM_TYPES_INITIALIZERS.entityType.text(
    graphApi,
  );

  const blockEntityTypeModel = await SYSTEM_TYPES_INITIALIZERS.entityType.block(
    graphApi,
  );

  /* eslint-enable @typescript-eslint/no-use-before-define */

  return entityTypeInitializer({
    ...types.entityType.comment,
    properties: [
      {
        propertyTypeModel: resolvedAtPropertyTypeModel,
      },
      {
        propertyTypeModel: deletedAtPropertyTypeModel,
      },
    ],
    outgoingLinks: [
      {
        linkEntityTypeModel: hasTextLinkEntityTypeModel,
        destinationEntityTypeModels: [textEntityTypeModel],
        required: true,
        maxItems: 1,
      },
      {
        linkEntityTypeModel: parentLinkTypeTypeModel,
        destinationEntityTypeModels: ["SELF_REFERENCE", blockEntityTypeModel],
        required: true,
        maxItems: 1,
      },
      {
        linkEntityTypeModel: authorLinkTypeTypeModel,
        destinationEntityTypeModels: [userEntityTypeModel],
        required: true,
        maxItems: 1,
      },
    ],
  })(graphApi);
};

type LazyPromise<T> = (graphApi: GraphApi) => Promise<T>;

type FlattenAndPromisify<T> = {
  [K in keyof T]: T[K] extends object
    ? { [I in keyof T[K]]: LazyPromise<T[K][I]> }
    : never;
};

export const SYSTEM_TYPES_INITIALIZERS: FlattenAndPromisify<
  typeof SYSTEM_TYPES
> = {
  dataType: {},
  propertyType: {
    shortName: shortnamePropertyTypeInitializer,

    email: emailPropertyTypeInitializer,
    kratosIdentityId: kratosIdentityIdPropertyTypeInitializer,
    preferredName: preferredNamePropertyTypeInitializer,

    orgName: orgNamePropertyTypeInitializer,
    orgSize: orgSizePropertyTypeInitializer,
    orgProvidedInfo: orgProvidedInfoPropertyTypeInitializer,

    responsibility: responsibilityPropertyTypeInitializer,

    componentId: componentIdPropertyTypeInitializer,

    summary: summaryPropertyTypeInitializer,
    archived: archivedPropertyTypeInitializer,
    title: titlePropertyTypeInitializer,
    index: indexPropertyTypeInitializer,
    icon: iconPropertyTypeInitializer,

    tokens: tokensPropertyTypeInitializer,

    resolvedAt: resolvedAtPropertyTypeInitializer,
    deletedAt: deletedAtPropertyTypeInitializer,

    userSelfRegistrationIsEnabled:
      userSelfRegistrationIsEnabledPropertyTypeInitializer,
    orgSelfRegistrationIsEnabled:
      orgSelfRegistrationIsEnabledPropertyTypeInitializer,
    userRegistrationByInviteIsEnabled:
      userRegistrationByInviteIsEnabledPropertyTypeInitializer,
  },
  entityType: {
    hashInstance: hashInstanceEntityTypeInitializer,
    user: userEntityTypeInitializer,
    org: orgEntityTypeInitializer,
    block: blockEntityTypeInitializer,
    page: pageEntityTypeInitializer,
    comment: commentEntityTypeInitializer,
    text: textEntityTypeInitializer,
    dummy: dummyEntityTypeInitializer,
  },
  linkEntityType: {
    admin: adminLinkEntityTypeInitializer,
    orgMembership: orgMembershipLinkEntityTypeInitializer,
    blockData: blockDataLinkEntityTypeInitializer,
    contains: containsLinkEntityTypeInitializer,
    parent: parentLinkEntityTypeInitializer,
    hasText: hasTextLinkEntityTypeInitializer,
    author: authorLinkEntityTypeInitializer,
  },
};

/**
 * Ensures the required system types have been created in the graph by fetching
 * them or creating them using the `systemUserAccountId`. Note this method must
 * be run after the `systemUserAccountId` has been initialized.
 */
export const ensureSystemTypesExist = async (params: {
  graphApi: GraphApi;
  logger: Logger;
}) => {
  const { graphApi } = params;
  logger.debug("Ensuring system types exist");

  // Create system types if they don't already exist
  /**
   * @todo Use transactional primitive/bulk insert to be able to do this in parallel
   *   see the following task:
   *   https://app.asana.com/0/1201095311341924/1202573572594586/f
   */

  const initializedSystemTypes: any = {};

  // eslint-disable-next-line guard-for-in
  for (const typeKind in SYSTEM_TYPES_INITIALIZERS) {
    initializedSystemTypes[typeKind] = {};

    const inner =
      SYSTEM_TYPES_INITIALIZERS[
        typeKind as keyof typeof SYSTEM_TYPES_INITIALIZERS
      ];
    for (const [key, typeInitializer] of Object.entries(inner) as [
      string,
      (
        graphApi: GraphApi,
      ) => Promise<PropertyTypeModel | EntityTypeModel | EntityTypeModel>,
    ][]) {
      logger.debug(`Checking system type: [${key}] exists`);
      const model = await typeInitializer(graphApi);
      initializedSystemTypes[typeKind][key] = model;
    }
  }

  SYSTEM_TYPES = initializedSystemTypes;
};
