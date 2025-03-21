import { Storage } from '@google-cloud/storage';
export declare function handleGCSObjectsResource(gcs: Storage, bucket: string): Promise<{
    name: string;
    updated: string | undefined;
}[]>;
