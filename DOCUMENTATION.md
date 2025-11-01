# sequenceFlow Documentation

## Table of Contents
1. [Overview](#overview)
2. [Architecture](#architecture)
3. [Features](#features)
4. [Components](#components)
5. [Services](#services)
6. [State Management](#state-management)
7. [User Interface](#user-interface)
8. [API Integration](#api-integration)
9. [Notifications System](#notifications-system)
10. [Deployment](#deployment)
11. [Development Guide](#development-guide)

---

## Overview

**sequenceFlow** is a comprehensive task management application built with React and Vite. It provides advanced scheduling capabilities including task dependencies, Gantt chart visualization, Google Calendar synchronization, and browser-based notifications.

### Key Technologies
- **Frontend**: React 19.1.1 (functional components with hooks)
- **Build Tool**: Vite 7.1.7
- **Icons**: Lucide React
- **Styling**: Custom CSS with CSS variables
- **APIs**: Google Calendar API, Web Notifications API
- **Deployment**: GitHub Pages with automated CI/CD

### Design Philosophy
- **Local-First**: All data stored in browser state (no backend required)
- **Minimal Dependencies**: Custom components instead of heavy UI frameworks
- **Progressive Enhancement**: Features work without external APIs
- **Responsive**: Adapts to different screen sizes
- **Accessibility**: Semantic HTML and ARIA labels where needed

---

## Architecture

### Project Structure
```
sequenceFlow/
├── .github/
│   ├── workflows/
│   │   └── deploy.yml          # GitHub Actions deployment
│   └── copilot-instructions.md  # AI coding assistant guidance
├── public/
│   └── vite.svg                 # App icon
├── src/
│   ├── components/
│   │   ├── Button.jsx           # Reusable button component
│   │   └── TimeWheelPicker.jsx  # Scroll wheel time picker
│   ├── pages/
│   │   ├── TaskSchedulerPage.jsx  # Main task management
│   │   ├── CalendarPage.jsx       # Calendar view
│   │   └── ClockPage.jsx          # Live clock
│   ├── services/
│   │   ├── googleCalendar.js   # Google Calendar API integration
│   │   └── notifications.js    # Browser notifications service
│   ├── App.jsx                 # Root component with navigation
│   ├── index.css               # Global styles and utilities
│   └── main.jsx                # Application entry point
├── .env.local.example          # Environment variable template
├── .gitignore                  # Git ignore rules
├── DEPLOY.md                   # Deployment instructions
├── GOOGLE_CALENDAR_SETUP.md    # Google API setup guide
├── README.md                   # Project overview
├── eslint.config.js            # ESLint configuration
├── index.html                  # HTML entry point
├── package.json                # Dependencies and scripts
└── vite.config.js              # Vite configuration
```

### Data Flow
```
User Input → Component State → Lifted State (App.jsx)
                                     ↓
                              Task Scheduler ↔ Calendar View
                                     ↓
                              Services Layer
                                     ↓
                         External APIs / Browser APIs
```

---

## Features

### 1. Task Management

#### Task Types
**Continuous Tasks**
- Single time span with start datetime and duration
- Duration can be specified in minutes, hours, or days
- Displayed as continuous bars in Gantt chart
- Example: "Write report" from 9:00 AM for 3 hours

**Daily Window Tasks**
- Recurring task at specific time window each day
- Specify start date, daily start/end times, and number of days
- Displayed as segmented bars (one per day) in Gantt
- Example: "Exercise" from 6:00-7:00 PM for 7 days

#### Task Properties
```javascript
{
  id: number,                    // Unique identifier
  text: string,                  // Task description
  completed: boolean,            // Completion status
  createdAt: string,             // Creation timestamp
  mode: 'continuous' | 'daily',  // Task type
  startAt: string,               // ISO datetime (continuous)
  durationMinutes: number,       // Duration (continuous)
  firstDay: string,              // Start date (daily)
  daysCount: number,             // Number of days (daily)
  dailyStart: string,            // Daily start time HH:MM
  dailyEnd: string,              // Daily end time HH:MM
  deps: string[],                // Array of dependency task IDs
  groupId: string,               // Optional group assignment
  googleEventId: string          // Google Calendar event ID
}
```

#### Task Dependencies
- Tasks can depend on other tasks
- Dependent tasks cannot be completed until dependencies are done
- Start time auto-adjusts to prevent overlap with dependencies
- Visual indication with striped pattern in Gantt (blocked state)

#### Task Groups
- Organize related tasks into named groups
- Tasks can be assigned to groups via dropdown or inline chips
- Gantt chart displays tasks grouped with headers
- Ungrouped tasks appear in "Ungrouped" section
- Dependencies automatically suggest group assignment

### 2. Gantt Chart

#### Features
- **Hour-based scaling**: 6 pixels per hour for precise visualization
- **Timeline header**: Shows day numbers across the span
- **Continuous bars**: Solid bars for tasks with single time span
- **Segmented bars**: Multiple bars for daily window tasks
- **Color coding**:
  - Blue-purple gradient: Pending tasks
  - Green gradient: Completed tasks
  - Striped orange: Blocked by dependencies
- **Grouped display**: Tasks organized under group headers
- **Tooltips**: Hover for task details (name, time, duration)

#### Calculations
```javascript
// Position calculation
left = (taskStart - chartMinTime) / (1000*60*60) * unitHour
width = (taskDuration / 60) * unitHour

// Chart bounds
minDay = floor(min(all task start dates))
maxDay = floor(max(all task end dates))
totalDays = maxDay - minDay + 1
```

### 3. Calendar View

#### Features
- **Monthly grid**: 7-column (Sun-Sat) responsive layout
- **Task display**: Up to 3 task chips per day with overflow indicator
- **Task mapping**: Shows tasks on all days they span
- **Today highlighting**: Blue gradient background for current date
- **Navigation**: Previous/Next month, "Today" quick jump
- **Interactive cells**: Task count and list per day

#### Task Date Calculation
- **Continuous tasks**: Appears on all days from start to end
- **Daily tasks**: Appears on specified days with daily window
- **Timezone handling**: Uses local time consistently (no UTC conversion)

### 4. Time Wheel Picker

#### Features
- **Looped scrolling**: Infinite scroll in both directions
- **Mouse wheel input**: Natural scroll interaction
- **Button controls**: Up/down arrows for precise adjustment
- **Step intervals**: Minutes increment by 5 (configurable)
- **Visual feedback**: Centered selection with highlight overlay
- **Format**: 24-hour format with zero-padding

#### Implementation
```javascript
// Wheel uses large virtual index space for seamless looping
hourIdx = 24 * 1000 + actualHour  // Start at middle of range
normHour = ((idx % 24) + 24) % 24  // Wrap to 0-23

// Minutes work similarly
minuteIdx = minutes.length * 1000 + actualMinuteIndex
```

### 5. Google Calendar Integration

#### OAuth Flow
1. User clicks "Sign in with Google"
2. Google Identity Services loads OAuth consent screen
3. User grants calendar permissions
4. Access token stored in browser session
5. Token used for subsequent API calls

#### Export
- Creates Google Calendar events from tasks
- Continuous tasks → Single events
- Daily tasks → Recurring events with RRULE
- Color coding: Green (completed), Blue (pending)
- Stores event ID on task for future sync

#### Import
- Fetches events from primary calendar
- Time range: 1 month past to 2 months future
- Converts to continuous mode tasks
- Preserves event title and times
- Calculates duration from start/end

#### API Calls
```javascript
// Export
gapi.client.calendar.events.insert({
  calendarId: 'primary',
  resource: eventObject
})

// Import
gapi.client.calendar.events.list({
  calendarId: 'primary',
  timeMin: startDate.toISOString(),
  timeMax: endDate.toISOString(),
  singleEvents: true
})
```

### 6. Browser Notifications

#### Permission Handling
- Requests permission on first toggle
- Checks current permission state on load
- Visual indicator (bell icon) shows status
- Graceful degradation if not supported

#### Notification Types

**Upcoming Task Reminder**
- Triggered 5 minutes before task start
- Shows task name and countdown
- Scheduled automatically when tasks added
- Re-checks every 5 minutes

**Task Completed**
- Triggered when marking task complete
- Celebration emoji (🎉)
- Shows task name

**Task Added**
- Triggered when creating new task
- Shows task name and timing info
- Confirms successful creation

#### Scheduling Logic
```javascript
// Check tasks in next 60 minutes
const now = new Date();
const lookAhead = new Date(now.getTime() + 60 * 60 * 1000);

tasks.forEach(task => {
  if (taskStartTime > now && taskStartTime <= lookAhead) {
    scheduleNotification(task, 5); // 5 minutes before
  }
});
```

---

## Components

### App.jsx (Root Component)

**Responsibilities**:
- Application-level state (tasks, groups)
- Navigation management (active page)
- Google API initialization
- Notification permission management
- Navigation bar rendering

**State**:
```javascript
const [activePage, setActivePage] = useState("clock");
const [tasks, setTasks] = useState([]);
const [groups, setGroups] = useState([]);
const [googleSignedIn, setGoogleSignedIn] = useState(false);
const [notificationsEnabled, setNotificationsEnabled] = useState(false);
```

**Props Passed Down**:
- `TaskSchedulerPage`: tasks, setTasks, groups, setGroups, googleSignedIn
- `CalendarPage`: tasks (read-only)

### Button.jsx

**Purpose**: Reusable button with variant support

**Props**:
```javascript
{
  variant: 'default' | 'ghost' | 'outline' | 'danger',
  className: string,
  style: object,
  onClick: function,
  children: ReactNode
}
```

**Variants**:
- `default`: Solid blue background (`.btn`)
- `ghost`: Transparent with border (`.nav-btn`)
- `outline`: Blue border with transparent background (`.btn-outline`)
- `danger`: Red styling (for delete actions)

### TimeWheelPicker.jsx

**Purpose**: Scrollable time picker for hours and minutes

**Props**:
```javascript
{
  value: string,              // "HH:MM"
  onChange: function,         // (newValue: string) => void
  stepMinutes: number,        // Default: 5
  height: number,             // Default: 140px
  itemHeight: number          // Default: 28px
}
```

**Features**:
- Infinite scrolling in both directions
- Separate wheels for hours (0-23) and minutes
- Centered selection with visual highlight
- Mouse wheel and button controls
- Immediate callback on change

### TaskSchedulerPage.jsx

**Purpose**: Main task management interface

**Key Functions**:

**addTask()**
- Validates input
- Computes dependency-adjusted start time
- Creates task object (continuous or daily)
- Adds to tasks array
- Triggers notification
- Resets form

**toggleTask(taskId)**
- Checks dependency completion
- Updates completion status
- Triggers completion notification

**setTaskGroup(taskId, groupId)**
- Updates task's group assignment
- Used by inline chip toggles

**handleExportToGoogle()**
- Validates Google sign-in
- Calls export service
- Shows result summary

**handleImportFromGoogle()**
- Validates Google sign-in
- Calls import service
- Merges imported tasks with existing

**Computed Values**:
```javascript
const gantt = useMemo(() => {
  // Calculate min/max dates from all tasks
  // Compute chart dimensions
  // Return chart metadata
}, [tasks]);
```

### CalendarPage.jsx

**Purpose**: Monthly calendar view with task display

**Key Functions**:

**tasksByDate (useMemo)**
- Maps tasks to YYYY-MM-DD strings
- Handles both continuous and daily tasks
- Returns Map<string, Task[]>

**Calendar Cell Rendering**:
```javascript
// Generate grid cells
for (let i = 0; i < firstDay; i++) // Empty cells before month start
for (let day = 1; day <= daysInMonth; day++) // Day cells
// Render with task chips and overflow indicator
```

### ClockPage.jsx

**Purpose**: Live clock display

**Features**:
- Updates every second
- Shows current time and date
- Displays timezone
- Gradient card design

---

## Services

### googleCalendar.js

**Purpose**: Google Calendar API integration

**Key Functions**:

**initGoogleAPI(clientId)**
```javascript
// Loads Google API client
// Initializes OAuth2 token client
// Sets up discovery documents
// Returns promise
```

**signIn() / signOut()**
```javascript
// Manages OAuth flow
// Requests/revokes access tokens
// Updates authentication state
```

**exportTasksToGoogle(tasks)**
```javascript
// Converts tasks to Google Calendar events
// Handles continuous and daily modes
// Creates recurring events with RRULE
// Returns success/failure counts
```

**importEventsFromGoogle(startDate, endDate)**
```javascript
// Fetches events from primary calendar
// Converts to task format
// Calculates duration
// Returns task array
```

**Helper Functions**:
- `taskToGoogleEvent(task)`: Converts task to Calendar API format
- `parseTimeToMinutes(hhmm)`: Converts time string to minutes
- `listCalendars()`: Gets user's calendar list

### notifications.js

**Purpose**: Browser notification management

**Key Functions**:

**requestNotificationPermission()**
```javascript
// Checks browser support
// Requests permission if needed
// Returns boolean (granted/denied)
```

**showNotification(title, options)**
```javascript
// Creates native browser notification
// Sets icon, badge, body text
// Returns Notification object
```

**scheduleTaskNotification(task, minutesBefore)**
```javascript
// Calculates notification time
// Sets timeout for notification
// Returns timeout ID for cleanup
```

**checkUpcomingTasks(tasks, options)**
```javascript
// Scans tasks for upcoming starts
// Schedules notifications
// Returns array of scheduled notifications
```

**Notification Helpers**:
- `notifyTaskAdded(task)`: "New Task Added" notification
- `notifyTaskCompleted(task)`: "Task Completed 🎉" notification
- `areNotificationsEnabled()`: Permission check

---

## State Management

### Lifted State Pattern

**Tasks and Groups** are managed at the App level and passed down:

```javascript
// App.jsx
const [tasks, setTasks] = useState([]);
const [groups, setGroups] = useState([]);

// Pass to TaskSchedulerPage
<TaskSchedulerPage
  tasks={tasks}
  setTasks={setTasks}
  groups={groups}
  setGroups={setGroups}
/>

// Pass to CalendarPage (read-only)
<CalendarPage tasks={tasks} />
```

### Fallback Pattern

Components accept external state but fall back to local state:

```javascript
const useProvidedOrLocal = (data, setter, initial) => 
  (Array.isArray(data) && typeof setter === 'function') 
    ? [data, setter] 
    : useState(initial);

const [tasks, setTasks] = useProvidedOrLocal(extTasks, setExtTasks, []);
```

This allows components to work standalone or integrated.

### State Persistence

Currently **no persistence** - all state is in-memory:
- Tasks lost on page reload
- No backend or localStorage
- Can be extended with localStorage or backend API

---

## User Interface

### Styling System

**CSS Variables** (defined in `src/index.css`):
```css
:root {
  --color-primary: #2563eb;
  --color-primary-dark: #1e40af;
  --color-accent: #9333ea;
  --color-bg: #f8fafc;
  --color-surface: #ffffff;
  --color-border: #e5e7eb;
  --color-text: #111827;
  --color-text-light: #6b7280;
  --radius: 0.5rem;
  --shadow-sm: 0 1px 3px rgba(0, 0, 0, 0.05);
  --shadow-md: 0 3px 8px rgba(0, 0, 0, 0.1);
  --transition: all 0.25s ease;
}
```

**Utility Classes**:
- Layout: `.container`, `.flex`, `.grid`
- Cards: `.card`, `.shadow-sm`, `.shadow-md`
- Buttons: `.btn`, `.btn-outline`, `.nav-btn`
- Navigation: `.sticky-nav`
- Gantt: `.gantt`, `.gantt-row`, `.gantt-bar`
- Time Wheel: `.time-wheel`, `.wheel-col`

### Gradient Aesthetics

Consistent use of gradients for visual appeal:
```css
/* Backgrounds */
background: linear-gradient(135deg, #f8fafc 0%, #e0e7ff 100%);

/* Cards */
background: linear-gradient(135deg, #fff 0%, #f3f4f6 100%);

/* Stats cards */
background: linear-gradient(135deg, #eff6ff 0%, #dbeafe 100%); /* Blue */
background: linear-gradient(135deg, #ecfdf5 0%, #bbf7d0 100%); /* Green */
background: linear-gradient(135deg, #fff7ed 0%, #fed7aa 100%); /* Orange */

/* Gantt bars */
background: linear-gradient(90deg, #2563eb 0%, #9333ea 100%); /* Pending */
background: linear-gradient(90deg, #22c55e 0%, #16a34a 100%); /* Completed */
```

### Responsive Design

**Mobile Adaptations**:
```css
@media (max-width: 768px) {
  .grid-cols-7 { grid-template-columns: repeat(4, 1fr); }
  .container { padding: 1rem; }
  h1 { font-size: 1.75rem; }
}
```

**Touch-Friendly**:
- Large tap targets (min 44x44px)
- Adequate spacing between interactive elements
- Scroll areas for Gantt overflow

### Accessibility

- Semantic HTML (`<button>`, `<input>`, etc.)
- ARIA labels on icon-only buttons
- Focus visible styles
- Color contrast ratios meet WCAG AA
- Keyboard navigation support

---

## API Integration

### Google Calendar API

**Setup Requirements**:
1. Google Cloud Project
2. Calendar API enabled
3. OAuth 2.0 credentials
4. Authorized origins configured
5. Client ID in environment variable

**Scopes Required**:
```
https://www.googleapis.com/auth/calendar.events
```

**Rate Limits**:
- 1,000,000 queries per day (default)
- 10 queries per second per user

**Error Handling**:
```javascript
try {
  await exportTasksToGoogle(tasks);
} catch (error) {
  console.error('Export failed:', error);
  alert('Failed to export: ' + error.message);
}
```

### Web Notifications API

**Browser Support**:
- Chrome/Edge: Full support
- Firefox: Full support
- Safari: Full support (requires user interaction)
- Mobile: Limited support

**Permission States**:
- `default`: Not requested yet
- `granted`: User allowed
- `denied`: User blocked

**Best Practices**:
- Request permission in response to user action
- Provide clear explanation before requesting
- Respect user's decision
- Don't spam notifications

---

## Notifications System

### Architecture

```
User Action → Notification Service → Browser API
     ↓
Task State Update
     ↓
Check Upcoming Tasks (every 5 min)
     ↓
Schedule Notifications
```

### Notification Lifecycle

1. **Permission Request**:
   ```javascript
   const granted = await Notification.requestPermission();
   ```

2. **Task Check** (every 5 minutes):
   ```javascript
   useEffect(() => {
     const interval = setInterval(() => {
       checkUpcomingTasks(tasks);
     }, 5 * 60 * 1000);
     return () => clearInterval(interval);
   }, [tasks]);
   ```

3. **Notification Scheduling**:
   ```javascript
   const delay = notifyTime - now;
   setTimeout(() => {
     new Notification(title, options);
   }, delay);
   ```

4. **Display**:
   - Native OS notification
   - Auto-dismiss after ~5 seconds
   - Click to focus window (optional)

### Notification Content

**Structure**:
```javascript
{
  title: string,           // Main heading
  body: string,            // Detail text
  icon: string,            // Image URL
  badge: string,           // Small icon URL
  tag: string,             // Unique identifier (replace old)
  requireInteraction: boolean  // Stay until dismissed
}
```

**Examples**:
- "Upcoming Task: Write report" / "Starting in 5 minutes"
- "Task Completed! 🎉" / "Write report"
- "New Task Added" / "Write report\n2:00 PM - 5:00 PM"

---

## Deployment

### GitHub Pages

**Configuration**:
```javascript
// vite.config.js
export default defineConfig({
  base: '/sequenceFlow/',  // Repository name
  plugins: [react()],
})
```

**Build Process**:
1. `npm run build` - Creates `dist/` folder
2. Assets referenced with correct base path
3. GitHub Actions deploys to `gh-pages` branch

**Workflow** (`.github/workflows/deploy.yml`):
```yaml
on:
  push:
    branches: [master]
    
jobs:
  build-and-deploy:
    - Checkout code
    - Setup Node.js
    - Install dependencies
    - Build project
    - Deploy to GitHub Pages
```

**Environment Variables**:
- Not supported directly in GitHub Pages
- Users need to provide own Google Client ID
- Alternative: Use GitHub Secrets + inject at build time

### Alternative Platforms

**Vercel**:
- Automatic deployments from GitHub
- Environment variables support
- Custom domains
- Serverless functions (if needed)

**Netlify**:
- Drag-and-drop deployment
- Environment variables
- Form handling
- Edge functions

---

## Development Guide

### Getting Started

```bash
# Clone repository
git clone https://github.com/brianki254/sequenceFlow.git
cd sequenceFlow

# Install dependencies
npm install

# Start development server
npm run dev

# Open browser
# http://localhost:5173
```

### Environment Setup

```bash
# Copy example environment file
cp .env.local.example .env.local

# Edit .env.local and add your Google Client ID
VITE_GOOGLE_CLIENT_ID=your-client-id-here
```

### Development Workflow

1. **Create Feature Branch**:
   ```bash
   git checkout -b feature/my-feature
   ```

2. **Make Changes**:
   - Edit files
   - Test in browser
   - Check console for errors

3. **Lint Code**:
   ```bash
   npm run lint
   ```

4. **Build Test**:
   ```bash
   npm run build
   npm run preview
   ```

5. **Commit Changes**:
   ```bash
   git add .
   git commit -m "Add feature description"
   ```

6. **Push and Create PR**:
   ```bash
   git push origin feature/my-feature
   ```

### Code Style

**React Patterns**:
- Functional components only
- Hooks for state and effects
- Props destructuring
- Early returns for conditionals

**Naming Conventions**:
- Components: PascalCase (`TaskSchedulerPage.jsx`)
- Functions: camelCase (`addTask`, `toggleComplete`)
- Constants: UPPER_SNAKE_CASE (`SCOPES`, `DISCOVERY_DOC`)
- CSS classes: kebab-case (`.task-label`, `.gantt-row`)

**File Organization**:
- One component per file
- Related helpers in same file
- Services in `services/` directory
- Shared utilities could go in `utils/` (not yet created)

### Adding Features

**Example: Add Task Priority**

1. **Update Task Model**:
   ```javascript
   // TaskSchedulerPage.jsx
   const newTask = {
     // ...existing fields
     priority: 'medium', // 'low' | 'medium' | 'high'
   };
   ```

2. **Add UI Control**:
   ```jsx
   <select value={priority} onChange={e => setPriority(e.target.value)}>
     <option value="low">Low</option>
     <option value="medium">Medium</option>
     <option value="high">High</option>
   </select>
   ```

3. **Update Gantt Display**:
   ```javascript
   // Color based on priority
   const priorityColor = {
     low: '#6b7280',
     medium: '#2563eb',
     high: '#ef4444'
   };
   ```

4. **Test Changes**:
   - Create tasks with different priorities
   - Verify colors in Gantt
   - Check export to Google Calendar

### Debugging

**React DevTools**:
- Install browser extension
- Inspect component tree
- View props and state
- Track re-renders

**Console Logging**:
```javascript
// Add debug logs
console.log('Tasks:', tasks);
console.log('Gantt data:', gantt);
```

**Network Tab**:
- Monitor Google Calendar API calls
- Check request/response payloads
- Verify OAuth tokens

**Common Issues**:

1. **Tasks not displaying in calendar**:
   - Check date calculations
   - Verify timezone handling
   - Inspect tasksByDate map

2. **Google sign-in fails**:
   - Verify Client ID in .env.local
   - Check authorized origins in Google Console
   - Look for CORS errors

3. **Notifications not showing**:
   - Check permission status
   - Verify browser support
   - Look for console errors
   - Test with simple notification first

### Testing

Currently **no automated tests**, but recommended additions:

**Unit Tests** (Vitest):
```javascript
// Example: test date utilities
import { floorToMidnight, addDays } from './utils';

test('floorToMidnight removes time', () => {
  const date = new Date('2025-11-01T14:30:00');
  const result = floorToMidnight(date);
  expect(result.getHours()).toBe(0);
  expect(result.getMinutes()).toBe(0);
});
```

**Component Tests** (React Testing Library):
```javascript
import { render, screen, fireEvent } from '@testing-library/react';
import Button from './Button';

test('button calls onClick when clicked', () => {
  const handleClick = jest.fn();
  render(<Button onClick={handleClick}>Click me</Button>);
  fireEvent.click(screen.getByText('Click me'));
  expect(handleClick).toHaveBeenCalledTimes(1);
});
```

**E2E Tests** (Playwright):
```javascript
test('can create and complete task', async ({ page }) => {
  await page.goto('http://localhost:5173');
  await page.click('text=Tasks');
  await page.fill('input[placeholder="Enter a new task..."]', 'Test task');
  await page.click('button:has-text("Add Task")');
  await page.click('.task-card button'); // Toggle complete
  await expect(page.locator('.task-card')).toHaveClass(/completed/);
});
```

### Performance Optimization

**Current Optimizations**:
- `useMemo` for expensive Gantt calculations
- `useMemo` for tasksByDate map
- Conditional rendering (don't render hidden pages)

**Future Improvements**:
- Virtual scrolling for large task lists
- Debounce input handlers
- Lazy load Google API scripts
- Service worker for offline support
- IndexedDB for persistence

---

## Advanced Topics

### Custom Hooks

Could extract reusable logic:

```javascript
// useLocalStorage.js
export function useLocalStorage(key, initialValue) {
  const [value, setValue] = useState(() => {
    const stored = localStorage.getItem(key);
    return stored ? JSON.parse(stored) : initialValue;
  });

  useEffect(() => {
    localStorage.setItem(key, JSON.stringify(value));
  }, [key, value]);

  return [value, setValue];
}

// Usage in App.jsx
const [tasks, setTasks] = useLocalStorage('tasks', []);
```

### Backend Integration

To add persistence:

1. **Create API**:
   - Express.js or Fastify server
   - MongoDB or PostgreSQL database
   - RESTful or GraphQL endpoints

2. **Update Services**:
   ```javascript
   // services/api.js
   export async function fetchTasks() {
     const response = await fetch('/api/tasks');
     return response.json();
   }

   export async function createTask(task) {
     const response = await fetch('/api/tasks', {
       method: 'POST',
       headers: { 'Content-Type': 'application/json' },
       body: JSON.stringify(task),
     });
     return response.json();
   }
   ```

3. **Update Components**:
   ```javascript
   useEffect(() => {
     fetchTasks().then(setTasks);
   }, []);

   const addTask = async () => {
     const newTask = { /* ... */ };
     const saved = await createTask(newTask);
     setTasks(prev => [saved, ...prev]);
   };
   ```

### Multi-User Support

Would require:
- User authentication (OAuth, JWT)
- User-scoped data
- Sharing/collaboration features
- Real-time sync (WebSockets)

### Mobile App

Could create with:
- **React Native**: Reuse React components
- **Capacitor**: Wrap web app as native
- **PWA**: Progressive Web App with offline support

---

## Troubleshooting

### Common Issues

**1. Blank page on load**
- Check browser console for errors
- Verify all imports are correct
- Ensure `index.html` has `<div id="root">`
- Try clearing cache and hard reload

**2. Tasks not saving**
- State is in-memory only (by design)
- Use localStorage or backend for persistence
- Check React DevTools for state updates

**3. Gantt chart not displaying**
- Ensure tasks have `startAt` and `durationMinutes`
- Check that `gantt` computed value is not null
- Verify CSS classes are loaded
- Inspect element dimensions

**4. Google Calendar sync fails**
- Verify API is enabled in Google Console
- Check OAuth scopes include calendar.events
- Ensure authorized origins match your domain
- Look for CORS errors in console
- Try signing out and back in

**5. Notifications not working**
- Check permission status in browser settings
- Verify browser supports Notifications API
- Ensure HTTPS (required for some browsers)
- Look for console errors
- Test with simple notification first

**6. GitHub Pages 404**
- Verify `base` path in vite.config.js
- Check GitHub Pages is enabled
- Ensure deploy workflow ran successfully
- Wait 2-3 minutes for propagation
- Try hard refresh (Ctrl+Shift+R)

### Getting Help

**Resources**:
- GitHub Issues: Report bugs or request features
- Documentation: This file and others in repository
- Browser DevTools: Inspect errors and network calls
- React Docs: https://react.dev
- Vite Docs: https://vitejs.dev

**Reporting Bugs**:
Include:
- Steps to reproduce
- Expected vs actual behavior
- Browser and version
- Console errors
- Screenshots if applicable

---

## Future Enhancements

### Planned Features
- [ ] Task persistence (localStorage or backend)
- [ ] Task search and filtering
- [ ] Task tags and categories
- [ ] Recurring task templates
- [ ] Time tracking
- [ ] Task notes and attachments
- [ ] Drag-and-drop task reordering
- [ ] Gantt zoom levels
- [ ] Export to PDF
- [ ] Dark mode
- [ ] Keyboard shortcuts
- [ ] Undo/redo

### Integration Ideas
- Slack notifications
- Email reminders
- Apple Calendar sync
- Outlook Calendar sync
- Trello import
- Asana import
- GitHub Issues integration
- Time tracking apps (Toggl, etc.)

### UX Improvements
- Onboarding tutorial
- Empty state illustrations
- Drag-to-resize Gantt bars
- Task templates
- Batch operations
- Advanced filters
- Custom views
- Analytics dashboard

---

## Contributing

### How to Contribute

1. **Fork the repository**
2. **Create a feature branch**
3. **Make your changes**
4. **Write tests** (if applicable)
5. **Update documentation**
6. **Submit pull request**

### Contribution Guidelines

- Follow existing code style
- Add comments for complex logic
- Update README if adding features
- Test thoroughly before submitting
- One feature per PR
- Write descriptive commit messages

### Code of Conduct

- Be respectful and inclusive
- Provide constructive feedback
- Focus on the code, not the person
- Welcome newcomers
- Report inappropriate behavior

---

## License

This project is open source and available under the MIT License.

---

## Acknowledgments

- **React Team**: For the amazing framework
- **Vite Team**: For blazing fast build tool
- **Lucide**: For beautiful icons
- **Google**: For Calendar API
- **GitHub**: For hosting and CI/CD

---

## Contact

- **Repository**: https://github.com/brianki254/sequenceFlow
- **Issues**: https://github.com/brianki254/sequenceFlow/issues
- **Live Demo**: https://brianki254.github.io/sequenceFlow/

---

**Last Updated**: November 1, 2025
**Version**: 1.0.0
**Documentation Version**: 1.0
