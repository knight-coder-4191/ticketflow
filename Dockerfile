# TicketFlow Production Container
FROM node:20-alpine

WORKDIR /app

# Copy root and server dependencies
COPY package*.json ./
COPY server/package*.json ./server/

# Install production dependencies
RUN npm install --omit=dev

# Copy entire application source
COPY . .

# Environment variables
ENV NODE_ENV=production
ENV PORT=5000

# Expose server port
EXPOSE 5000

# Start command
CMD ["node", "server/src/server.js"]
