#!/bin/bash
cd "$(dirname "$0")/.."
echo "Starting local docker container..."
docker build -t project_management_app .
docker rm -f pm_app || true
docker run -d --name pm_app -p 8000:8000 project_management_app
echo "App should be available at http://localhost:8000"
