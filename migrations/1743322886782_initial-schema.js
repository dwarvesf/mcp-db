/* eslint-disable camelcase */

/** @type {import('node-pg-migrate').ColumnDefinitions | undefined} */
export const shorthands = undefined;

/** @param pgm {import('node-pg-migrate').MigrationBuilder} */
export async function up(pgm) {
  // Create observation_log table
  pgm.createTable('observation_log', {
    id: {
      type: 'bigint',
      notNull: true,
      identity: true
    },
    timestamp: {
      type: 'timestamptz',
      notNull: true,
      default: pgm.func('NOW()')
    },
    payload: {
      type: 'jsonb',
      notNull: true
    },
    operation: {
      type: 'text',
      notNull: true,
      default: 'insert',
      check: "operation = 'insert'"
    },
    confidence: {
      type: 'real'
    },
    processed_timestamp: {
      type: 'timestamptz'
    }
  });

  // Add check constraint for payload
  pgm.sql(`ALTER TABLE observation_log ADD CONSTRAINT check_payload_object CHECK (jsonb_typeof(payload) = 'object')`);

  // Convert to hypertable
  pgm.sql(`SELECT create_hypertable('observation_log', 'timestamp', chunk_time_interval => INTERVAL '1 month')`);

  // Create GIN index on payload
  pgm.createIndex('observation_log', 'payload', {
    name: 'idx_observation_log_payload',
    method: 'GIN'
  });
};

/** @param pgm {import('node-pg-migrate').MigrationBuilder} */
export async function down(pgm) {
  // Drop the observation_log table (this will automatically drop the hypertable and indexes)
  pgm.dropTable('observation_log');
};
