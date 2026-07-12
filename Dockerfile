FROM node:18-alpine

WORKDIR /app

# Copier backend
COPY backend/package*.json ./backend/
WORKDIR /app/backend
RUN npm install --legacy-peer-deps

COPY backend/ ./

# Copier frontend
WORKDIR /app
COPY public/ ./public/

EXPOSE 3000

CMD ["node", "backend/index.js"]
