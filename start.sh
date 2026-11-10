#!/bin/bash

# Set default port if not provided
PORT=${PORT:-8080}
REDIS_URL=${REDIS_URL:-redis://localhost:6379/0}

echo "Starting services with PORT=${PORT} and REDIS_URL=${REDIS_URL}"

# Start Redis in the background
echo "Starting Redis..."
redis-server &


# Start the Flask app in the foreground using Gunicorn
echo "Starting App..."
node server.js
