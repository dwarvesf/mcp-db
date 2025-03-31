#!/usr/bin/env node
import { main } from './fast-server.js';

// Run the main function and properly handle any errors
main().catch(error => {
  console.error("Unhandled error in main:", error);
  process.exit(1);
}); 