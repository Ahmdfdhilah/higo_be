# Use official Node.js runtime
FROM node:16-alpine

# Set working directory
WORKDIR /app

# Copy package files
COPY package*.json ./

# Install dependencies
RUN npm ci --only=production

# Copy source code
COPY . .

# Build TypeScript
RUN npm run build

# Create uploads directory
RUN mkdir -p /app/uploads/csv

# Expose port
EXPOSE 3000

# Start the application
CMD ["npm", "start"]