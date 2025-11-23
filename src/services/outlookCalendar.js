import { PublicClientApplication, InteractionRequiredAuthError } from '@azure/msal-browser';
import { Client } from '@microsoft/microsoft-graph-client';
import { AuthCodeMSALBrowserAuthenticationProvider } from '@microsoft/microsoft-graph-client/authProviders/authCodeMsalBrowser';

// MSAL configuration
const msalConfig = {
  auth: {
    clientId: import.meta.env.VITE_MICROSOFT_CLIENT_ID || '',
    authority: 'https://login.microsoftonline.com/common',
    redirectUri: window.location.origin + window.location.pathname,
  },
  cache: {
    cacheLocation: 'sessionStorage',
    storeAuthStateInCookie: false,
  },
};

// Microsoft Graph scopes for calendar access
const SCOPES = ['calendars.readwrite', 'user.read'];

let msalInstance;
let graphClient;
let authProvider;

/**
 * Initialize Microsoft Graph API with MSAL authentication
 */
export async function initOutlookAPI() {
  try {
    if (!import.meta.env.VITE_MICROSOFT_CLIENT_ID) {
      console.warn('Microsoft Client ID not found. Outlook integration disabled.');
      return false;
    }

    // Create MSAL instance
    msalInstance = new PublicClientApplication(msalConfig);
    await msalInstance.initialize();

    // Create auth provider
    authProvider = new AuthCodeMSALBrowserAuthenticationProvider(msalInstance, {
      account: msalInstance.getActiveAccount(),
      scopes: SCOPES,
      interactionType: 'popup',
    });

    // Create Graph client
    graphClient = Client.initWithMiddleware({
      authProvider: authProvider,
    });

    return true;
  } catch (error) {
    console.error('Failed to initialize Microsoft Graph API:', error);
    return false;
  }
}

/**
 * Sign in to Microsoft account
 */
export async function signInToOutlook() {
  try {
    const loginRequest = {
      scopes: SCOPES,
    };

    const response = await msalInstance.loginPopup(loginRequest);
    
    if (response.account) {
      msalInstance.setActiveAccount(response.account);
      
      // Update auth provider with new account
      authProvider = new AuthCodeMSALBrowserAuthenticationProvider(msalInstance, {
        account: response.account,
        scopes: SCOPES,
        interactionType: 'popup',
      });

      // Recreate Graph client with new auth provider
      graphClient = Client.initWithMiddleware({
        authProvider: authProvider,
      });

      return true;
    }
    return false;
  } catch (error) {
    console.error('Outlook sign-in failed:', error);
    throw error;
  }
}

/**
 * Sign out from Microsoft account
 */
export async function signOutFromOutlook() {
  try {
    const account = msalInstance.getActiveAccount();
    if (account) {
      await msalInstance.logoutPopup({
        account: account,
      });
    }
    return true;
  } catch (error) {
    console.error('Outlook sign-out failed:', error);
    throw error;
  }
}

/**
 * Check if user is signed in to Outlook
 */
export function isSignedInToOutlook() {
  return msalInstance && msalInstance.getActiveAccount() !== null;
}

/**
 * Convert app task to Microsoft Graph event format
 */
function taskToGraphEvent(task) {
  const event = {
    subject: task.text,
    body: {
      contentType: 'text',
      content: `Task created in sequenceFlow\nCompleted: ${task.completed ? 'Yes' : 'No'}`,
    },
    isAllDay: false,
    showAs: task.completed ? 'free' : 'busy',
    categories: ['sequenceFlow'],
  };

  if (task.mode === 'continuous') {
    const startDate = new Date(task.startAt);
    const endDate = new Date(startDate.getTime() + task.durationMinutes * 60000);

    event.start = {
      dateTime: startDate.toISOString(),
      timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone,
    };
    event.end = {
      dateTime: endDate.toISOString(),
      timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone,
    };
  } else if (task.mode === 'daily') {
    // For daily tasks, create a recurring event
    const firstDay = new Date(task.firstDay);
    const dailyStartMinutes = parseTimeToMinutes(task.dailyStart);
    const dailyEndMinutes = parseTimeToMinutes(task.dailyEnd);
    
    const startDateTime = new Date(firstDay);
    startDateTime.setHours(Math.floor(dailyStartMinutes / 60), dailyStartMinutes % 60, 0, 0);
    
    const endDateTime = new Date(firstDay);
    endDateTime.setHours(Math.floor(dailyEndMinutes / 60), dailyEndMinutes % 60, 0, 0);

    event.start = {
      dateTime: startDateTime.toISOString(),
      timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone,
    };
    event.end = {
      dateTime: endDateTime.toISOString(),
      timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone,
    };

    // Add recurrence pattern for daily tasks
    const lastDay = new Date(firstDay);
    lastDay.setDate(lastDay.getDate() + task.daysCount - 1);

    event.recurrence = {
      pattern: {
        type: 'daily',
        interval: 1,
      },
      range: {
        type: 'endDate',
        startDate: firstDay.toISOString().split('T')[0],
        endDate: lastDay.toISOString().split('T')[0],
      },
    };
  }

  return event;
}

/**
 * Parse time string (HH:MM) to minutes
 */
function parseTimeToMinutes(timeStr) {
  const [hours, minutes] = timeStr.split(':').map(Number);
  return hours * 60 + minutes;
}

/**
 * Export tasks to Outlook Calendar
 */
export async function exportTasksToOutlook(tasks) {
  if (!isSignedInToOutlook()) {
    throw new Error('Not signed in to Outlook');
  }

  let successCount = 0;
  let errorCount = 0;
  const errors = [];

  for (const task of tasks) {
    try {
      const event = taskToGraphEvent(task);
      
      // Create event in Outlook
      const createdEvent = await graphClient.api('/me/events').post(event);
      
      if (createdEvent.id) {
        successCount++;
        // Note: You might want to store the Outlook event ID on the task
        // task.outlookEventId = createdEvent.id;
      }
    } catch (error) {
      console.error(`Failed to export task "${task.text}":`, error);
      errorCount++;
      errors.push({ task: task.text, error: error.message });
    }
  }

  return {
    success: successCount,
    errors: errorCount,
    details: errors,
  };
}

/**
 * Import events from Outlook Calendar
 */
export async function importEventsFromOutlook(startDate, endDate) {
  if (!isSignedInToOutlook()) {
    throw new Error('Not signed in to Outlook');
  }

  try {
    const start = startDate.toISOString();
    const end = endDate.toISOString();

    // Get events from Outlook Calendar
    const response = await graphClient
      .api('/me/events')
      .filter(`start/dateTime ge '${start}' and end/dateTime le '${end}'`)
      .select('id,subject,start,end,body,categories,isAllDay,recurrence')
      .top(1000)
      .get();

    const events = response.value || [];
    const importedTasks = [];

    events.forEach(event => {
      // Skip all-day events and events not from sequenceFlow
      if (event.isAllDay || !event.categories?.includes('sequenceFlow')) {
        // Convert regular events to tasks
        const startTime = new Date(event.start.dateTime);
        const endTime = new Date(event.end.dateTime);
        const durationMinutes = Math.round((endTime - startTime) / (1000 * 60));

        const task = {
          id: Date.now() + Math.random(), // Generate unique ID
          text: event.subject || 'Imported from Outlook',
          completed: false,
          createdAt: new Date().toISOString(),
          mode: 'continuous',
          startAt: startTime.toISOString(),
          durationMinutes: durationMinutes,
          deps: [],
          outlookEventId: event.id,
        };

        importedTasks.push(task);
      }
    });

    return importedTasks;
  } catch (error) {
    console.error('Failed to import from Outlook:', error);
    throw error;
  }
}

/**
 * Get user's Outlook profile information
 */
export async function getOutlookProfile() {
  if (!isSignedInToOutlook()) {
    throw new Error('Not signed in to Outlook');
  }

  try {
    const profile = await graphClient.api('/me').get();
    return {
      name: profile.displayName,
      email: profile.mail || profile.userPrincipalName,
    };
  } catch (error) {
    console.error('Failed to get Outlook profile:', error);
    throw error;
  }
}

/**
 * Get list of user's calendars
 */
export async function listOutlookCalendars() {
  if (!isSignedInToOutlook()) {
    throw new Error('Not signed in to Outlook');
  }

  try {
    const response = await graphClient.api('/me/calendars').get();
    return response.value.map(calendar => ({
      id: calendar.id,
      name: calendar.name,
      isPrimary: calendar.isDefaultCalendar,
    }));
  } catch (error) {
    console.error('Failed to list Outlook calendars:', error);
    throw error;
  }
}