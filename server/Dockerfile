# Production Dockerfile for The Verity Backend
# Includes both Node.js (Express + Socket.IO) and .NET SDK (for real-time C# compilation)

FROM mcr.microsoft.com/dotnet/sdk:8.0 AS dotnet-base

# Install Node.js 20
RUN apt-get update && apt-get install -y curl && \
    curl -fsSL https://deb.nodesource.com/setup_20.x | bash - && \
    apt-get install -y nodejs && \
    rm -rf /var/lib/apt/lists/*

WORKDIR /app

# Install server dependencies
COPY server/package*.json ./
RUN npm install --production

# Copy server application code
COPY server/ ./

# Environment configuration
ENV PORT=3001
ENV NODE_ENV=production

EXPOSE 3001

CMD ["node", "server.js"]
