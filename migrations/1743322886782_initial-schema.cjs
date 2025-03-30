/* eslint-disable camelcase */

/** @type {import('node-pg-migrate').ColumnDefinitions | undefined} */
exports.shorthands = undefined;

/** @param pgm {import('node-pg-migrate').MigrationBuilder} */
exports.up = function(pgm) {
  // Install TimescaleDB extension
  pgm.sql('CREATE EXTENSION IF NOT EXISTS timescaledb CASCADE');

  // Create observation_log table
  pgm.createTable('observation_log', {
    id: {
      type: 'bigint',
      notNull: true,
      primaryKey: true
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

  // Convert to hypertable with explicit type casting
  pgm.sql(`
    SELECT create_hypertable(
      'observation_log'::regclass, 
      'timestamp'::text, 
      chunk_time_interval => INTERVAL '1 month'
    )
  `);

  // Create GIN index on payload
  pgm.createIndex('observation_log', 'payload', {
    name: 'idx_observation_log_payload',
    method: 'GIN'
  });
};

/** @param pgm {import('node-pg-migrate').MigrationBuilder} */
exports.down = function(pgm) {
  // Drop the observation_log table and TimescaleDB extension
  pgm.dropTable('observation_log');
  pgm.sql('DROP EXTENSION IF EXISTS timescaledb CASCADE');
};
