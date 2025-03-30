# Build stage
FROM node:18-alpine AS builder

WORKDIR /app

# Install build dependencies
RUN apk add --no-cache python3 make g++

# Copy all source files first
COPY . .

# Install dependencies and build
RUN npm ci && \
    npm run build

# Production stage
FROM node:18-alpine

# Install build dependencies for native modules
RUN apk add --no-cache python3 make g++

# Create app directory and non-root user
WORKDIR /app
RUN addgroup -S appgroup && adduser -S appuser -G appgroup

# Copy package files and install production dependencies
COPY package*.json tsconfig.json ./
ENV NODE_ENV=production

# Install production dependencies and rebuild native modules
RUN npm ci --omit=dev --ignore-scripts && \
    npm rebuild && \
    # Clean up build dependencies and cache
    apk del python3 make g++ && \
    npm cache clean --force

# Copy built files from builder stage
COPY --from=builder /app/dist ./dist

# Set environment variables
ENV LOG_LEVEL=info

# Switch to non-root user
USER appuser

# Use ENTRYPOINT and CMD to allow argument overrides
ENTRYPOINT ["npm", "start", "--"]
CMD []
