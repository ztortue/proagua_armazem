# proagua3

## Deploy on Render (Docker)

This repository includes a `render.yaml` blueprint for:
- Django API (`proagua-backend`)
- Next.js frontend (`proagua-frontend`)
- Celery worker (`proagua-celery-worker`)
- Celery beat (`proagua-celery-beat`)
- Redis + PostgreSQL managed services

### Required environment variables (manual on Render)

Set these in Render before first production deploy:
- `SECRET_KEY`
- `ALLOWED_HOSTS`
- `CORS_ALLOWED_ORIGINS`
- `CSRF_TRUSTED_ORIGINS`
- `NEXT_PUBLIC_API_BASE_URL` (example: `https://proagua-backend.onrender.com/api`)

The following are wired automatically by `render.yaml`:
- `DATABASE_URL` from managed PostgreSQL
- `REDIS_URL` from managed Redis
- `CELERY_BROKER_URL` / `CELERY_RESULT_BACKEND` from managed Redis

### Notes

- Backend startup runs `migrate` and `collectstatic` automatically via `proagua_backend/entrypoint.web.sh`.
- Backend static files are served with WhiteNoise.
- If your frontend and backend are on different Render domains, keep CORS/CSRF values aligned.

