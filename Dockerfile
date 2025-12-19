# =============================================================================
# VAAS - Vulnerability Assignment Automation System
# Multi-stage Docker build
# =============================================================================

# -----------------------------------------------------------------------------
# Stage 1: Build React Frontend
# -----------------------------------------------------------------------------
FROM node:20-alpine AS frontend-builder

WORKDIR /app/frontend

# Copy package files first for better caching
COPY frontend/package*.json ./

# Install dependencies
RUN npm ci --silent

# Copy frontend source
COPY frontend/ ./

# Build production bundle (outputs to ../vaas/web/static/dist)
# We'll copy it to a known location for the next stage
RUN npm run build && mv ../vaas/web/static/dist /frontend-dist

# -----------------------------------------------------------------------------
# Stage 2: Python Runtime
# -----------------------------------------------------------------------------
FROM python:3.12-slim

# Set environment variables
ENV PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1 \
    FLASK_ENV=production \
    VAAS_DATA_DIR=/app/data

WORKDIR /app

# Install system dependencies
RUN apt-get update && apt-get install -y --no-install-recommends \
    curl \
    && rm -rf /var/lib/apt/lists/*

# Create non-root user for security
RUN groupadd -r vaas && useradd -r -g vaas vaas

# Copy Python requirements and install dependencies
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt gunicorn

# Copy application code
COPY vaas/ ./vaas/

# Copy built frontend from Stage 1
COPY --from=frontend-builder /frontend-dist ./vaas/web/static/dist/

# Copy example config files (will be overwritten by volume mounts)
COPY data/*.example ./data/

# Copy entrypoint script with proper permissions
COPY --chmod=755 docker-entrypoint.sh /usr/local/bin/

# Create data directories
RUN mkdir -p data/uploads data/outputs data/logs data/historical \
    && chown -R vaas:vaas /app

# Switch to non-root user
USER vaas

# Set entrypoint
ENTRYPOINT ["docker-entrypoint.sh"]

# Expose port
EXPOSE 5001

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=5s --retries=3 \
    CMD curl -f http://localhost:5001/health || exit 1

# Run with Gunicorn
CMD ["gunicorn", "--bind", "0.0.0.0:5001", "--workers", "2", "--threads", "4", \
     "--access-logfile", "-", "--error-logfile", "-", \
     "vaas.main:create_app()"]
