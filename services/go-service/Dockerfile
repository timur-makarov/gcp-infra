FROM golang:1.24-alpine AS builder

WORKDIR /app

COPY go.mod go.sum ./

RUN go mod download

COPY . .

RUN go build -o go-service cmd/main.go

FROM alpine:latest

RUN apk add --no-cache bash curl

COPY --from=builder /app/go-service /usr/local/bin/go-service

CMD ["go-service"]
