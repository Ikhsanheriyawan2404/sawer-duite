#!/bin/bash
set -e

echo "🚀 Pulling latest images..."
docker compose pull --quiet

echo "🔄 Deploy with minimal downtime using plain Docker Compose..."
# Compose bukan Swarm: 'deploy.update_config' dan 'order: start-first' tidak dipakai.
# Kita kurangi downtime dengan:
# 1) Menjaga minimal 2 replica aktif
# 2) Batasi recreate paralel supaya satu-satu (hindari semua mati bareng)
export COMPOSE_PARALLEL_LIMIT=1
docker compose up -d --scale backend=2 --scale frontend=2 --remove-orphans --wait

echo "✅ Deployment successful! Current status:"
docker compose ps
