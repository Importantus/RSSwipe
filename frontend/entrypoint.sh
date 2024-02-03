#!/bin/sh

# Start the first process
echo "Setting backend url to $BACKEND_URL"
echo "$BACKEND_URL" >/frontend/backend_url

# Start the second process
echo "Starting frontend"
exec "$@"
