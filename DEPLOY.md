# Deploying sequenceFlow to GitHub Pages

Your app is now configured for GitHub Pages! Here's how to deploy:

## Quick Deploy

### Option 1: Automatic Deployment (Recommended)

1. **Enable GitHub Pages** in your repository:
   - Go to: https://github.com/brianki254/sequenceFlow/settings/pages
   - Source: **GitHub Actions**
   - Click **Save**

2. **Push your changes**:
   ```bash
   git add .
   git commit -m "Configure for GitHub Pages deployment"
   git push origin master
   ```

3. **Wait for deployment** (2-3 minutes)
   - Check: https://github.com/brianki254/sequenceFlow/actions
   - Once complete, visit: **https://brianki254.github.io/sequenceFlow/**

### Option 2: Manual Deployment

```bash
npm run deploy
```

This builds and deploys directly to the `gh-pages` branch.

---

## What Was Changed

✅ **vite.config.js**: Added `base: '/sequenceFlow/'` for proper asset paths
✅ **package.json**: Added deploy script
✅ **GitHub Actions**: Created workflow for automatic deployment
✅ **gh-pages**: Installed deployment package

---

## Your App URLs

- **Production**: https://brianki254.github.io/sequenceFlow/
- **Repository**: https://github.com/brianki254/sequenceFlow

---

## Google Calendar Setup for Production

After deployment, update your Google Cloud Console:

1. Go to: https://console.cloud.google.com/
2. Select your project
3. Go to **APIs & Services** → **Credentials**
4. Edit your OAuth 2.0 Client ID
5. Add to **Authorized JavaScript origins**:
   ```
   https://brianki254.github.io
   ```
6. Add to **Authorized redirect URIs**:
   ```
   https://brianki254.github.io/sequenceFlow/
   ```
7. **Save**

Then set your environment variable in GitHub:
1. Go to: https://github.com/brianki254/sequenceFlow/settings/secrets/actions
2. Click **New repository secret**
3. Name: `VITE_GOOGLE_CLIENT_ID`
4. Value: Your Client ID from Google Console
5. Click **Add secret**

**Note**: For GitHub Pages, you'll need to update the workflow to use the secret, or users will need to configure their own API key.

---

## Testing Locally with Production Build

```bash
npm run build
npm run preview
```

Visit: http://localhost:4173/sequenceFlow/

---

## Troubleshooting

### Assets not loading (404 errors)
- Verify `base: '/sequenceFlow/'` in vite.config.js
- Check browser console for path errors
- Clear browser cache

### Deployment fails
- Check GitHub Actions tab for error logs
- Verify GitHub Pages is enabled with "GitHub Actions" source
- Ensure all files are committed and pushed

### Google Sign-In not working
- Add production URLs to authorized origins in Google Console
- Check browser console for CORS errors
- Verify Client ID is set (users will need to configure their own)

---

## Custom Domain (Optional)

To use a custom domain:

1. Add `CNAME` file to `/public/` with your domain
2. Update `base: '/'` in vite.config.js
3. Configure DNS records with your domain provider
4. Update Google Console authorized origins

---

## Next Steps

1. Push changes to trigger deployment
2. Enable GitHub Pages in repository settings
3. Wait 2-3 minutes for first deployment
4. Visit your live app!
5. Update Google Console with production URLs
6. Share your app URL

**Your app will auto-deploy** on every push to master branch! 🚀
