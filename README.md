# Placement Stats IIT Patna 🎓

A modern, high-performance campus recruitment statistics and visualization dashboard built for **IIT Patna**. Features real-time placement analytics, branch-wise metrics, offer type classifications (FTE, PPO, 6M+PPO), and a secure, private administrative console for dynamic batch, branch, and company data entry.

---

## 🌟 Key Features

### 📊 Public Dashboard
- **Top Recruitment KPIs**:
  - **Companies Visited**: Unique count of participating organizations.
  - **Total Offers**: Aggregate offers released across all offer categories.
  - **Students Placed**: Headcount of placed students with real-time placement percentage progress bar.
  - **Average CTC (₹ LPA)**: Mathematically weighted compensation mean.
  - **Median CTC (₹ LPA)**: True 50th-percentile package.
  - **Highest CTC (₹ LPA)**: Peak compensation package.
  - **Eligible Pool**: Total registered students across disciplines.
- **Offer Type Breakdown Cards**: Direct Full-Time (`FTE`), Pre-Placement Offers (`PPO`), and `6-Month Intern + PPO`.
- **Branch-Wise Performance Chart**: Dual-axis visualization showing placement rate (%) and average CTC per discipline.
- **CTC Distribution Chart**: Salary bracket donut chart (< 6 LPA, 6–10 LPA, 10–18 LPA, 18–30 LPA, 30+ LPA Super Dream).
- **Branch-Wise Performance Table**: Full breakdown including Eligible, Total Offers, Placed, Placement %, Average CTC, Median CTC, and Highest CTC.

### 🔒 Private Admin Portal
- **Hidden Access**: Only accessible via `#admin` (or the discrete lock in the footer).
- **Passcode-Protected**: Default passcode: `admin123`. The portal always requires authentication upon visiting or page refresh.
- **Change Admin Passcode**: Built-in option to update the administrative passcode securely.
- **Manual Data Insertion**:
  - Company Name, Role / Profile, CTC (in LPA), Offer Type (`FTE`, `PPO`, `6M+PPO`).
  - Dynamic branch-wise hires counter grid.
- **Dynamic Batches & Branches**:
  - Add any academic year batch (e.g. `2025-2026`, `2026-2027`).
  - Add any branch dynamically (e.g. `CSE`, `AI & DS`, `MNC`, `ECE`, `EE`, `ME`, `CE`, `EP`, `CBE`, `MME`) with custom student capacities.
  - One-click **"Load Preset Branches"** for IIT Patna departments.
- **Real-Time Calculation**: Every change immediately updates overall and branch-wise placement percentages, medians, and averages.

---

## 🛠️ Technology Stack

- **Frontend**: React 19, Vite, Tailwind CSS v4, Recharts, Lucide Icons
- **Backend**: Node.js, Express.js
- **Database**: SQLite3 (embedded file-based database)

---

## 💻 Local Development

### 1. Prerequisites
- [Node.js](https://nodejs.org/) (v18 or higher recommended)
- [Git](https://git-scm.com/)

### 2. Installation
```bash
# Clone the repository
git clone <your-repo-url>
cd placement_stats

# Install dependencies (automatically installs client dependencies via postinstall)
npm install
```

### 3. Run Development Server
```bash
npm run dev
```
- Frontend: `http://localhost:3000`
- Backend API: `http://127.0.0.1:5001`
- Admin Portal: `http://localhost:3000/#admin` (Passcode: `admin123`)

---

## 🚀 How to Host Online (Deployment Guide)

You can easily deploy this project online for **free** on **Render** or **Railway**.

### Option A: Deploy on Render.com (Recommended & Free)

1. **Push your code to GitHub**:
   ```bash
   git add .
   git commit -m "Initial commit of Placement Stats IIT Patna"
   git branch -M main
   git remote add origin https://github.com/<your-username>/placement_stats.git
   git push -u origin main
   ```

2. **Create a Web Service on Render**:
   - Go to [render.com](https://render.com/) and sign in with GitHub.
   - Click **New +** → **Web Service**.
   - Select your `placement_stats` GitHub repository.

3. **Configure the Web Service**:
   - **Name**: `placement-stats-iitp` (or any name you prefer)
   - **Runtime**: `Node`
   - **Build Command**: `npm install && npm run build`
   - **Start Command**: `npm start`
   - **Instance Type**: `Free`

4. **Deploy**:
   - Click **Create Web Service**.
   - Render will automatically clone your repo, install dependencies, build the frontend React application, and start the Node server.
   - Once deployed, your site will be live at `https://your-service-name.onrender.com`!

---

### Option B: Deploy on Railway.app

1. Go to [railway.app](https://railway.app/) and sign in with GitHub.
2. Click **New Project** → **Deploy from GitHub repo**.
3. Select your `placement_stats` repository.
4. Railway will automatically detect Node.js, run `npm install && npm run build`, and execute `npm start`.
5. Under service settings, click **Generate Domain** to get your public HTTPS URL.

---

## 🔐 Administrative Access & Security

- **Access URL**: Append `#admin` to your domain (e.g. `https://your-app.onrender.com/#admin`) or click the discreet lock icon in the footer.
- **Initial Passcode**: `admin123`
- **Change Passcode**: Once unlocked, navigate to the **Change Passcode** tab to set your own private administrative password.
