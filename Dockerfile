# Stage 1: Build Frontend
FROM node:20-slim AS frontend-build
WORKDIR /app/frontend
COPY frontend/package.json frontend/package-lock.json* ./
RUN npm install
COPY frontend/ ./
RUN npm run build

# Stage 2: Serve Backend
FROM python:3.12-slim

# Install uv
COPY --from=ghcr.io/astral-sh/uv:latest /uv /uvx /bin/

# Set working directory
WORKDIR /app

# Copy the backend project files
COPY backend/pyproject.toml backend/
WORKDIR /app/backend

# Install dependencies using uv
RUN uv pip install --system fastapi uvicorn sqlalchemy pydantic openai python-dotenv bcrypt "python-jose[cryptography]" httpx

# Move back to /app context
WORKDIR /app

# Copy application files
COPY backend/ /app/backend/

# Copy the built static bundle from Node image
COPY --from=frontend-build /app/frontend/out/ /app/frontend/out/

EXPOSE 8080

ENV PYTHONPATH=/app
ENV PORT=8080

# Create a non-root user for Cloud Run
RUN adduser --disabled-password --gecos "" appuser && chown -R appuser /app
USER appuser

HEALTHCHECK --interval=30s --timeout=5s --start-period=5s --retries=3 \
  CMD curl -f http://localhost:${PORT}/api/health || exit 1

# Use shell form for CMD to allow environment variable expansion of $PORT
CMD uvicorn backend.main:app --host 0.0.0.0 --port ${PORT}
