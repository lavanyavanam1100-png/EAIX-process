# Deployment Guide: EAIX Process Application

## Problem Summary
**Why login is failing on Vercel:**
1. Only the frontend was deployed - the backend API is not running on production
2. Frontend is trying to call `http://localhost:3001` (development fallback) which doesn't exist
3. Missing Vercel environment variable configuration for `NEXT_PUBLIC_API_BASE_URL`

---

## Deployment Architecture

```
┌─ Vercel Project 1: Frontend (Web App)
│  ├─ Deploys: apps/web
│  ├─ Environment Variable: NEXT_PUBLIC_API_BASE_URL = {API_URL}
│  └─ URL: https://eaix-process-web.vercel.app
│
└─ Vercel Project 2: Backend (NestJS API) - MISSING ❌
   ├─ Deploys: apps/api
   ├─ Environment Variable: CORS_ORIGIN = {FE_URL}
   ├─ Environment Variable: PORT = 3001
   └─ URL: https://eaix-process-api.vercel.app
```

---

## Step-by-Step Fix

### Step 1: Deploy the API Backend

1. **Create a new Vercel project for the API:**
   - Go to https://vercel.com/new
   - Import from GitHub: `lavanyavanam1100-png/EAIX-process`
   - Select `Root Directory`: Click "Edit" and select `apps/api`
   - Name: `eaix-process-api`
   - Framework Preset: Other
   - Build Command: `pnpm build`
   - Start Command: `node dist/main`

2. **Set Environment Variables for API:**
   - In Vercel Project Settings → Environment Variables, add:
     ```
     PORT = 3001
     CORS_ORIGIN = https://YOUR_FRONTEND_URL.vercel.app
     NODE_ENV = production
     ```

3. **Deploy:**
   - Click "Deploy"
   - Wait for deployment to complete
   - Note the deployment URL (e.g., `https://eaix-process-api.vercel.app`)

---

### Step 2: Update Frontend Environment Variables

1. **Go to your Frontend Vercel Project** (eaix-process-web)
2. **Settings → Environment Variables**
3. **Add/Update:**
   ```
   NEXT_PUBLIC_API_BASE_URL = https://eaix-process-api.vercel.app
   NODE_ENV = production
   ```

4. **Redeploy Frontend:**
   - Go to Deployments
   - Click the latest deployment →  "Redeploy"
   - Or push a new commit to trigger automatic deployment

---

### Step 3: Verify Deployment

1. **Test the Frontend:**
   - Navigate to https://eaix-process-web.vercel.app
   - You should see the login page

2. **Test Login:**
   - Use credentials: 
     - Username: `admin` (or any seeded user)
     - Role: `ADMIN` (or `DEVELOPER`, `REVIEWER`)
     - Password: `password` (default seed)

3. **Check Console for Errors:**
   - Open browser DevTools (F12)
   - Check Console and Network tabs
   - Verify API calls are going to the correct API URL

---

## Troubleshooting

### Issue: "Cannot reach API" or CORS errors

**Solution:**
1. Verify API URL is correct in Vercel Environment Variables
2. Check API CORS_ORIGIN is set to your frontend URL
3. Ensure API deployment is successful (check Vercel API project logs)

### Issue: API returns 500 error

**Solution:**
1. Check API logs in Vercel (Deployments → Logs)
2. Verify environment variables are set
3. Check database connection (MySQL or in-memory fallback)

### Issue: "Module not found" errors

**Solution:**
- Ensure all dependencies are in package.json
- Run `pnpm install` locally first to verify
- Check node_modules is not in git ignore for Vercel build

---

## Quick Reference: Environment Variables

### Frontend (.env.production - on Vercel)
```
NEXT_PUBLIC_API_BASE_URL=https://eaix-process-api.vercel.app
NODE_ENV=production
```

### Backend (.env - on Vercel)
```
PORT=3001
CORS_ORIGIN=https://eaix-process-web.vercel.app
NODE_ENV=production
```

---

## Local Testing (Before Deployment)

Verify everything works locally first:

```bash
# Terminal 1: API
cd apps/api
CORS_ORIGIN=http://localhost:3002 pnpm dev

# Terminal 2: Frontend
cd apps/web
NEXT_PUBLIC_API_BASE_URL=http://localhost:3001 pnpm dev

# Terminal 3: Full stack (from root)
pnpm dev
```

Then test login at http://localhost:3002

---

## Additional Notes

- **Database:** Backend uses MySQL or in-memory fallback. Ensure database is accessible or in-memory mode is enabled.
- **Large Files:** `.tools/node-v22.23.0-win-x64` (82 MB) is tracked in git. Consider using `.gitignore` for future commits.
- **Vercel Limits:** Serverless functions have 12-second timeout. Long-running operations may need optimization.
- **Secrets:** Never commit `.env` files. Use Vercel's Environment Variables feature for sensitive data.

---

## Success Checklist

- [ ] API deployed to Vercel
- [ ] Frontend environment variable `NEXT_PUBLIC_API_BASE_URL` set
- [ ] API environment variable `CORS_ORIGIN` set
- [ ] Frontend redeployed after env var changes
- [ ] Login works on deployed frontend URL
- [ ] Can upload files and create content
- [ ] Dashboard displays content correctly

