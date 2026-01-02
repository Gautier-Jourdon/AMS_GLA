FROM node:20-slim

WORKDIR /app

COPY package*.json ./
RUN npm ci

COPY . .

# Start the web server, not the collector
CMD ["node", "server.js"]