# PhysicsAR — Физика Зертханасы

An augmented reality physics laboratory app.

## Deploy to Vercel

### 1. Deploy

```bash
npx vercel deploy
```

Or connect the repository at [vercel.com](https://vercel.com) and deploy from the dashboard.

### 2. Setup Vercel KV

1. Go to your project in the Vercel dashboard
2. Open the **Storage** tab
3. Click **Create Database** and choose **KV**
4. Link the KV store to your project — Vercel will auto-populate `KV_REST_API_URL` and `KV_REST_API_TOKEN`

### 3. Add Environment Variables

In the Vercel dashboard under **Settings → Environment Variables**, add:

| Variable | Description |
|---|---|
| `OPENAI_API_KEY` | Your OpenAI API key (`sk-...`) |
| `JWT_SECRET` | Random 32-character secret for signing tokens |

Copy `.env.example` to `.env.local` for local development:

```bash
cp .env.example .env.local
# then fill in the values
```

## Local Development

```bash
# Install Vercel CLI
npm i -g vercel

# Link project and pull env vars
vercel link
vercel env pull .env.local

# Run dev server
vercel dev
```
