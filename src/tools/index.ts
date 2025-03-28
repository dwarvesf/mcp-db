import { sqlQueryCreateTool, sqlQueryReadTool, sqlQueryUpdateTool, sqlQueryDeleteTool } from './sql/index.js';
import { duckDBReadTool } from './duckdb/index.js';

export const tools = [
  sqlQueryCreateTool,
  sqlQueryReadTool,
  sqlQueryUpdateTool,
  sqlQueryDeleteTool,
  duckDBReadTool
];

export * from './sql/index.js';
export * from './duckdb/index.js'; 