import { Storage } from '@google-cloud/storage';
import { handleGCSObjectsResource } from '../../legacy-resources/gcs/handler.js';
import { FastMCPResource } from '../../fast-tools/types.js';

export function createGCSObjectsResource(
  gcs: Storage | null, 
  gcsBucket: string | undefined
): FastMCPResource {
  return {
    name: "mcp://gcs/objects",
    description: "List of objects in the GCS bucket",
    uri: "mcp://gcs/objects",
    load: async () => {
      if (!gcs || !gcsBucket) {
        throw new Error("GCS not properly configured");
      }
      const result = await handleGCSObjectsResource(gcs, gcsBucket);
      return {
        uri: "mcp://gcs/objects",
        text: JSON.stringify(result, null, 2)
      };
    }
  };
} 