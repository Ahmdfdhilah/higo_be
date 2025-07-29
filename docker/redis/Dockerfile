# Custom Redis Dockerfile
FROM redis:7.2-alpine

# Copy custom Redis configuration
COPY redis.conf /usr/local/etc/redis/redis.conf

# Create directory for Redis data
RUN mkdir -p /data && chown redis:redis /data

# Expose Redis port
EXPOSE 6379

# Health check
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
  CMD redis-cli ping || exit 1

# Switch to redis user
USER redis

# Start Redis with custom configuration
CMD ["redis-server", "/usr/local/etc/redis/redis.conf"]