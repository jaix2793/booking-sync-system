FROM node:20-alpine

WORKDIR /app

# Install dependencies first for better layer caching
COPY package*.json ./
RUN npm install

# Copy source
COPY tsconfig.json ./
COPY src ./src

EXPOSE 3001

# Use tsx to run TypeScript directly (no separate build step needed in Docker)
CMD ["npx", "tsx", "src/index.ts"]
