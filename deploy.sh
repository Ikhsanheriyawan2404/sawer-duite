docker compose pull

docker compose up -d --scale backend=3 --scale frontend=2 --no-recreate

docker compose ps
