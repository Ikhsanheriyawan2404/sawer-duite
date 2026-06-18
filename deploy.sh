#!/bin/bash
set -e

echo "🚀 Pulling latest images..."
docker compose pull --quiet

echo "🔄 Deploy backend dulu..."
docker compose up -d --no-deps --remove-orphans backend
echo "⏳ Menunggu backend healthy..."
docker compose wait backend   # tunggu sampai healthcheck passed

echo "🔄 Deploy frontend..."
docker compose up -d --no-deps --remove-orphans frontend

echo "✅ Deployment successful! Current status:"
docker compose ps
