import { useLazyQuery } from "@apollo/client";

import { BlockProtocolAggregateFn } from "../../../types/blockProtocol";
import { aggregateEntity } from "../../../graphql/queries/entity.queries";
import { useCallback } from "react";
import {
  AggregateEntityQuery,
  AggregateEntityQueryVariables,
} from "../../../graphql/autoGeneratedTypes";

export const useBlockProtocolAggregate = (): {
  aggregate: BlockProtocolAggregateFn;
  aggregateLoading: boolean;
  aggregateError: any;
} => {
  const [aggregateFn, { loading: aggregateLoading, error: aggregateError }] =
    useLazyQuery<AggregateEntityQuery, AggregateEntityQueryVariables>(
      aggregateEntity
    );

  const aggregate: BlockProtocolAggregateFn = useCallback((action) => {
    aggregateFn({
      variables: {
        operation: action.operation,
        type: action.entityType,
        accountId: action.accountId,
      },
    });
  }, []);

  return {
    aggregate,
    aggregateLoading,
    aggregateError,
  };
};
