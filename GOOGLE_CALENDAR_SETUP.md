# Google Calendar Integration Setup Guide

This guide will help you set up Google Calendar API integration for sequenceFlow.

## Prerequisites
- A Google Account
- Node.js and npm installed
- sequenceFlow project running locally

## Step 1: Create Google Cloud Project

1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Click **Select a project** → **NEW PROJECT**
3. Enter a project name (e.g., "sequenceFlow Calendar Sync")
4. Click **CREATE**

## Step 2: Enable Google Calendar API

1. In your project, go to **APIs & Services** → **Library**
2. Search for "Google Calendar API"
3. Click on it and press **ENABLE**

## Step 3: Create OAuth 2.0 Credentials

1. Go to **APIs & Services** → **Credentials**
2. Click **CREATE CREDENTIALS** → **OAuth client ID**
3. If prompted, configure the OAuth consent screen:
   - User Type: **External**
   - App name: `sequenceFlow`
   - User support email: Your email
   - Developer contact: Your email
   - Click **SAVE AND CONTINUE**
   - Scopes: Click **ADD OR REMOVE SCOPES**, search for "Google Calendar API", select `.../auth/calendar.events`, click **UPDATE**
   - Test users: Add your Google account email
   - Click **SAVE AND CONTINUE**

4. Back in Credentials, click **CREATE CREDENTIALS** → **OAuth client ID**
5. Application type: **Web application**
6. Name: `sequenceFlow Web Client`
7. **Authorized JavaScript origins:**
   - Add: `http://localhost:5173`
   - Add: `http://localhost:5174` (backup port)
8. **Authorized redirect URIs:**
   - Add: `http://localhost:5173`
   - Add: `http://localhost:5174`
9. Click **CREATE**
10. **Copy the Client ID** (looks like: `123456789-abcdefg.apps.googleusercontent.com`)

## Step 4: Configure Your App

1. In your project root, create a file named `.env.local`:

```bash
VITE_GOOGLE_CLIENT_ID=YOUR_CLIENT_ID_HERE
```

2. Replace `YOUR_CLIENT_ID_HERE` with the Client ID you copied

3. **Important:** Add `.env.local` to your `.gitignore` to keep credentials secure:

```bash
echo ".env.local" >> .gitignore
```

## Step 5: Restart Development Server

```bash
npm run dev
```

## How to Use

### Sign In
1. Click **"Sign in with Google"** button in the top navigation
2. Select your Google account
3. Grant calendar permissions

### Export Tasks
1. Make sure you're signed in
2. Go to the Tasks page
3. Click **Export** button in the top-right
4. Your tasks will be created as events in your Google Calendar

### Import Events
1. Make sure you're signed in
2. Go to the Tasks page
3. Click **Import** button in the top-right
4. Events from the past month to 2 months ahead will be imported as tasks

## Features

### Export Behavior
- **Continuous tasks**: Created as single events with start time and duration
- **Daily window tasks**: Created as recurring events for the specified days
- **Completed tasks**: Show as green in Google Calendar
- **Pending tasks**: Show as blue in Google Calendar

### Import Behavior
- Imports events from 1 month ago to 2 months ahead
- Converts to continuous mode tasks with calculated duration
- Preserves event titles and times

## Troubleshooting

### "Sign in with Google" button doesn't appear
- Check that `VITE_GOOGLE_CLIENT_ID` is set in `.env.local`
- Restart the dev server after adding the environment variable
- Check browser console for initialization errors

### "Failed to sign in with Google"
- Verify your email is added as a test user in OAuth consent screen
- Clear browser cookies and try again
- Check that authorized origins include `http://localhost:5173`

### "Failed to export/import"
- Make sure you're signed in
- Check that Google Calendar API is enabled in your project
- Verify OAuth scopes include `https://www.googleapis.com/auth/calendar.events`
- Try signing out and back in

### Tasks not appearing in Google Calendar
- Check your primary Google Calendar (not shared calendars)
- Events may take a few seconds to sync
- Verify task has a start date/time set

## Security Notes

- **Never commit `.env.local`** to version control
- Client ID is safe to use in client-side code (it's public)
- OAuth 2.0 flow securely handles authentication
- Access tokens are stored in browser session only
- Consider publishing your OAuth consent screen if deploying publicly

## Production Deployment

For production deployment:

1. Add your production domain to authorized origins and redirect URIs
2. Set `VITE_GOOGLE_CLIENT_ID` environment variable on your hosting platform
3. Consider publishing your OAuth consent screen (removes "unverified app" warning)

## Additional Resources

- [Google Calendar API Documentation](https://developers.google.com/calendar/api/guides/overview)
- [OAuth 2.0 for Client-side Web Applications](https://developers.google.com/identity/protocols/oauth2/javascript-implicit-flow)
- [Google Cloud Console](https://console.cloud.google.com/)
