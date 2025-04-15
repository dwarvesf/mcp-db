import { MCPResource } from "mcp-framework";
export declare class SQLTablesResource extends MCPResource {
    uri: string;
    name: string;
    description: string;
    mimeType: string;
    private duckDBConnection;
    private duckDBConnectionPromise;
    constructor();
    read(): Promise<Array<{
        uri: string;
        mimeType?: string;
        text: string;
    }>>;
}
export default SQLTablesResource;
