# --- build ---
FROM golang:1.23-alpine AS build
WORKDIR /app
COPY go.mod ./
COPY . .
RUN CGO_ENABLED=0 go build -o /routes-service .

# --- runtime mínimo ---
FROM gcr.io/distroless/static-debian12
COPY --from=build /routes-service /routes-service
EXPOSE 8080
USER nonroot:nonroot
ENTRYPOINT ["/routes-service"]
