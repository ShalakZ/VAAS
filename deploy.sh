#!/bin/bash
# VAAS Quick Deployment Script
# Usage: curl -fsSL https://raw.githubusercontent.com/ShalakZ/VAAS/main/deploy.sh | bash

set -e

echo "============================================"
echo "   VAAS - Vulnerability Assignment System"
echo "============================================"
echo ""

# Get port
read -p "Enter port to run on [8085]: " PORT
PORT=${PORT:-8085}

# Generate secret key
SECRET_KEY=$(openssl rand -hex 32 2>/dev/null || head -c 32 /dev/urandom | xxd -p)

# Pull latest image
echo ""
echo "Pulling latest VAAS image..."
docker pull mzaqstpziadshalak/vaas:2.0

# Stop existing container if running
docker stop vaas 2>/dev/null || true
docker rm vaas 2>/dev/null || true

# Run container
echo ""
echo "Starting VAAS on port $PORT..."
docker run -d \
  --name vaas \
  -p ${PORT}:8085 \
  -e FLASK_SECRET_KEY=${SECRET_KEY} \
  -e VAAS_THRESHOLD=0.85 \
  -v vaas-data:/app/data \
  --restart unless-stopped \
  mzaqstpziadshalak/vaas:2.0

echo ""
echo "============================================"
echo "  VAAS is running!"
echo "============================================"
echo ""
echo "  URL:      http://localhost:${PORT}"
echo "  Login:    admin / admin"
echo ""
echo "  Commands:"
echo "    Stop:   docker stop vaas"
echo "    Start:  docker start vaas"
echo "    Logs:   docker logs -f vaas"
echo "    Remove: docker rm -f vaas"
echo ""
echo "  IMPORTANT: Change the default password after login!"
echo "============================================"
