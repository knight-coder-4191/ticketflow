# TicketFlow Cloud Deployment Guide

This guide provides step-by-step instructions to deploy **TicketFlow** to the cloud so anyone can access it over the public internet with HTTPS.

---

## Deployment Architecture Options

| Option | Hosting Platform | Database | Cost | Recommended For |
| :--- | :--- | :--- | :--- | :--- |
| **Option 1 (Recommended)** | **Render** (Unified Web Service) | MongoDB Atlas or Embedded | **100% Free** | Fastest 1-click deployment with a single public URL |
| **Option 2** | **Railway / Fly.io** (Docker) | MongoDB Atlas | Free Trial | Containerized microservice setup |
| **Option 3** | **Render (API) + Vercel (UI)** | MongoDB Atlas | **100% Free** | Decoupled client-server architecture |

---

## Step 1: Push Project to GitHub

Before deploying to Render, Vercel, or Railway, your code needs to be in a GitHub repository:

1. Go to [github.com/new](https://github.com/new) and create a repository named `ticketflow` (select **Public** or **Private**).
2. If you have Git installed:
   ```bash
   cd C:\Users\acer\.gemini\antigravity\scratch\ticketflow
   git init
   git add .
   git commit -m "Initial release of TicketFlow MERN support ticket management"
   git branch -M main
   git remote add origin https://github.com/<your-username>/ticketflow.git
   git push -u origin main
   ```
3. **Alternative without Git CLI:**
   * Download or zip the `ticketflow` folder.
   * On your GitHub repo page, click **Add file** $\rightarrow$ **Upload files**, drag and drop the files, and click **Commit changes**.

---

## Step 2: (Optional) Set up Free MongoDB Atlas Database

TicketFlow already includes an embedded document engine, so MongoDB Atlas is optional. To use a cloud MongoDB cluster:

1. Create a free account at [mongodb.com/cloud/atlas](https://www.mongodb.com/cloud/atlas).
2. Create a free **M0 (Shared)** cluster.
3. Under **Database Access**, create a database user (e.g., username: `ticketflow_admin`, password: `<your-password>`).
4. Under **Network Access**, add IP `0.0.0.0/0` (Allow access from anywhere).
5. Click **Connect** $\rightarrow$ **Drivers** $\rightarrow$ Copy the connection string:
   ```text
   mongodb+srv://ticketflow_admin:<password>@cluster0.abcde.mongodb.net/ticketflow?retryWrites=true&w=majority
   ```

---

## Step 3: Deploy to Render (1-Click, Free & Easy)

1. Sign up or log in at [render.com](https://render.com).
2. Click **New +** $\rightarrow$ **Web Service**.
3. Connect your GitHub account and select your `ticketflow` repository.
4. Configure the settings:
   * **Name:** `ticketflow` (or any unique name)
   * **Region:** Closest to you (e.g., Singapore, Frankfurt, Oregon)
   * **Runtime:** `Node`
   * **Build Command:** `npm install`
   * **Start Command:** `npm start`
   * **Instance Type:** `Free`
5. Click **Advanced** $\rightarrow$ **Add Environment Variable**:
   * `NODE_ENV` = `production`
   * `JWT_SECRET` = `<any-random-secure-string>`
   * `MONGODB_URI` = `<your-mongodb-atlas-uri-if-using-atlas>` (leave blank to use built-in store)
6. Click **Create Web Service**.

Render will automatically build and launch your application. Once finished, you will receive a live URL:
👉 **`https://ticketflow.onrender.com`**

---

## Step 4: Verify Your Deployment

Once deployed:
1. Open your live URL in your browser.
2. The initial demo data (`admin@ticketflow.com`, `agent@ticketflow.com`, `customer@ticketflow.com`) is auto-seeded on first run.
3. Test raising a ticket, logging in as an agent, and viewing the administrator analytics dashboard.
