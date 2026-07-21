FROM node:22-alpine

WORKDIR /app

# Install dependencies first so this layer is cached when only source changes.
COPY package*.json ./
RUN npm install --omit=dev --no-audit --no-fund

COPY src ./src

# su-exec lets the entrypoint drop from root to the (possibly remapped) app user
# without pulling in the heavier "gosu" + glibc-compat stack.
RUN apk add --no-cache su-exec shadow \
  && addgroup -S app && adduser -S app -G app \
  && mkdir -p /app/data /app/uploads \
  && chown -R app:app /app

COPY entrypoint.sh /entrypoint.sh
RUN chmod +x /entrypoint.sh

ENV PORT=4000
ENV DATA_DIR=/app/data
ENV PUID=1000
ENV PGID=1000

EXPOSE 4000

ENTRYPOINT ["/entrypoint.sh"]
CMD ["node", "src/server.js"]
