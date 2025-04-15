import { MCPResource } from "mcp-framework";
export declare class GCSObjectsResource extends MCPResource {
    uri: string;
    name: string;
    description: string;
    mimeType: string;
    private gcs;
    private bucketName;
    private gcsPromise;
    constructor();
    read(): Promise<Array<{
        uri: string;
        mimeType?: string;
        text: string;
    }>>;
}
export default GCSObjectsResource;
