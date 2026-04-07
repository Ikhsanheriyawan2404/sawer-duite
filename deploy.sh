#!/bin/bash
set -e

echo "🚀 Pulling latest images..."
docker compose pull --quiet

echo "🔄 Starting zero-downtime deployment (Rolling Update)..."
# Flag --wait bakal nunggu healthcheck sukses baru script lanjut/selesai.
# Karena di compose.yml ada 'order: start-first', dia bakal nyalain yang baru dulu.
docker compose up -d --scale backend=3 --scale frontend=2 --remove-orphans --wait

echo "✅ Deployment successful! Current status:"
docker compose ps
