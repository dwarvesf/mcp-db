import { Storage } from '@google-cloud/storage';
import { createGCSObjectsResource } from './objects.js';
import { FastMCPResource } from '../../fast-tools/types.js';

export function createGCSResources(gcs: Storage | null, gcsBucket: string | undefined): FastMCPResource[] {
  return [
    createGCSObjectsResource(gcs, gcsBucket)
  ];
}

export * from './objects.js'; 