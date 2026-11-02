# --- STAGE 1: build ---
FROM rust:1-bookworm AS builder

WORKDIR /app

COPY Cargo.toml Cargo.lock ./
COPY crates ./crates
COPY migrations ./migrations

# the cache mounts keep downloaded crates and incremental build output between CI runs
RUN --mount=type=cache,target=/usr/local/cargo/registry \
    --mount=type=cache,target=/app/target \
    cargo build --release --locked -p rsswipe \
    && cp target/release/rsswipe /rsswipe

# --- STAGE 2: runtime ---
FROM debian:bookworm-slim AS runner

RUN apt-get update \
    && apt-get install -y --no-install-recommends ca-certificates \
    && rm -rf /var/lib/apt/lists/* \
    && useradd --system --uid 10001 rsswipe

ENV TZ=UTC

COPY --from=builder /rsswipe /usr/local/bin/rsswipe

USER rsswipe
WORKDIR /app

EXPOSE 8080

# SERVICE_TYPE selects the workload (all | api | feedParser | garbageCollector); `rsswipe migrate` applies migrations
CMD ["rsswipe"]
