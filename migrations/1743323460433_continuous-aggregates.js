/* eslint-disable camelcase */

/** @type {import('node-pg-migrate').ColumnDefinitions | undefined} */
export const shorthands = undefined;

/** @param pgm {import('node-pg-migrate').MigrationBuilder} */
export async function up(pgm) {
  // Continuous aggregates are created by scripts/setup-continuous-aggregates.sql
  // This migration is just a placeholder for tracking purposes
}

/** @param pgm {import('node-pg-migrate').MigrationBuilder} */
export async function down(pgm) {
  // Drop continuous aggregates and their policies
  pgm.sql(`
    DROP MATERIALIZED VIEW IF EXISTS tag_trends CASCADE;
    DROP MATERIALIZED VIEW IF EXISTS coined_term_trends CASCADE;
    DROP MATERIALIZED VIEW IF EXISTS relation_trends CASCADE;
    DROP MATERIALIZED VIEW IF EXISTS entity_trends CASCADE;
    DROP MATERIALIZED VIEW IF EXISTS content_trends CASCADE;
  `);
}
