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
      type: 'bigserial', // Changed from 'bigint' to 'bigserial' for auto-increment
      notNull: true
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

  // Create reader_tracker table
  pgm.createTable('reader_tracker', {
    id: {
      type: 'serial',
      primaryKey: true
    },
    client_name: {
      type: 'text',
      notNull: true
    },
    object_name: {
      type: 'text',
      notNull: true
    },
    last_offset: {
      type: 'bigint',
      notNull: true,
      default: 0
    },
    is_done: {
      type: 'boolean',
      notNull: true,
      default: false
    },
    created_at: {
      type: 'timestamptz',
      notNull: true,
      default: pgm.func('NOW()')
    },
    updated_at: {
      type: 'timestamptz',
      notNull: true,
      default: pgm.func('NOW()')
    }
  });

  // Create a unique constraint on client_name and object_name
  pgm.addConstraint('reader_tracker', 'reader_tracker_unique_client_object', {
    unique: ['client_name', 'object_name']
  });

  // Create indices for better query performance
  pgm.createIndex('reader_tracker', 'client_name');
  pgm.createIndex('reader_tracker', 'object_name');
  pgm.createIndex('reader_tracker', 'is_done');
};

/** @param pgm {import('node-pg-migrate').MigrationBuilder} */
exports.down = function(pgm) {
  // Drop the reader_tracker table
  pgm.dropTable('reader_tracker');
  
  // Drop the observation_log table and TimescaleDB extension
  pgm.dropTable('observation_log');
  pgm.sql('DROP EXTENSION IF EXISTS timescaledb CASCADE');
};