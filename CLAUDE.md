# MCP-DB Development Guide

## Commands
- Build: `npm run build` or `make build`
- Dev: `npm run dev` or `make dev` (with SSE transport)
- Start: `npm run start`
- Debug: `npm run debug` or `make debug`
- Docker: `make init` (setup), `make down` (teardown)

## Code Style
- Use strict TypeScript with proper types from `types.ts`
- Follow ESM imports (with .js extension in imports despite .ts files)
- Organize imports: external libraries first, then internal modules
- Use camelCase for functions/variables, PascalCase for interfaces
- Handle errors with try/catch and use `formatErrorResponse` utility
- Maintain modular organization (resources, tools, services)
- Follow resource/command handler patterns established in codebase
- Use Zod for config validation and type-safe error handling
- Maintain clear separation of concerns between modules