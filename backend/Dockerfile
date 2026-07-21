FROM node:22-alpine

WORKDIR /app

# Install dependencies first so this layer is cached when only source changes.
COPY package*.json ./
RUN npm install --omit=dev --no-audit --no-fund

COPY src ./src

RUN addgroup -S app && adduser -S app -G app \
  && mkdir -p /app/data /app/uploads \
  && chown -R app:app /app
USER app

ENV PORT=4000
ENV DATA_DIR=/app/data

EXPOSE 4000

CMD ["node", "src/server.js"]
