FROM oven/bun:alpine

WORKDIR /app

COPY . .

RUN bun install

RUN bun run build

EXPOSE 8080

CMD ["bun", "run", "start"]
