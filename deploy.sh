#!/bin/bash
set -e

echo "🚀 Pulling latest images..."
docker compose pull --quiet

echo "🔄 Deploy backend dan frontend..."
docker compose up -d --remove-orphans --wait --wait-timeout 120 backend frontend

echo "✅ Deployment successful! Current status:"
docker compose ps
