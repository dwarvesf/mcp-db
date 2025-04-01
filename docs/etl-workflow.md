# Setting up Data ETL with MCP

This guide will walk you through setting up a complete Data ETL pipeline using the Model Context Protocol (MCP) ecosystem. We'll explore three key repositories that work together to create a seamless data pipeline:

1. **dwarvesf/landing-zone** - Where data is collected and stored in GCS (Google Cloud Storage) as parquet files
2. **dwarvesf/mcp-db** - Provides tools to access parquet files from GCS and CRUD operations for TimescaleDB
3. **dwarvesf/mcp-background-interface** - Uses Mastra agents/workflows that leverage tools from mcp-db to read parquet files and insert data into TimescaleDB

## Architecture Overview

![alt text](assets/etl.png)

## 1. Setting up dwarvesf/landing-zone

The landing-zone repository serves as a temporary repository where raw data from various sources is collected into a single Google Cloud Storage (GCS) bucket.

### Prerequisites
- Google Cloud Platform account with GCS access
- Docker (for running the data collection apps)
- Vault access (ask Quang for credentials using user `agentic-dev`)

### Installation Steps

1. **Clone the repository:**
   ```bash
   git clone https://github.com/dwarvesf/landing-zone.git
   cd landing-zone
   ```

2. **Understand Repository Structure:**
   The repository is organized as follows:
   - `/apps` - Contains subdirectories for each data source's crawler
     - `discord` - Crawler for Discord data
     - `hackernews` - Crawler for Hacker News data
     - etc.

3. **Configure Vault Access:**
   - Create a `.env` file with the following content:
     ```
     VAULT_TOKEN=your-vault-token
     VAULT_ADDR=your-vault-address
     VAULT_PATH=kv/data/agentic/dev/landing-zone
     ```
   - Contact Quang for credentials using the user `agentic-dev`
   - To retreive vault token, run:
     ```bash
     vault login -method=userpass username=agentic-dev
     ```

4. **Test a Crawler:**
   Navigate to one of the app directories and run its Docker container:
   ```bash
   cd apps/discord
   docker build -t discord-crawler .
   docker run -d --env-file .env discord-crawler
   ```

## 2. Setting up dwarvesf/mcp-db

The mcp-db repository provides tools for interacting with databases, including PostgreSQL, DuckDB, and GCS Parquet files.

### Prerequisites
- Node.js 22 or higher
- TypeScript
- PostgreSQL (TimescaleDB)
- Google Cloud credentials

### Installation Steps

1. **Clone the repository:**
   ```bash
   git clone https://github.com/dwarvesf/mcp-db.git
   cd mcp-db
   ```

2. **Install dependencies:**
   ```bash
   npm install
   ```

3. **Set up environment variables:**
   Create a `.env` file with:
   ```
   DATABASE_URL=postgres://user:password@localhost:15432/knowledge_hub
   LOG_LEVEL=info
   GCP_SERVICE_ACCOUNT=your-base64-encoded-service-account
   ```

4. **Start TimescaleDB and setup the database:**
   ```bash
   make init
   make setup-db
   ```

5. **Start the server:**
   ```bash
   make dev
   ```

## 3. Setting up dwarvesf/mcp-background-interface

This repository contains Mastra agents and workflows that read parquet files from GCS and insert data into TimescaleDB.

### Prerequisites
- Node.js
- TypeScript
- Mastra CLI

### Installation Steps

1. **Clone the repository:**
   ```bash
   git clone https://github.com/dwarvesf/mcp-background-interface.git
   cd mcp-background-interface
   ```

2. **Install dependencies:**
   ```bash
   npm install
   ```

3. **Configure MCP Integration:**
   Create a `.env` file with:
   ```
   MCP_DB_URL=http://localhost:3000
   GCS_BUCKET=df-landing-zone
   DATABASE_URL=postgres://user:password@localhost:15432/knowledge_hub
   ```

4. **Build the project:**
   ```bash
   npm run build
   ```

5. **Run the Mastra agent:**
   ```bash
   npm run dev
   ```

6. **Execute the Workflow:**
   ```bash
   npx mastra workflow run --workflow syncObservationWorkflow --trigger '{"topic":"hackernews"}'
   ```

## Workflow Understanding

### Data Flow Process

1. **Data Collection (landing-zone):**
   - Crawlers in `/apps` collect data from different sources
   - Data is saved to GCS as parquet files with the structure: `landing-zone/{data-source}/{timestamp}.parquet`
   - Cronjobs run daily to fetch new data

2. **Data Access (mcp-db):**
   - Provides tools to access parquet files from GCS
   - Offers SQL query capabilities for TimescaleDB
   - Exposes a consistent API for database operations

3. **Data Processing (mcp-background-interface):**
   - Uses Mastra agents/workflows to orchestrate the ETL process
   - Reads parquet files from GCS using mcp-db tools
   - Processes and transforms the data
   - Inserts processed data into TimescaleDB

### Key Components

- **MCP Tools in mcp-db:**
  - `gcs_directory_tree` - Lists GCS objects
  - `duckdb_read_parquet_files` - Queries parquet files
  - `sql_query_read` - Executes SELECT queries
  - `sql_query_create` - Executes CREATE/INSERT statements

- **Mastra Workflows in mcp-background-interface:**
  - `syncObservationWorkflow` - Orchestrates the ETL process
    - Step 1: Lists parquet files in GCS
    - Step 2: Processes each file in batches
    - Step 3: Saves processed data to TimescaleDB
    - Step 4: Tracks progress to enable incremental processing

## Troubleshooting

### Common Issues

1. **GCS Access Issues:**
   - Verify that your service account has proper permissions
   - Check that the GCP_SERVICE_ACCOUNT environment variable is correctly set

2. **Database Connection Issues:**
   - Ensure TimescaleDB is running and accessible
   - Verify that DATABASE_URL is correct
   - Check for firewall or network restrictions

3. **Workflow Execution Failures:**
   - Check Mastra logs for specific error details
   - Ensure all dependencies are correctly installed
   - Verify that the MCP DB server is running and accessible

### Debugging Tips

- Use `LOG_LEVEL=debug` for more detailed logs
- Ask Quang to grant access to df-landing-zone bucket for debugging parquet files
- Inspect parquet files directly using DuckDB CLI
- Monitor the TimescaleDB tables to verify data insertion