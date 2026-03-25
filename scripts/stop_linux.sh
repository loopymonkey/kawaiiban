#!/bin/bash
cd "$(dirname "$0")/.."
echo "Stopping local docker container..."
docker stop pm_app || true
docker rm pm_app || true
echo "Stopped."
