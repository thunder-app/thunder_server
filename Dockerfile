# Build stage
FROM node:22-alpine AS builder

# Add metadata labels
LABEL maintainer="Hamlet Jiang Su"
LABEL description="Thunder server for handling notifications and related services"
LABEL version="0.1.0"

# Set working directory
WORKDIR /app

# Copy package files
COPY package*.json ./
COPY tsconfig.json ./

# Install all dependencies (including dev dependencies for building)
# Clear npm cache to avoid potential cache conflicts in CI environments
RUN npm cache clean --force && npm ci

# Copy source code
COPY src/ ./src/

# Build TypeScript to JavaScript
RUN npm run build || npx tsc

# Production stage
FROM node:22-alpine AS production

# Set working directory
WORKDIR /app

# Copy package files
COPY package*.json ./

# Install only production dependencies
RUN npm cache clean --force && npm ci --omit=dev

# Copy built application from builder stage
COPY --from=builder /app/dist ./dist

# Expose the port the app runs on
EXPOSE 2831
  
# Start the server
CMD ["node", "dist/index.js"]
