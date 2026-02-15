#!/bin/bash

# Configuration
NETWORK_NAME="lecturesynth-net"
BACKEND_IMAGE="lecturesynth-backend"
FRONTEND_IMAGE="lecturesynth-frontend"
BACKEND_CONTAINER="lecturesynth-backend"
FRONTEND_CONTAINER="lecturesynth-frontend"

# Check for .env file
if [ -f .env ]; then
  export $(grep -v '^#' .env | xargs)
else
  echo "Error: .env file not found. Please copy .env.example to .env and add your API Key."
  exit 1
fi

# Cleanup function
cleanup() {
  echo "Stopping containers..."
  docker stop $BACKEND_CONTAINER $FRONTEND_CONTAINER
  docker rm $BACKEND_CONTAINER $FRONTEND_CONTAINER
  docker network rm $NETWORK_NAME
  echo "Cleanup complete."
}

# Trap SIGINT and SIGTERM
trap cleanup EXIT

# Create network
echo "Creating network '$NETWORK_NAME'..."
docker network create $NETWORK_NAME || true

# Build Backend
echo "Building Backend..."
docker build -t $BACKEND_IMAGE -f Dockerfile.backend .

# Build Frontend
echo "Building Frontend..."
docker build -t $FRONTEND_IMAGE -f Dockerfile .

# Run Backend
echo "Starting Backend..."
docker run -d \
  --name $BACKEND_CONTAINER \
  --network $NETWORK_NAME \
  -p 8000:8000 \
  -e API_KEY=${GEMINI_API_KEY} \
  $BACKEND_IMAGE

# Run Frontend
echo "Starting Frontend..."
docker run -d \
  --name $FRONTEND_CONTAINER \
  --network $NETWORK_NAME \
  -p 3000:80 \
  $FRONTEND_IMAGE

# Follow logs
docker logs -f $BACKEND_CONTAINER &
docker logs -f $FRONTEND_CONTAINER &

echo "Application started!"
echo "Frontend: http://localhost:3000"
echo "Backend: http://localhost:8000"
echo "Press Ctrl+C to stop."

# Wait for background processes (logs)
wait
