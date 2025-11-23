# Microsoft Azure & Outlook Calendar Setup Guide

This guide will help you set up Microsoft Graph API integration to sync with Outlook Calendar.

## Prerequisites

- Microsoft account (personal or work/school)
- Access to Azure Portal
- sequenceFlow application

## Step-by-Step Setup

### 1. Create Azure Application

1. **Go to Azure Portal**
   - Visit https://portal.azure.com
   - Sign in with your Microsoft account

2. **Navigate to App registrations**
   - Search for "App registrations" in the search bar
   - Click on "App registrations"

3. **Create New Registration**
   - Click "New registration"
   - Fill in the details:
     - **Name**: `sequenceFlow Calendar Integration`
     - **Supported account types**: Select "Accounts in any organizational directory (Any Azure AD directory - Multitenant) and personal Microsoft accounts (e.g. Skype, Xbox)"
     - **Redirect URI**: Select "Single-page application (SPA)" and enter:
       - For local development: `http://localhost:5173`
       - For production: `https://yourusername.github.io/sequenceFlow/`
   - Click "Register"

### 2. Configure Application

1. **Note the Application (client) ID**
   - Copy the "Application (client) ID" from the Overview page
   - You'll need this for your environment variable

2. **Add Redirect URIs** (if needed)
   - Go to "Authentication" in the left sidebar
   - Under "Single-page application", add additional redirect URIs:
     - `http://localhost:5173/` (local development)
     - `https://yourusername.github.io/sequenceFlow/` (production)
   - Click "Save"

3. **Configure API Permissions**
   - Go to "API permissions" in the left sidebar
   - Click "Add a permission"
   - Select "Microsoft Graph"
   - Choose "Delegated permissions"
   - Add these permissions:
     - `Calendars.ReadWrite` - Read and write user calendars
     - `User.Read` - Sign in and read user profile
   - Click "Add permissions"
   - **Important**: Click "Grant admin consent" if you're an admin, or ask your admin to approve

### 3. Environment Configuration

1. **Create .env.local file** (if it doesn't exist)
   ```bash
   cp .env.local.example .env.local
   ```

2. **Add your Microsoft Client ID**
   ```
   # .env.local
   VITE_GOOGLE_CLIENT_ID=your-google-client-id-here
   VITE_MICROSOFT_CLIENT_ID=your-microsoft-client-id-here
   ```

3. **Replace with your actual Application ID**
   - Use the Application (client) ID from Step 2.1

### 4. Test the Integration

1. **Start Development Server**
   ```bash
   npm run dev
   ```

2. **Test Sign-In**
   - Open http://localhost:5173
   - Click "Sign in with Outlook"
   - You should see Microsoft's consent screen
   - Grant permissions for calendar access

3. **Test Export/Import**
   - Create some tasks
   - Click "Export" under Outlook section
   - Check your Outlook Calendar for new events
   - Try importing existing events

## Production Deployment

### GitHub Pages Configuration

1. **Update Redirect URIs**
   - Go back to Azure Portal > App registrations > your app
   - Go to "Authentication"
   - Add production URL: `https://yourusername.github.io/sequenceFlow/`

2. **Environment Variables**
   - GitHub Pages doesn't support server-side environment variables
   - Users will need to provide their own Microsoft Client ID
   - Consider creating a setup guide for users

### Alternative: GitHub Secrets (Advanced)

1. **Add Secret to Repository**
   - Go to GitHub repository settings
   - Navigate to "Secrets and variables" > "Actions"
   - Add `VITE_MICROSOFT_CLIENT_ID` with your client ID

2. **Update Workflow** (in `.github/workflows/deploy.yml`)
   ```yaml
   - name: Build
     run: npm run build
     env:
       VITE_MICROSOFT_CLIENT_ID: ${{ secrets.VITE_MICROSOFT_CLIENT_ID }}
   ```

## API Permissions Explained

| Permission | Scope | Why Needed |
|------------|--------|------------|
| `Calendars.ReadWrite` | Delegated | Export tasks to calendar, import calendar events |
| `User.Read` | Delegated | Get user profile information for display |

## Security Best Practices

1. **Keep Client ID Secure**
   - Don't commit `.env.local` to version control
   - Use different apps for development/production
   - Regularly rotate credentials if compromised

2. **Minimal Permissions**
   - Only request necessary permissions
   - Don't request admin permissions unless required

3. **Redirect URI Validation**
   - Only add trusted domains to redirect URIs
   - Use HTTPS for production deployments

## Troubleshooting

### "AADSTS50011: The reply URL specified in the request does not match..."

**Solution**: Add your current URL to redirect URIs in Azure Portal

**Check**:
- Exact URL match (including trailing slash)
- Protocol (http vs https)
- Port number for localhost

### "Insufficient privileges to complete the operation"

**Solution**: Check API permissions and admin consent

**Steps**:
1. Go to Azure Portal > API permissions
2. Verify `Calendars.ReadWrite` is present
3. Click "Grant admin consent for [tenant]"
4. Or ask your admin to approve permissions

### "Application is not supported over http"

**Solution**: Use HTTPS or configure for localhost

**For development**:
- Azure allows localhost over HTTP
- Ensure redirect URI is exactly `http://localhost:5173`

### Sign-in popup blocked

**Solution**: Check browser popup settings

**Steps**:
1. Allow popups for your domain
2. Try disabling popup blockers temporarily
3. Use incognito/private mode for testing

### Events not appearing in calendar

**Solution**: Check calendar permissions and sync

**Steps**:
1. Verify export completed without errors
2. Check Outlook/Office 365 web interface
3. Allow 1-2 minutes for sync
4. Check correct calendar (events go to primary calendar)

## Feature Differences: Outlook vs Google Calendar

| Feature | Google Calendar | Outlook Calendar |
|---------|----------------|------------------|
| Recurring Events | ✓ RRULE supported | ✓ Recurrence pattern supported |
| Color Coding | ✓ Event colors | ✓ Categories |
| Time Zones | ✓ Full support | ✓ Full support |
| All-day Events | ✓ Supported | ✓ Supported |
| Multiple Calendars | ✓ Calendar selection | ✓ Primary calendar only |

## Need Help?

1. **Azure Documentation**: https://docs.microsoft.com/azure/active-directory/develop/
2. **Microsoft Graph API**: https://docs.microsoft.com/graph/api/overview
3. **MSAL.js Documentation**: https://docs.microsoft.com/azure/active-directory/develop/msal-js-initializing-client-applications

---

**Last Updated**: November 23, 2025
**Compatible with**: Microsoft Graph v1.0