# Production Dockerfile for The Verity Backend
# Includes both Node.js (Express + Socket.IO) and .NET SDK (for real-time C# compilation)

FROM mcr.microsoft.com/dotnet/sdk:8.0 AS dotnet-base

# Install Node.js 20 and C++ build tools for native modules (better-sqlite3)
RUN apt-get update && apt-get install -y curl build-essential python3 make g++ sqlite3 libsqlite3-dev && \
    curl -fsSL https://deb.nodesource.com/setup_20.x | bash - && \
    apt-get install -y nodejs && \
    rm -rf /var/lib/apt/lists/*

WORKDIR /app

# Cache buster to ensure Render compiles fresh binaries for Linux
ARG BUILD_ID=2026-09-20-v2

# Install server dependencies and compile native binaries for Linux
COPY package.json ./
RUN npm install --production && npm rebuild better-sqlite3 --build-from-source

# Copy server application code
COPY . ./

# Environment configuration
ENV PORT=3001
ENV NODE_ENV=production

EXPOSE 3001

CMD ["node", "server.js"]
