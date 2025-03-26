import { Resource } from "@modelcontextprotocol/sdk/types.js";

export const gcsObjectsResource: Resource = {
  uri: "gcs://objects",
  uriTemplate: "gcs://{bucket}/{path}",
  name: "gcs_objects",
  description: "Access objects in Google Cloud Storage bucket",
  schema: {
    type: "object",
    properties: {
      name: {
        type: "string",
        description: "Name/path of the file or directory"
      },
      updated: {
        type: "string",
        description: "Last updated timestamp"
      },
      size: {
        type: "number",
        description: "Size of the object in bytes"
      },
      contentType: {
        type: "string",
        description: "MIME type of the object"
      }
    }
  }
}; 