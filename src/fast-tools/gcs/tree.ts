import { z } from 'zod';
import { Storage } from '@google-cloud/storage';
import { handleGCSDirectoryTree } from '../../tools/gcs/handler.js';
import { GCSDirectoryTreeArgs } from '../../types.js';
import { FastMCPTool } from '../types.js';

export function createGCSDirectoryTreeTool(
  gcs: Storage | null, 
  gcsBucket: string | undefined
): FastMCPTool<GCSDirectoryTreeArgs> {
  return {
    name: "gcs_directory_tree",
    description: "List files and directories in a GCS bucket with a tree-like structure",
    parameters: z.object({
      prefix: z.string().optional().describe("Prefix to filter objects (like a directory path)")
    }),
    execute: async (args: GCSDirectoryTreeArgs) => {
      if (!gcs || !gcsBucket) {
        throw new Error("GCS not properly configured");
      }
      const result = await handleGCSDirectoryTree(gcs, gcsBucket, args);
      return JSON.stringify(result);
    }
  };
} 