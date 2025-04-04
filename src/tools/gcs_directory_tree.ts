import { MCPTool, logger } from "mcp-framework";
import { z } from "zod";
import { Storage, GetFilesOptions } from '@google-cloud/storage';
import { setupGCS } from '../services/gcs.js';
import { formatSuccessResponse } from "../utils.js";

// Define the input schema using Zod
const GCSDirectoryTreeInputSchema = z.object({
  bucket: z.string().optional().describe("The name of the GCS bucket (overrides default if provided)"),
  prefix: z.string().optional().describe("Optional prefix to filter objects by (e.g., 'folder/')"),
  delimiter: z.string().optional().describe("Delimiter for hierarchical listing (e.g., '/')"),
  limit: z.number().optional().describe("Number of results to return"),
  pageToken: z.string().optional().describe("Token for pagination (use the nextPageToken from previous response)"),
});

// Infer the input type from the Zod schema
type GCSDirectoryTreeInput = z.infer<typeof GCSDirectoryTreeInputSchema>;

export class GCSDirectoryTreeTool extends MCPTool<GCSDirectoryTreeInput> {
  name = "gcs_directory_tree";
  description = "Fetch the directory tree structure from GCS bucket with pagination support";

  defaultBucket = process.env.GCS_BUCKET;

  // Define the schema property using the nested structure with Zod types.
  schema = {
    bucket: {
      type: z.string().optional(),
      description: "The name of the GCS bucket (overrides default if provided)",
    },
    prefix: {
      type: z.string().optional(),
      description: "Optional prefix to filter objects by (e.g., 'folder/')",
    },
    delimiter: {
      type: z.string().optional().default('/'),
      description: "Delimiter for hierarchical listing (e.g., '/'), defaults to '/'",
    },
    limit: {
      type: z.number().optional().default(100),
      description: "Number of results to return, defaults to 100",
    },
    pageToken: {
      type: z.string().optional(),
      description: "Token for pagination (use the nextPageToken from previous response)",
    }
  };

  // Implement the execution logic
  async execute(args: GCSDirectoryTreeInput): Promise<any> {
    logger.info(`Handling tool request: ${this.name}`);
    let gcs: Storage | null = null;
    let defaultBucket: string | undefined;

    try {
      // Initialize GCS client
      gcs = await setupGCS();

      // Get default bucket from environment
      defaultBucket = process.env.GCS_BUCKET;

      const bucketName = args.bucket || defaultBucket;
      if (!bucketName) {
        throw new Error("GCS bucket name is required (either via args or GCS_BUCKET environment variable)");
      }

      const options: GetFilesOptions = {
        prefix: args.prefix,
        delimiter: args.delimiter,
        maxResults: args.limit,
        pageToken: args.pageToken,
        autoPaginate: false, // Important for manual pagination control
      };

      // Get the bucket and files
      const bucket = gcs.bucket(bucketName);
      const [files, nextQuery, apiResponse] = await bucket.getFiles(options);

      // Extract directories from API response
      const typedResponse = apiResponse as { prefixes?: string[] };
      const directories = typedResponse.prefixes || [];

      // Build the result structure
      const result = {
        bucket: bucketName,
        files: files.map(file => ({
          name: file.name,
          size: file.metadata?.size ? parseInt(String(file.metadata.size), 10) : 0,
          updated: file.metadata?.updated,
          contentType: file.metadata?.contentType
        })),
        directories,
        pagination: {
          total: files.length + directories.length,
          nextPageToken: nextQuery?.pageToken || null
        }
      };

      logger.info(`Successfully fetched ${files.length} files and ${directories.length} directories`);

      // Format the result according to the expected structure
      return formatSuccessResponse(result);
    } catch (error) {
      logger.error(`Error executing ${this.name}: ${error}`);
      throw new Error(`GCS Directory Tree Tool Error: ${error instanceof Error ? error.message : String(error)}`);
    }
  }
}

export default GCSDirectoryTreeTool;
