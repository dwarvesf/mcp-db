import { Tool } from "@modelcontextprotocol/sdk/types.js";

export const gcsDirectoryTreeTool: Tool = {
  name: "gcs_directory_tree",
  description: "Fetch the directory tree structure from GCS bucket with pagination support",
  inputSchema: {
    type: "object",
    properties: {
      bucket: {
        type: "string",
        description: "The name of the GCS bucket to list objects from",
      },
      prefix: {
        type: "string",
        description: "Optional prefix to filter objects by (e.g., 'folder/')",
      },
      delimiter: {
        type: "string",
        description: "Optional delimiter for hierarchical listing (e.g., '/')",
        default: "/"
      },
      limit: {
        type: "number",
        description: "Maximum number of results to return (default: 1000)",
      },
      offset: {
        type: "number",
        description: "Number of results to skip for pagination (default: 0)",
      }
    }
  }
};