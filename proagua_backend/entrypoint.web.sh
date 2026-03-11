#!/bin/sh
set -e

# Tann PostgreSQL prè avan migrasyons
echo "Ap tann PostgreSQL ($POSTGRES_HOST:$POSTGRES_PORT)..."
until nc -z "${POSTGRES_HOST:-db}" "${POSTGRES_PORT:-5432}"; do
  echo "PostgreSQL pa prè — ap tann 2 segond..."
  sleep 2
done
echo "PostgreSQL prè!"

python manage.py migrate --noinput
python manage.py collectstatic --noinput

exec gunicorn proagua_backend.wsgi:application --bind 0.0.0.0:8000 --workers 3
