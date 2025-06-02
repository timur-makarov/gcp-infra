FROM oven/bun:alpine AS builder

WORKDIR /app

COPY package.json bun.lock ./

RUN bun install

COPY . .

RUN bun run build

FROM oven/bun:alpine

COPY --from=builder /app/bun-service /usr/local/bin/bun-service

CMD ["bun-service"]
