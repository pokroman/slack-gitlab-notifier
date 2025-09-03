FROM node:18-alpine

# Set working directory
WORKDIR /app

# Install dependencies for SQLite3
RUN apk add --no-cache python3 make g++

# Copy package files
COPY package*.json ./

# Install dependencies
RUN npm ci --only=production

# Copy source code
COPY src/ ./src/

# Create directory for database
RUN mkdir -p /app/data

# Create user for security
RUN addgroup -g 1001 -S nodejs && \
    adduser -S nodejs -u 1001

# Change directory owner
RUN chown -R nodejs:nodejs /app

# Switch to nodejs user
USER nodejs

# Open port
EXPOSE 3000

# Run command
CMD ["node", "src/app.js"]
