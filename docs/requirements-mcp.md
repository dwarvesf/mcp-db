# Overview

This MCP (Model Context Protocol) server to be built will serve as a middleware for interacting with Postgres databases and Parquet files. It will support CRUD operations on Postgres databases and querying Parquet files from HTTPS links or Google Cloud Storage (GCS) directories. The server will expose tools for executing SQL queries on Postgres and DuckDB queries on Parquet files. Additionally, it will provide resources for accessing the schemas of Postgres tables and Parquet files. The server will handle GCP authentication for GCS access and include robust error handling and logging capabilities.

---

## 1. Command-Line Arguments

The MCP server uses `vercel/arg` to parse the following command-line arguments:

- **`--database-url <connection_string>`** (optional)
  - Defines the Postgres database connection string.
  - **Example**: `postgresql://user:password@localhost:5432/mydb`

---

## 2. Tools

The server offers tools for interacting with Postgres and DuckDB

### 2.1 SQL Query Tools (Postgres)

These tools enable CRUD operations on the Postgres database specified by `--database-url`.

- **`sql_query_create`**
  - Executes CREATE or INSERT statements.

- **`sql_query_read`**
  - Executes SELECT queries.

- **`sql_query_update`**
  - Executes UPDATE statements.

- **`sql_query_delete`**
  - Executes DELETE statements.

**Implementation Notes**:
- Use parameterized queries to prevent SQL injection.
- Ensure errors are caught and returned with descriptive messages.

### 2.2 DuckDB Tool for Parquet Files

- **`duckdb_read_parquet_files`**
  - Queries Parquet files from HTTPS links.

---

## 3. Resources

The server exposes table schemas (database) as resources

---

## 4. GCP Authentication for GCS

For GCS Parquet file access:
- **Option 1**: `GCP_SERVICE_ACCOUNT` environment variable (base64 encoded).
  - Decode to a JSON key and authenticate with GCS.
- **Option 2**: Default credentials.
  - Use environment-provided credentials (e.g., GKE Workload Identity) if `GCP_SERVICE_ACCOUNT` is absent.
- **Implementation**:
  - When server starts, init gcs client by prioritizing `GCP_SERVICE_ACCOUNT` if present; otherwise, fall back to default credentials.

---

## 5. Error Handling and Logging

- **Logging**:
  - Include an optional `--log-level` flag (e.g., `debug`, `info`, `error`) for verbosity control.
  - Log events such as startup, tool executions, and errors.

---

## 6. Implementation Details

- **Libraries**:
  - `pg`: Postgres connectivity.
  - `duckdb`: Parquet file querying.
  - `vercel/arg`: Command-line parsing.
  - `@google-cloud/storage`: GCS interactions.
- **DuckDB Setup**:
  - Enable the `httpfs` extension for HTTPS support.
  - Use `fsspec` and `gcsfs` for GCS integration if required.
- **Schema Caching**:
  - Pre-fetch and store schemas at startup for performance.


### Tool Usage Examples

- **SQL Read Query**:
  ```json
  {
    "tool": "sql_query_read",
    "input": {
      "sql": "SELECT * FROM users WHERE age > $1",
      "params": [25]
    }
  }
  ```

- **DuckDB Parquet Query**:
  ```json
  {
    "tool": "duckdb_read_parquet_files",
    "input": {
      "query": "SELECT * FROM read_parquet([file_path_1, file_path_2, link_1,link_2]) LIMIT 5"
    }
  }
  ```