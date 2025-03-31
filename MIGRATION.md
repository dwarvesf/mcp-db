# Migration to FastMCP

This document outlines the migration from the standard MCP SDK implementation to the FastMCP framework.

## Overview

The project now supports two MCP server implementations:

1. **Standard MCP SDK implementation** - The original implementation using the direct MCP SDK
2. **FastMCP implementation** - A newer, framework-based approach

## Benefits of FastMCP

FastMCP offers several advantages over the standard MCP SDK implementation:

- **Simplified API**: More declarative and easier to understand
- **Built-in SSE support**: No need to manually implement SSE transport
- **Better type safety**: Using Zod for runtime validation of inputs
- **Less boilerplate code**: Simpler tool and resource registration
- **Better error handling**: More consistent error handling
- **Automated documentation**: Better schema generation for tool parameters
- **Framework approach**: Simpler learning curve and better maintainability

## Implementation Comparison

### Standard MCP SDK:

```typescript
// Tool definition
export const sqlQueryReadTool: Tool = {
  name: "sql_query_read",
  description: "Execute SELECT queries on Postgres database",
  inputSchema: {
    type: "object",
    properties: {
      sql: { type: "string", description: "SQL query to execute." },
      params: { type: "array", description: "Query parameters" }
    },
    required: ["sql"]
  }
};

// Registration and handler
server.setRequestHandler(ListToolsRequestSchema, async () => {
  return { tools };
});

server.setRequestHandler(CallToolRequestSchema, async (request) => {
  switch (request.params.name) {
    case "sql_query_read": {
      const result = await handlePostgreSQLQuery(
        pgPool,
        request.params.arguments.sql,
        request.params.arguments.params
      );
      return formatSuccessResponse(result.rows);
    }
  }
});
```

### FastMCP:

```typescript
// Tool definition and handler combined
server.addTool({
  name: "sql_query_read",
  description: "Execute SELECT queries on Postgres database",
  parameters: z.object({
    sql: z.string().describe("SQL query to execute."),
    params: z.array(z.string()).optional().describe("Query parameters")
  }),
  execute: async (args) => {
    const result = await handlePostgreSQLQuery(pgPool, args.sql, args.params);
    return JSON.stringify(result.rows);
  }
});
```

## How to Use Each Implementation

### Standard MCP SDK Implementation

```bash
# Development mode
npm run dev
# or
make dev

# Debug mode
npm run debug
# or
make debug

# Docker
docker run -p 3001:3001 your-image-name
```

### FastMCP Implementation

```bash
# Development mode
npm run dev:fast
# or
make dev-fast

# Debug mode
npm run debug:fast
# or
make debug-fast

# Docker
docker run -p 3001:3001 your-image-name --fast
```

## SSE Implementation Differences

### Standard MCP SDK:
- Requires custom implementation of SSE transport (`src/transports/sse.ts`)
- Manual handling of SSE connections, keep-alive pings, etc.
- More flexibility but more complexity

### FastMCP:
- Built-in SSE transport support
- Just specify the configuration:
  ```typescript
  server.start({
    transportType: "sse",
    sse: {
      endpoint: "/sse",
      port: 3001,
      host: "0.0.0.0",
    }
  });
  ```

## Migration Path

For now, both implementations are maintained side by side, but the long-term plan is to fully migrate to FastMCP. New features should be implemented using FastMCP.

## FastMCP Version Compatibility

When upgrading FastMCP to newer versions, be aware of potential breaking changes:

### Resource API Changes

In newer versions of FastMCP (>=1.20.5), the Resource interface has changed:

1. Resources now require a `uri` property directly in the resource definition object:

```typescript
// Old way (pre-1.20.5)
server.addResource({
  name: "mcp://my-resource",
  description: "My resource description",
  load: async () => {
    return JSON.stringify(data);
  }
});

// New way (>=1.20.5)
server.addResource({
  name: "mcp://my-resource",
  description: "My resource description",
  uri: "mcp://my-resource", // Required explicitly
  load: async () => {
    return {
      uri: "mcp://my-resource",
      text: JSON.stringify(data)
    };
  }
});
```

2. The `load` function must return a ResourceResult object with `uri` and `text` properties, not just a string.

### SSE Configuration Changes

The SSE transport configuration has changed:

1. The `host` property is no longer supported:

```typescript
// Old way
server.start({
  transportType: "sse",
  sse: {
    endpoint: "/sse",
    port: 3001,
    host: "0.0.0.0" // No longer supported
  }
});

// New way
server.start({
  transportType: "sse",
  sse: {
    endpoint: "/sse",
    port: 3001
  }
});
```

Check the [FastMCP documentation](https://github.com/punkpeye/fastmcp) for the latest API changes when upgrading.

## Running Both Implementations

Both implementations can run simultaneously on different ports:

```bash
# Terminal 1 - Standard MCP SDK on port 3001
make dev

# Terminal 2 - FastMCP on port 3002
NODE_ENV=development npm run dev:fast -- --transport=sse --port=3002
```

This allows for easy comparison and testing of both implementations. 