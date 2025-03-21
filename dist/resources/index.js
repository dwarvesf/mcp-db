import { sqlTablesResource } from './sql/index.js';
import { gcsObjectsResource } from './gcs/index.js';
export const resources = [
    sqlTablesResource,
    gcsObjectsResource
];
export * from './sql/index.js';
export * from './gcs/index.js';
