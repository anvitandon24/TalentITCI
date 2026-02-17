# Deploy TalentITCI (Free)

Step-by-step guide to deploy the full stack for free.

---

## What You'll Deploy

| Component | Platform | Free Tier |
|-----------|-----------|-----------|
| Database | Render PostgreSQL | 90 days free |
| Backend | Render Web Service | 750 hrs/mo |
| Frontend | Vercel | Free |

---

## Step 1: Push to GitHub

If not already done:

```bash
cd /Users/harmantaj/Downloads/TalentITCI-main
git add .
git commit -m "Add deployment config"
git push origin main
```

---

## Step 2: Create Accounts (free)

1. **Render** – https://render.com → Sign up (GitHub)
2. **Vercel** – https://vercel.com → Sign up (GitHub)

---

## Step 3: Deploy Backend + Database on Render

1. Go to https://dashboard.render.com
2. Click **New** → **Blueprint**
3. Connect your GitHub repo (`TalentITCI-main` or your repo name)
4. Render will detect `render.yaml` and show:
   - 1 PostgreSQL database
   - 1 Web Service (backend)
5. Click **Apply**
6. After deploy, open the **backend** service → **Environment**
7. Add these variables (click **Add Environment Variable**):

   | Key | Value |
   |-----|-------|
   | `OPENROUTER_API_KEY` | Your key from `.env` |
   | `OPENROUTER_API_KEY_CHAT` | Same or different key |
   | `GOOGLE_CLIENT_ID` | From `.env` |
   | `GOOGLE_CLIENT_SECRET` | From `.env` |

8. **Leave `CORS_ORIGINS` empty for now** – you'll add it after Step 4.
9. Copy your backend URL (e.g. `https://talentitci-backend.onrender.com`)

---

## Step 4: Deploy Frontend on Vercel

1. Go to https://vercel.com/new
2. Import your GitHub repo
3. Set **Root Directory** to `frontend`
4. Add **Environment Variable**:
   - Name: `VITE_API_URL`
   - Value: `https://YOUR-BACKEND-URL.onrender.com` (from Step 3)
5. Click **Deploy**
6. Copy your frontend URL (e.g. `https://talentitci.vercel.app`)

---

## Step 5: Add CORS and Google OAuth

1. **Render** → Backend service → **Environment**
   - Add: `CORS_ORIGINS` = `https://your-frontend.vercel.app` (your actual Vercel URL)
   - Save (Render will redeploy)

2. **Google Cloud Console** – https://console.cloud.google.com/apis/credentials
   - Edit your OAuth 2.0 Client
   - **Authorized JavaScript origins**: add `https://your-frontend.vercel.app`
   - **Authorized redirect URIs**: add `https://your-frontend.vercel.app` (or `/` if needed)
   - Save

---

## Step 6: First Login

The Blueprint runs `seed_data.py` on deploy, which creates:

| Email | Password | Role |
|-------|----------|------|
| admin@talentai.com | Test1234 | admin |
| hr@talentai.com | Test1234 | hr |
| joe@test.com | Test1234 | candidate |

**Log in as HR:** `hr@talentai.com` / `Test1234`

To change the seed password, add `SEED_PASSWORD` in Render → Backend → Environment before first deploy.

---

## Troubleshooting

| Issue | Fix |
|-------|-----|
| CORS errors | Ensure `CORS_ORIGINS` in Render matches your Vercel URL exactly (no trailing slash) |
| 401 on login | Check `JWT_SECRET` is set (Render generates one; or add your own) |
| Backend sleeps | Render free tier spins down after ~15 min idle; first request may take 30–60s |
| Google login fails | Add Vercel URL to Google OAuth authorized origins |

---

## Optional: Use Neon for Free PostgreSQL (Long-term)

Render PostgreSQL is free for 90 days. For indefinite free DB:

1. Create project at https://neon.tech
2. Copy connection string
3. Render → Backend → Environment → set `DATABASE_URL` to Neon URL (overrides Blueprint)
4. Remove or ignore the Render database from the Blueprint
