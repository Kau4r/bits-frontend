# Deploy — bits-frontend

Short checklist for pushing the React app to production.

## Prerequisites

- Node 22+ installed on the build host
- `.env.production` populated with:
  - `VITE_API_URL` — the prod backend origin (e.g. `https://api.bits.example.com`)
  - `VITE_WS_URL` — the prod WebSocket origin (e.g. `wss://api.bits.example.com`)
- A static host / CDN ready to serve `dist/` (Nginx, Netlify, Vercel, S3+CloudFront, etc.)

## Deploy steps

```bash
# 1. Pull latest
git pull origin main

# 2. Install dependencies
npm ci

# 3. Build the production bundle
npm run build

# 4. Upload dist/ to your static host
#    Examples:
#      rsync -az --delete dist/ user@prod:/var/www/bits/
#      aws s3 sync dist/ s3://bits-frontend --delete
#      netlify deploy --prod --dir=dist
```

## SPA routing

The app uses React Router (client-side routing), so the host must rewrite unknown paths to `index.html`. Examples:

- **Nginx**: `try_files $uri $uri/ /index.html;`
- **Netlify**: already handled by the build output.
- **S3 + CloudFront**: set the default root object to `index.html` and add a custom error response mapping 404 → `/index.html`.

## Rollback

Keep the previous `dist/` build on the host (or your CDN versioning), and swap the symlink / invalidate the cache back to the older version if the new one breaks.
