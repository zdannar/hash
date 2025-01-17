#!/bin/bash
set -e

psql -v ON_ERROR_STOP=1 --username "$POSTGRES_USER" <<-EOSQL

  CREATE USER $HASH_GRAPH_PG_USER WITH PASSWORD '$HASH_GRAPH_PG_PASSWORD';

  CREATE DATABASE $HASH_GRAPH_PG_DATABASE;

  REVOKE ALL ON DATABASE $HASH_GRAPH_PG_DATABASE FROM $HASH_GRAPH_PG_USER;

  GRANT CONNECT ON DATABASE $HASH_GRAPH_PG_DATABASE TO $HASH_GRAPH_PG_USER;

EOSQL

psql -v ON_ERROR_STOP=1 --username "$POSTGRES_USER" --dbname "$HASH_GRAPH_PG_DATABASE" <<-EOSQL

  REVOKE CREATE ON SCHEMA public FROM PUBLIC;

  ALTER DEFAULT PRIVILEGES
  GRANT USAGE ON SCHEMAS TO $HASH_GRAPH_PG_USER;

  ALTER DEFAULT PRIVILEGES
  GRANT SELECT, INSERT, UPDATE, DELETE ON TABLES TO $HASH_GRAPH_PG_USER;

EOSQL
