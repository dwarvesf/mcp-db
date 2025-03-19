# MCP Database Server

A Model Context Protocol (MCP) server that provides tools for interacting with PostgreSQL databases and Parquet files.

## Prerequisites

- Node.js 18 or higher
- PostgreSQL (if using database features)
- Google Cloud credentials (if using GCS features)

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

The server can be configured using command-line arguments:

- `--database-url`: PostgreSQL connection string (optional)
- `--gcs-bucket`: Google Cloud Storage bucket name (optional)
- `--gcs-dirs`: GCS directories to scan for Parquet files (required if using GCS)
- `--parquet-links`: HTTPS URLs to Parquet files (optional)
- `--log-level`: Logging level (debug, info, error) (default: info)

For GCS authentication, either:
1. Set the `GCP_SERVICE_ACCOUNT` environment variable with base64-encoded service account credentials
2. Use default credentials (e.g., GKE Workload Identity)

## Running the Server

### Development Mode
```bash
npm run dev -- --database-url "postgresql://user:password@localhost:5432/mydb"
```

### Production Mode
```bash
npm run build
npm start -- --database-url "postgresql://user:password@localhost:5432/mydb"
```

### Examples

1. PostgreSQL only:
```bash
npm start -- --database-url "postgresql://user:password@localhost:5432/mydb"
```

2. PostgreSQL + HTTPS Parquet:
```bash
npm start -- \
  --database-url "postgresql://user:password@localhost:5432/mydb" \
  --parquet-links "https://example.com/file1.parquet" \
  --parquet-links "https://example.com/file2.parquet"
```

3. PostgreSQL + GCS Parquet:
```bash
npm start -- \
  --database-url "postgresql://user:password@localhost:5432/mydb" \
  --gcs-bucket "my-bucket" \
  --gcs-dirs "data/dir1" \
  --gcs-dirs "data/dir2"
```

## Available Tools

### SQL Tools
- `sql_query_read`: Execute SELECT queries
- `sql_query_create`: Execute CREATE/INSERT statements
- `sql_query_update`: Execute UPDATE statements
- `sql_query_delete`: Execute DELETE statements

### DuckDB Tools
- `duckdb_read`: Query Parquet files

## Resources

The server exposes the following resources:
- Database schemas
- Parquet file schemas
