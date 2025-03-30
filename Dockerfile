# Build stage
FROM node:18-alpine AS builder

WORKDIR /app

# Copy package files
COPY package*.json ./

# Install dependencies
RUN npm ci

# Copy source code
COPY . .

# Build TypeScript code
RUN npm run build

# Production stage
FROM node:18-alpine

# Create app directory and non-root user
WORKDIR /app
RUN addgroup -S appgroup && adduser -S appuser -G appgroup

# Install production dependencies only
COPY package*.json ./
RUN npm ci --only=production

# Copy built files from builder stage
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/bin ./bin

# Set environment variables
ENV NODE_ENV=production
ENV LOG_LEVEL=info

# Switch to non-root user
USER appuser

# Expose port if needed (though this is an MCP server, not a typical web server)
# EXPOSE 3000

# Command to run the application
CMD ["npm", "start"]
