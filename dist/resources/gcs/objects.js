export const gcsObjectsResource = {
    uri: "mcp://gcs/objects",
    name: "gcs_objects",
    description: "List objects in GCS bucket",
    schema: {
        type: "array",
        items: {
            type: "object",
            properties: {
                name: {
                    type: "string",
                    description: "Name of the file or directory"
                },
                updated: {
                    type: "string",
                    description: "Last updated timestamp"
                }
            }
        }
    }
};
