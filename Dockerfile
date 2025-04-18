# Build stage
FROM node:20 AS builder

WORKDIR /app

# Copy all source files first
COPY . .

# Install dependencies and build
RUN npm ci && \
    npm run build

# Production stage
FROM node:20

# Create app directory and non-root user with proper home directory
WORKDIR /app
RUN groupadd -r appgroup && \
    useradd -r -g appgroup -m -d /home/appuser appuser && \
    chown -R appuser:appgroup /app

# Copy package files and install production dependencies
COPY package*.json tsconfig.json ./
ENV NODE_ENV=production

# Install dependencies (including node-pg-migrate needed for migrations)
RUN npm ci --ignore-scripts && \
    npm rebuild && \
    chown -R appuser:appgroup /app

# Copy built files from builder stage
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/migrations ./migrations
COPY --from=builder /app/database.json ./database.json
RUN chown -R appuser:appgroup /app/dist

# Set environment variables
ENV LOG_LEVEL=info
ENV HOME=/home/appuser

# Switch to non-root user
USER appuser

# Create a runtime script to allow switching between implementations and running migrations
# Set executable permissions directly during copy
COPY --chmod=0755 <<EOF /app/entrypoint.sh
#!/bin/sh
# Check if the command is to run migrations
if [ "\$1" = "migrate:up:prod" ]; then
  echo "Running database migrations..."
  npm run migrate:up:prod
  exit \$?
fi

# Default behavior: run the MCP server
exec node ./dist/index.js "\$@"
EOF

# Use ENTRYPOINT to run our script
ENTRYPOINT ["/app/entrypoint.sh"]
CMD []
