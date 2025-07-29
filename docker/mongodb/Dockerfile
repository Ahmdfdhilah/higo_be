# Custom MongoDB Dockerfile
FROM mongo:7.0

# Set environment variables
ENV MONGO_INITDB_ROOT_USERNAME=admin
ENV MONGO_INITDB_ROOT_PASSWORD=password
ENV MONGO_INITDB_DATABASE=higoapp

# Copy initialization script
COPY init/init.js /docker-entrypoint-initdb.d/

# Expose MongoDB port
EXPOSE 27017

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=5s --retries=3 \
  CMD echo 'db.runCommand("ping").ok' | mongosh localhost:27017/test --quiet || exit 1

# Use default MongoDB entrypoint
CMD ["mongod", "--bind_ip_all"]