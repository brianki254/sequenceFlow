/**
 * Google Calendar API Integration Service
 * 
 * Setup Instructions:
 * 1. Go to https://console.cloud.google.com/
 * 2. Create a new project or select existing
 * 3. Enable Google Calendar API
 * 4. Create OAuth 2.0 credentials (Web application)
 * 5. Add authorized origins: http://localhost:5173
 * 6. Add authorized redirect URIs: http://localhost:5173
 * 7. Copy Client ID and create .env.local file:
 *    VITE_GOOGLE_CLIENT_ID=your_client_id_here
 */

const SCOPES = 'https://www.googleapis.com/auth/calendar.events';
const DISCOVERY_DOC = 'https://www.googleapis.com/discovery/v1/apis/calendar/v3/rest';

let gapiInited = false;
let tokenClient = null;

/**
 * Initialize Google API client
 */
export async function initGoogleAPI(clientId) {
  if (!clientId) {
    throw new Error('Google Client ID not configured. Please set VITE_GOOGLE_CLIENT_ID in .env.local');
  }

  return new Promise((resolve, reject) => {
    // Load gapi
    window.gapi.load('client', async () => {
      try {
        await window.gapi.client.init({
          apiKey: '', // Not needed for OAuth flow
          discoveryDocs: [DISCOVERY_DOC],
        });
        gapiInited = true;

        // Initialize Google Identity Services
        tokenClient = window.google.accounts.oauth2.initTokenClient({
          client_id: clientId,
          scope: SCOPES,
          callback: '', // Will be set per-request
        });

        resolve();
      } catch (error) {
        reject(error);
      }
    });
  });
}

/**
 * Request access token and sign in
 */
export function signIn() {
  return new Promise((resolve, reject) => {
    if (!tokenClient) {
      reject(new Error('Google API not initialized'));
      return;
    }

    tokenClient.callback = async (response) => {
      if (response.error) {
        reject(response);
      } else {
        resolve(response);
      }
    };

    if (window.gapi.client.getToken() === null) {
      tokenClient.requestAccessToken({ prompt: 'consent' });
    } else {
      tokenClient.requestAccessToken({ prompt: '' });
    }
  });
}

/**
 * Sign out and revoke token
 */
export function signOut() {
  const token = window.gapi.client.getToken();
  if (token !== null) {
    window.google.accounts.oauth2.revoke(token.access_token);
    window.gapi.client.setToken('');
  }
}

/**
 * Check if user is signed in
 */
export function isSignedIn() {
  return window.gapi?.client?.getToken() !== null;
}

/**
 * Convert app task to Google Calendar event
 */
function taskToGoogleEvent(task) {
  if (task.mode === 'daily') {
    // Daily window tasks - create recurring event
    const first = new Date(task.firstDay + 'T00:00:00');
    const startDateTime = new Date(first.getTime() + parseTimeToMinutes(task.dailyStart) * 60000);
    const endDateTime = new Date(first.getTime() + parseTimeToMinutes(task.dailyEnd) * 60000);
    const lastDay = new Date(first.getTime() + (Number(task.daysCount) - 1) * 24 * 60 * 60000);

    return {
      summary: task.text,
      description: `Created from sequenceFlow (ID: ${task.id})`,
      start: {
        dateTime: startDateTime.toISOString(),
        timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone,
      },
      end: {
        dateTime: endDateTime.toISOString(),
        timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone,
      },
      recurrence: task.daysCount > 1 ? [
        `RRULE:FREQ=DAILY;COUNT=${task.daysCount}`
      ] : undefined,
      colorId: task.completed ? '10' : '9', // Green if completed, blue otherwise
    };
  } else {
    // Continuous tasks
    const start = new Date(task.startAt);
    const end = new Date(start.getTime() + (task.durationMinutes || 0) * 60000);

    return {
      summary: task.text,
      description: `Created from sequenceFlow (ID: ${task.id})`,
      start: {
        dateTime: start.toISOString(),
        timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone,
      },
      end: {
        dateTime: end.toISOString(),
        timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone,
      },
      colorId: task.completed ? '10' : '9',
    };
  }
}

function parseTimeToMinutes(hhmm) {
  const [hh, mm] = (hhmm || "00:00").split(":").map(n => parseInt(n || 0, 10));
  return (hh * 60) + (mm || 0);
}

/**
 * Export tasks to Google Calendar
 */
export async function exportTasksToGoogle(tasks) {
  if (!gapiInited) {
    throw new Error('Google API not initialized');
  }

  const results = {
    success: 0,
    failed: 0,
    errors: [],
  };

  for (const task of tasks) {
    if (!task.startAt && task.mode !== 'daily') continue; // Skip tasks without dates

    try {
      const event = taskToGoogleEvent(task);
      await window.gapi.client.calendar.events.insert({
        calendarId: 'primary',
        resource: event,
      });
      results.success++;
    } catch (error) {
      results.failed++;
      results.errors.push({ task: task.text, error: error.message });
    }
  }

  return results;
}

/**
 * Import events from Google Calendar
 */
export async function importEventsFromGoogle(startDate, endDate) {
  if (!gapiInited) {
    throw new Error('Google API not initialized');
  }

  try {
    const response = await window.gapi.client.calendar.events.list({
      calendarId: 'primary',
      timeMin: startDate.toISOString(),
      timeMax: endDate.toISOString(),
      showDeleted: false,
      singleEvents: true,
      maxResults: 250,
      orderBy: 'startTime',
    });

    const events = response.result.items || [];
    const tasks = [];

    events.forEach((event, index) => {
      if (!event.start.dateTime && !event.start.date) return;

      const start = new Date(event.start.dateTime || event.start.date);
      const end = new Date(event.end.dateTime || event.end.date);
      const durationMin = Math.round((end - start) / (1000 * 60));

      // Convert to local datetime string for input
      const toLocalDateTimeValue = (d) => {
        const dt = new Date(d.getTime() - d.getTimezoneOffset() * 60000);
        return dt.toISOString().slice(0, 16);
      };

      tasks.push({
        id: Date.now() + index,
        text: event.summary || 'Untitled Event',
        completed: false,
        createdAt: new Date().toLocaleString(),
        mode: 'continuous',
        startAt: toLocalDateTimeValue(start),
        durationMinutes: durationMin,
        deps: [],
        groupId: '',
        googleEventId: event.id, // Store for future sync
      });
    });

    return tasks;
  } catch (error) {
    throw new Error(`Failed to import: ${error.message}`);
  }
}

/**
 * Get list of user's calendars
 */
export async function listCalendars() {
  if (!gapiInited) {
    throw new Error('Google API not initialized');
  }

  try {
    const response = await window.gapi.client.calendar.calendarList.list();
    return response.result.items || [];
  } catch (error) {
    throw new Error(`Failed to list calendars: ${error.message}`);
  }
}
