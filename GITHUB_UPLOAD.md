# GitHub Upload Instructions

Your project has been initialized with git and committed locally. Follow these steps to upload to GitHub:

## Option 1: Using GitHub CLI (Recommended - Fastest)

### Step 1: Authenticate with GitHub
```bash
gh auth login
```
- Select: **GitHub.com**
- Select: **HTTPS**
- Authenticate: **Login with a web browser**
- Copy the one-time code shown
- Press Enter to open browser and paste the code

### Step 2: Create Repository and Push
```bash
gh repo create sequenceFlow --public --source=. --remote=origin --push
```

Or for a private repository:
```bash
gh repo create sequenceFlow --private --source=. --remote=origin --push
```

**Done!** Your repository will be created and code pushed automatically.

### View Your Repository
```bash
gh repo view --web
```

---

## Option 2: Using GitHub Website (Manual)

### Step 1: Create Repository on GitHub
1. Go to https://github.com/new
2. Repository name: `sequenceFlow`
3. Description: `Task scheduler with Gantt chart, Google Calendar sync, and browser notifications`
4. Choose **Public** or **Private**
5. **Do NOT** initialize with README, .gitignore, or license (we already have these)
6. Click **Create repository**

### Step 2: Add Remote and Push
GitHub will show you commands. Use these (replace YOUR_USERNAME):

```bash
git remote add origin https://github.com/YOUR_USERNAME/sequenceFlow.git
git branch -M main
git push -u origin main
```

---

## What's Been Done

✅ Git repository initialized
✅ All files staged
✅ Initial commit created with message:
   "Initial commit: sequenceFlow - Task scheduler with Gantt chart, Google Calendar sync, and notifications"
✅ .gitignore updated to exclude .env.local (keeps your API keys safe)
✅ 23 files ready to push

## Project Features Included

- ✅ Task scheduler with dependencies
- ✅ Gantt chart with hour-based scaling
- ✅ Daily time window tasks
- ✅ Group management
- ✅ Google Calendar integration
- ✅ Browser notifications
- ✅ Time wheel picker
- ✅ Calendar view with task display
- ✅ Complete setup documentation

## After Pushing

### Add Repository Details (Optional)
Edit your repository on GitHub:
- Add topics: `react`, `vite`, `task-management`, `gantt-chart`, `calendar`
- Add website URL if you deploy it
- Update description if needed

### Deploy (Optional)
Deploy to Vercel, Netlify, or GitHub Pages:

**Vercel** (recommended for Vite):
```bash
npm install -g vercel
vercel
```

**Netlify**:
```bash
npm install -g netlify-cli
netlify deploy
```

---

## Important Notes

⚠️ **Environment Variables**: Your `.env.local` file is NOT pushed (protected by .gitignore)
   - When deploying, set `VITE_GOOGLE_CLIENT_ID` in your hosting platform
   - See `GOOGLE_CALENDAR_SETUP.md` for Google API setup

⚠️ **Before Deploying**: Update authorized origins in Google Cloud Console to include your production domain

## Quick Reference

Current branch: `master`
Commit count: 1
Files tracked: 23
Files ignored: node_modules, dist, .env.local

Need help? Open an issue on GitHub or check the README.md
