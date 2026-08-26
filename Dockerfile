# Backend Dockerfile for One Mustard Seed
FROM node:22-alpine AS runner

WORKDIR /app

# Set production environment
ENV NODE_ENV=production

# Install dependencies
COPY package*.json ./
RUN npm install --omit=dev --no-audit --no-fund

# Copy source code
COPY src/ ./src/

# Create uploads directory
RUN mkdir -p uploads

# Expose port
EXPOSE 5000

# Start backend server
CMD ["node", "src/index.js"]
