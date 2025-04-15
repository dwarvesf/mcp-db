import { Storage } from '@google-cloud/storage';
export declare function setupGCS(): Promise<Storage>;
export declare function getGCSClient(): Storage;
