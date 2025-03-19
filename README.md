# MCP Database Server

A Model Context Protocol (MCP) server that provides tools for interacting with databases, including PostgreSQL, DuckDB, and Google Cloud Storage (GCS) Parquet files.

## Prerequisites

- Node.js 22 or higher
- TypeScript
- PostgreSQL (for PostgreSQL features)
- Google Cloud credentials (optional, for read files from GCS)

## Project Structure

- `src/`: Source code
  - `config.ts`: Configuration management
  - `duckdb.ts`: DuckDB integration
  - `gcs.ts`: Google Cloud Storage integration
  - `postgres.ts`: PostgreSQL database integration
  - `server.ts`: Main server implementation

## Installation

1. Clone the repository:
```bash
git clone <repository-url>
cd mcp-db
```

2. Install dependencies:
```bash
npm install
```

3. Build the project:
```bash
npm run build
```

## Configuration

The server supports multiple database and storage backends:

### Environment Variables and CLI Arguments
- `--database-url`: PostgreSQL connection string (required)
- `--log-level`: Logging level (debug, info, error) (default: info)

### GCS Authentication
For Google Cloud Storage, choose one method:
1. Set the `GCP_SERVICE_ACCOUNT` environment variable with base64-encoded service account credentials
2. Use default credentials (e.g., GKE Workload Identity)

## Running the Server

### Development Mode
```bash
npm run dev
```

### Production Mode
```bash
npm run build
npm start
```

### Example Configurations

```bash
npm start -- --database-url "postgresql://user:password@localhost:5432/mydb"
```

## Available Tools

### Database Tools
- `sql_query_read`: Execute SELECT queries
- `sql_query_create`: Execute CREATE/INSERT statements
- `sql_query_update`: Execute UPDATE statements
- `sql_query_delete`: Execute DELETE statements

### DuckDB Tools
- `duckdb_read_parquet_files`: Query Parquet files

## Documentation

Additional documentation can be found in the `docs/` directory:
- `docs/llm-full.md`: Comprehensive documentation
- `docs/requirements-mcp.md`: MCP requirements
- `docs/sdk.md`: SDK-related documentation
