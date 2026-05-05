# Insighta Web Portal

Static browser portal for Insighta Labs+. It includes login, dashboard metrics, profile listing with filters and pagination, natural language search, profile details, CSV export, and an account view.

## Local run

Any static server works:

```bash
python -m http.server 5173
```

Open `http://localhost:5173` and make sure the backend `Auth__WebPortalUrl` is set to the same origin.

## Configuration

For Docker, set `INSIGHTA_BACKEND_URL` in the parent `.env`; the container writes `config.js` from that value when it starts. For a plain static local run, edit `config.js` or inject `window.INSIGHTA_BACKEND_URL` before loading `app.js`.

Required backend settings:

```bash
Auth__WebPortalUrl=https://your-web-url.com
Auth__BackendPublicUrl=https://your-backend-url.com
INSIGHTA_BACKEND_URL=https://your-backend-url.com
ALLOWED_ORIGINS=https://your-web-url.com
```
