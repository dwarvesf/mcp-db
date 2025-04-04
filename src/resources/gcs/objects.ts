import { MCPResource } from "mcp-framework";
import { Storage, GetFilesOptions } from '@google-cloud/storage';
import { serializeBigInt } from '../../utils.js'; // Adjust path as needed

export default class GCSObjectsResource extends MCPResource { // Changed to export default
  uri = "mcp://gcs/objects"; // Keep original URI
  name = "gcs_objects";
  description = "List objects in the configured GCS bucket";
  mimeType = "application/json"; // Define MIME type

  private gcs: Storage;
  private bucketName: string;

  // Constructor to receive dependencies
  constructor(gcs: Storage, bucketName: string) {
    super();
    if (!gcs) {
      throw new Error("Google Cloud Storage client is required for GCSObjectsResource");
    }
    if (!bucketName) {
      throw new Error("GCS bucket name is required for GCSObjectsResource");
    }
    this.gcs = gcs;
    this.bucketName = bucketName;
  }

  // Implement the read logic to list objects
  async read(): Promise<Array<{ uri: string; mimeType?: string; text: string }>> {
    console.error(`Handling resource request: ${this.uri}`);
    try {
      // Basic listing - might need options like prefix, delimiter, pagination later
      const options: GetFilesOptions = {
        autoPaginate: true, // Get all objects for simplicity in this basic resource
        // Consider adding maxResults if the bucket is very large
      };

      const bucket = this.gcs.bucket(this.bucketName);
      const [files] = await bucket.getFiles(options);

      const objectsData = files.map(file => ({
        name: file.name,
        updated: file.metadata.updated,
        size: file.metadata.size,
        contentType: file.metadata.contentType,
      }));

      return [
        {
          uri: this.uri,
          mimeType: this.mimeType,
          text: JSON.stringify(serializeBigInt(objectsData), null, 2),
        },
      ];
    } catch (error) {
      console.error(`Error reading resource ${this.uri}:`, error);
      throw new Error(`GCS Objects Resource Error: ${error instanceof Error ? error.message : String(error)}`);
    }
  }
}
