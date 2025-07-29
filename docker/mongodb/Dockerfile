# Custom MongoDB Dockerfile
FROM mongo:7.0

# Set environment variables
ENV MONGO_INITDB_ROOT_USERNAME=admin
ENV MONGO_INITDB_ROOT_PASSWORD=password
ENV MONGO_INITDB_DATABASE=higoapp

# Create directory for initialization scripts
RUN mkdir -p /docker-entrypoint-initdb.d/

# Copy initialization script
COPY init/init.js /docker-entrypoint-initdb.d/

# Copy custom MongoDB configuration
COPY mongod.conf /etc/mongod.conf

# Create data directory with proper permissions
RUN mkdir -p /data/db && chown -R mongodb:mongodb /data/db

# Expose MongoDB port
EXPOSE 27017

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=5s --retries=3 \
  CMD echo 'db.runCommand("ping").ok' | mongosh localhost:27017/test --quiet || exit 1

# Use custom configuration
CMD ["mongod", "--config", "/etc/mongod.conf"]