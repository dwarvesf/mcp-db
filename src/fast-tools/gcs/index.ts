import { Storage } from '@google-cloud/storage';
import { createGCSDirectoryTreeTool } from './tree.js';
import { FastMCPTool } from '../types.js';

export function createGCSTools(gcs: Storage | null, gcsBucket: string | undefined): FastMCPTool[] {
  return [
    createGCSDirectoryTreeTool(gcs, gcsBucket)
  ];
}

export * from './tree.js'; 