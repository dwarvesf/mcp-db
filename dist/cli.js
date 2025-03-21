#!/usr/bin/env node
import { main } from './server.js';
main().catch((error) => {
    console.error("Fatal error in main():", error);
    process.exit(1);
});
