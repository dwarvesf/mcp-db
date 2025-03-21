#!/usr/bin/env node

import { fileURLToPath } from 'url';
import { dirname } from 'path';
import { main } from './server.js';

// Get the directory name of the current module
const __dirname = dirname(fileURLToPath(import.meta.url));

// Start the server
main().catch((error: unknown) => {
  if (error instanceof Error) {
    console.error("\nFatal error:", error.message);
    if (error.stack) {
      console.error("\nStack trace:");
      console.error(error.stack);
    }
  } else {
    console.error("\nUnknown error:", error);
  }
  process.exit(1);
}); 