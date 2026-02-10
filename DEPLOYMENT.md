
# Deployment Guide (Vercel)

This application is designed to be deployed on **Vercel** with **Vercel Postgres**.

## Prerequisites
1. Vercel Account.
2. GitHub/GitLab/Bitbucket repository.

## Steps

1. **Push to Git**
   - Push this code to a new repository.

2. **Import to Vercel**
   - Go to Vercel Dashboard -> Add New -> Project.
   - Import your repository.

3. **Configure Project**
   - **Framework Preset**: `Vite`.
   - **Build Command**: `npm run build` (Default).
   - **Output Directory**: `dist` (Default).
   - **Install Command**: `npm install` (Default).

4. **Add Database (Vercel Postgres)**
   - In the Vercel Project Dashboard, go to **Storage**.
   - Click **Connect Store** -> **Postgres**.
   - Create a new database (e.g., `cipherchat-db`).
   - This will automatically add `POSTGRES_URL`, `POSTGRES_USER`, etc., to your Environment Variables.

5. **Add Environment Variables**
   - Go to **Settings** -> **Environment Variables**.
   - Add `JWT_SECRET`: Generate a long random string (e.g., `openssl rand -hex 32`).

6. **Deploy**
   - Click **Deploy**.

7. **Initialize Database**
   - Once deployed, you need to run the SQL migration.
   - Go to your Vercel Project -> **Storage** -> **Postgres** -> **Query**.
   - Copy the content of `migrations/001_initial_schema.sql`.
   - Paste it into the Query runner and execute it.

8. **Done!**
   - Your secure chat app is now live.

## Local Development

1. **Install Dependencies**
   ```bash
   npm install
   ```

2. **Environment Setup**
   - Create `.env` file:
     ```
     POSTGRES_URL="postgres://user:pass@host:5432/db"
     JWT_SECRET="local-secret"
     ```

3. **Run**
   ```bash
   npm run dev
   ```
   - Frontend: http://localhost:5173
   - Backend: http://localhost:3001
   - Proxy: Configured in `vite.config.ts`.
