/* eslint-disable camelcase */

/** @type {import('node-pg-migrate').ColumnDefinitions | undefined} */
exports.shorthands = undefined;

/** @param pgm {import('node-pg-migrate').MigrationBuilder} */
exports.up = function(pgm) {
  // 1. Users Table
  pgm.createTable('users', {
    id: { type: 'uuid', primaryKey: true, default: pgm.func('gen_random_uuid()') },
    username: { type: 'varchar(255)', notNull: true, unique: true },
    email: { type: 'varchar(255)', unique: true },
    password_hash: { type: 'varchar(255)' },
    is_active: { type: 'boolean', default: true },
    created_at: { type: 'timestamp with time zone', notNull: true, default: pgm.func('NOW()') },
    updated_at: { type: 'timestamp with time zone', notNull: true, default: pgm.func('NOW()') }
  });

  // 2. OAuth Clients Table
  pgm.createTable('oauth_clients', {
    id: { type: 'uuid', primaryKey: true, default: pgm.func('gen_random_uuid()') },
    client_id: { type: 'varchar(255)', notNull: true, unique: true },
    client_name: { type: 'varchar(255)', notNull: true },
    client_secret: { type: 'varchar(255)' },
    redirect_uris: { type: 'text[]', notNull: true },
    is_public: { type: 'boolean', default: false },
    created_by: { type: 'uuid', references: 'users(id)' },
    created_at: { type: 'timestamp with time zone', notNull: true, default: pgm.func('NOW()') },
    updated_at: { type: 'timestamp with time zone', notNull: true, default: pgm.func('NOW()') }
  });

  // 3. Authorization Requests Table
  pgm.createTable('authorization_requests', {
    id: { type: 'uuid', primaryKey: true, default: pgm.func('gen_random_uuid()') },
    client_id: { type: 'varchar(255)', notNull: true },
    redirect_uri: { type: 'text', notNull: true },
    state: { type: 'varchar(255)' },
    code_challenge: { type: 'varchar(255)', notNull: true },
    code_challenge_method: { type: 'varchar(10)', notNull: true, default: 'S256' },
    authorization_code: { type: 'varchar(255)', unique: true },
    user_id: { type: 'uuid', references: 'users(id)' },
    scope: { type: 'text' },
    is_used: { type: 'boolean', default: false },
    expires_at: { type: 'timestamp with time zone', notNull: true },
    created_at: { type: 'timestamp with time zone', notNull: true, default: pgm.func('NOW()') }
  });

  // 4. Access Tokens Table
  pgm.createTable('access_tokens', {
    id: { type: 'uuid', primaryKey: true, default: pgm.func('gen_random_uuid()') },
    token: { type: 'varchar(255)', notNull: true, unique: true },
    user_id: { type: 'uuid', notNull: true, references: 'users(id)' },
    client_id: { type: 'varchar(255)', notNull: true },
    scope: { type: 'text', notNull: true },
    expires_at: { type: 'timestamp with time zone', notNull: true },
    created_at: { type: 'timestamp with time zone', notNull: true, default: pgm.func('NOW()') }
  });
  
  // Add foreign key constraint for client_id after both tables exist
  pgm.sql(`
    ALTER TABLE access_tokens 
    ADD CONSTRAINT access_tokens_client_id_fkey 
    FOREIGN KEY (client_id) 
    REFERENCES oauth_clients(client_id)
  `);

  // 5. Refresh Tokens Table
  pgm.createTable('refresh_tokens', {
    id: { type: 'uuid', primaryKey: true, default: pgm.func('gen_random_uuid()') },
    token: { type: 'varchar(255)', notNull: true, unique: true },
    access_token_id: { type: 'uuid', references: 'access_tokens(id)', onDelete: 'cascade' },
    user_id: { type: 'uuid', notNull: true, references: 'users(id)' },
    client_id: { type: 'varchar(255)', notNull: true },
    is_revoked: { type: 'boolean', default: false },
    expires_at: { type: 'timestamp with time zone', notNull: true },
    created_at: { type: 'timestamp with time zone', notNull: true, default: pgm.func('NOW()') }
  });
  
  // Add foreign key constraint for client_id
  pgm.sql(`
    ALTER TABLE refresh_tokens 
    ADD CONSTRAINT refresh_tokens_client_id_fkey 
    FOREIGN KEY (client_id) 
    REFERENCES oauth_clients(client_id)
  `);

  // 6. SSE Sessions Table
  pgm.createTable('sse_sessions', {
    id: { type: 'uuid', primaryKey: true, default: pgm.func('gen_random_uuid()') },
    user_id: { type: 'uuid', notNull: true, references: 'users(id)' },
    access_token_id: { type: 'uuid', references: 'access_tokens(id)' },
    client_id: { type: 'varchar(255)', notNull: true },
    session_data: { type: 'jsonb' },
    last_activity: { type: 'timestamp with time zone', notNull: true, default: pgm.func('NOW()') },
    created_at: { type: 'timestamp with time zone', notNull: true, default: pgm.func('NOW()') }
  });
  
  // Add foreign key constraint for client_id
  pgm.sql(`
    ALTER TABLE sse_sessions 
    ADD CONSTRAINT sse_sessions_client_id_fkey 
    FOREIGN KEY (client_id) 
    REFERENCES oauth_clients(client_id)
  `);

  // 7. MCP Tools Table
  pgm.createTable('mcp_tools', {
    id: { type: 'uuid', primaryKey: true, default: pgm.func('gen_random_uuid()') },
    name: { type: 'varchar(255)', notNull: true },
    description: { type: 'text' },
    type: { type: 'varchar(50)', notNull: true },
    version: { type: 'varchar(50)', notNull: true },
    configuration: { type: 'jsonb' },
    is_active: { type: 'boolean', default: true },
    created_at: { type: 'timestamp with time zone', notNull: true, default: pgm.func('NOW()') },
    updated_at: { type: 'timestamp with time zone', notNull: true, default: pgm.func('NOW()') }
  });

  // 8. Tool Permissions Table
  pgm.createTable('tool_permissions', {
    id: { type: 'uuid', primaryKey: true, default: pgm.func('gen_random_uuid()') },
    tool_id: { type: 'uuid', references: 'mcp_tools(id)', onDelete: 'cascade' },
    permission_name: { type: 'varchar(255)', notNull: true },
    description: { type: 'text' }
  });
  
  // Add unique constraint for tool_id and permission_name
  pgm.addConstraint('tool_permissions', 'unique_tool_permission', {
    unique: ['tool_id', 'permission_name']
  });

  // 9. User Tool Permissions Table
  pgm.createTable('user_tool_permissions', {
    user_id: { type: 'uuid', references: 'users(id)', onDelete: 'cascade' },
    tool_id: { type: 'uuid', references: 'mcp_tools(id)', onDelete: 'cascade' },
    permission_id: { type: 'uuid', references: 'tool_permissions(id)', onDelete: 'cascade' },
    granted_by: { type: 'uuid', references: 'users(id)' },
    granted_at: { type: 'timestamp with time zone', notNull: true, default: pgm.func('NOW()') }
  });
  
  // Add primary key constraint for the composite key
  pgm.addConstraint('user_tool_permissions', 'user_tool_permissions_pkey', {
    primaryKey: ['user_id', 'tool_id', 'permission_id']
  });

  // 10. Security Audit Log Table
  pgm.createTable('audit_logs', {
    id: { type: 'uuid', primaryKey: true, default: pgm.func('gen_random_uuid()') },
    user_id: { type: 'uuid', references: 'users(id)' },
    client_id: { type: 'varchar(255)' },
    event_type: { type: 'varchar(50)', notNull: true },
    event_status: { type: 'varchar(20)', notNull: true },
    ip_address: { type: 'varchar(45)' },
    user_agent: { type: 'text' },
    details: { type: 'jsonb' },
    created_at: { type: 'timestamp with time zone', notNull: true, default: pgm.func('NOW()') }
  });

  // 11. Rate Limiting Table
  pgm.createTable('rate_limits', {
    id: { type: 'uuid', primaryKey: true, default: pgm.func('gen_random_uuid()') },
    ip_address: { type: 'varchar(45)', notNull: true },
    endpoint: { type: 'varchar(255)', notNull: true },
    request_count: { type: 'integer', notNull: true, default: 1 },
    first_request_at: { type: 'timestamp with time zone', notNull: true, default: pgm.func('NOW()') },
    last_request_at: { type: 'timestamp with time zone', notNull: true, default: pgm.func('NOW()') }
  });
  
  // Add unique constraint for ip_address and endpoint
  pgm.addConstraint('rate_limits', 'unique_ip_endpoint', {
    unique: ['ip_address', 'endpoint']
  });

  // Create indexes for better performance
  pgm.createIndex('access_tokens', 'token', { name: 'idx_access_tokens_token' });
  pgm.createIndex('refresh_tokens', 'token', { name: 'idx_refresh_tokens_token' });
  pgm.createIndex('authorization_requests', 'authorization_code', { name: 'idx_authorization_requests_code' });
  pgm.createIndex('sse_sessions', 'user_id', { name: 'idx_sse_sessions_user_id' });
  pgm.createIndex('rate_limits', ['ip_address', 'endpoint'], { name: 'idx_rate_limits_ip_endpoint' });
  pgm.createIndex('user_tool_permissions', 'user_id', { name: 'idx_user_tool_permissions_user_id' });
  pgm.createIndex('user_tool_permissions', 'tool_id', { name: 'idx_user_tool_permissions_tool_id' });
  pgm.createIndex('audit_logs', 'user_id', { name: 'idx_audit_logs_user_id' });
  pgm.createIndex('audit_logs', 'event_type', { name: 'idx_audit_logs_event_type' });
  pgm.createIndex('audit_logs', 'created_at', { name: 'idx_audit_logs_created_at' });
};

/** @param pgm {import('node-pg-migrate').MigrationBuilder} */
exports.down = function(pgm) {
  // Drop all tables in reverse order to avoid foreign key conflicts
  pgm.dropTable('rate_limits');
  pgm.dropTable('audit_logs');
  pgm.dropTable('user_tool_permissions');
  pgm.dropTable('tool_permissions');
  pgm.dropTable('mcp_tools');
  pgm.dropTable('sse_sessions');
  pgm.dropTable('refresh_tokens');
  pgm.dropTable('access_tokens');
  pgm.dropTable('authorization_requests');
  pgm.dropTable('oauth_clients');
  pgm.dropTable('users');
};