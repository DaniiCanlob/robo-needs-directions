FROM node:20-alpine

WORKDIR /app
COPY package.json ./
COPY server.js ./
COPY src ./src
COPY public ./public

RUN mkdir -p /app/data
ENV NODE_ENV=production PORT=3000 DATA_DIR=/app/data
EXPOSE 3000
VOLUME ["/app/data"]

CMD ["node", "server.js"]
