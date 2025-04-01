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

# Install production dependencies and rebuild native modules
RUN npm ci --omit=dev --ignore-scripts && \
    npm rebuild && \
    chown -R appuser:appgroup /app

# Copy built files from builder stage
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/migrations ./migrations
RUN chown -R appuser:appgroup /app/dist

# Set environment variables
ENV LOG_LEVEL=info
ENV HOME=/home/appuser

# Switch to non-root user
USER appuser

# Create a runtime script to allow switching between implementations
# Set executable permissions directly during copy
COPY --chmod=0755 <<EOF /app/entrypoint.sh
#!/bin/sh
if [ "\$1" = "--fast" ]; then
  shift
  exec node ./dist/fast-cli.js "\$@"
else
  exec node ./dist/cli.js "\$@"
fi
EOF

# Use ENTRYPOINT to run our script
ENTRYPOINT ["/app/entrypoint.sh"]
CMD []
