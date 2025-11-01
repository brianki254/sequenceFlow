import { useState, useEffect } from "react";
import { ListTodo, Clock, Calendar, LogIn, LogOut, Bell, BellOff } from "lucide-react";
import Button from "./components/Button";
import TaskSchedulerPage from "./pages/TaskSchedulerPage";
import ClockPage from "./pages/ClockPage";
import CalendarPage from "./pages/CalendarPage";
import { initGoogleAPI, signIn, signOut, isSignedIn } from "./services/googleCalendar";
import { requestNotificationPermission, areNotificationsEnabled, checkUpcomingTasks } from "./services/notifications";

export default function App() {
  const [activePage, setActivePage] = useState("clock");
  // Lifted app-level state so Calendar can see scheduled tasks
  const [tasks, setTasks] = useState([]);
  const [groups, setGroups] = useState([]);
  const [googleSignedIn, setGoogleSignedIn] = useState(false);
  const [googleInitialized, setGoogleInitialized] = useState(false);
  const [notificationsEnabled, setNotificationsEnabled] = useState(false);

  // Initialize Google API on mount
  useEffect(() => {
    const clientId = import.meta.env.VITE_GOOGLE_CLIENT_ID;
    if (clientId) {
      // Load Google API scripts
      const gapiScript = document.createElement('script');
      gapiScript.src = 'https://apis.google.com/js/api.js';
      gapiScript.async = true;
      gapiScript.defer = true;
      document.body.appendChild(gapiScript);

      const gsiScript = document.createElement('script');
      gsiScript.src = 'https://accounts.google.com/gsi/client';
      gsiScript.async = true;
      gsiScript.defer = true;
      document.body.appendChild(gsiScript);

      gapiScript.onload = async () => {
        try {
          await initGoogleAPI(clientId);
          setGoogleInitialized(true);
          setGoogleSignedIn(isSignedIn());
        } catch (error) {
          console.error('Failed to initialize Google API:', error);
        }
      };
    }

    // Check notification permission
    setNotificationsEnabled(areNotificationsEnabled());
  }, []);

  // Check for upcoming tasks and schedule notifications
  useEffect(() => {
    if (!notificationsEnabled || tasks.length === 0) return;

    const scheduledNotifications = checkUpcomingTasks(tasks, {
      lookAheadMinutes: 60,
      notifyBeforeMinutes: 5,
    });

    // Check every 5 minutes
    const interval = setInterval(() => {
      checkUpcomingTasks(tasks, {
        lookAheadMinutes: 60,
        notifyBeforeMinutes: 5,
      });
    }, 5 * 60 * 1000);

    return () => {
      clearInterval(interval);
      scheduledNotifications.forEach(({ timeoutId }) => clearTimeout(timeoutId));
    };
  }, [tasks, notificationsEnabled]);

  const handleGoogleSignIn = async () => {
    try {
      await signIn();
      setGoogleSignedIn(true);
    } catch (error) {
      console.error('Sign in failed:', error);
      alert('Failed to sign in with Google');
    }
  };

  const handleGoogleSignOut = () => {
    signOut();
    setGoogleSignedIn(false);
  };

  const handleToggleNotifications = async () => {
    if (notificationsEnabled) {
      // Can't programmatically disable, user must do it in browser settings
      alert('To disable notifications, please use your browser settings');
    } else {
      const granted = await requestNotificationPermission();
      setNotificationsEnabled(granted);
      if (!granted) {
        alert('Notification permission denied. Enable it in your browser settings to receive task reminders.');
      }
    }
  };

  return (
    <div style={{ minHeight: '100vh', background: 'var(--color-bg)' }}>
      <div className="card sticky-nav">
        <div className="container">
          <div className="flex gap-2" style={{ justifyContent: 'space-between', alignItems: 'center' }}>
            <div className="flex gap-2">
              <Button
                variant={activePage === "tasks" ? "default" : "ghost"}
                onClick={() => setActivePage("tasks")}
                className="nav-btn"
                style={activePage === "tasks" ? {
                  background: '#2563eb',
                  color: '#fff',
                  fontWeight: 700,
                  boxShadow: 'var(--shadow-md)',
                  border: 'none'
                } : {}}
              >
                <ListTodo size={18} /> Tasks
              </Button>
            <Button
              variant={activePage === "clock" ? "default" : "ghost"}
              onClick={() => setActivePage("clock")}
              className="nav-btn"
              style={activePage === "clock" ? {
                background: '#2563eb',
                color: '#fff',
                fontWeight: 700,
                boxShadow: 'var(--shadow-md)',
                border: 'none'
              } : {}}
            >
              <Clock size={18} /> Clock
            </Button>
            <Button
              variant={activePage === "calendar" ? "default" : "ghost"}
              onClick={() => setActivePage("calendar")}
              className="nav-btn"
              style={activePage === "calendar" ? {
                background: '#2563eb',
                color: '#fff',
                fontWeight: 700,
                boxShadow: 'var(--shadow-md)',
                border: 'none'
              } : {}}
            >
              <Calendar size={18} /> Calendar
            </Button>
            </div>
            
            <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
              {/* Notifications Toggle */}
              <Button
                variant="ghost"
                onClick={handleToggleNotifications}
                className="nav-btn"
                title={notificationsEnabled ? 'Notifications enabled' : 'Enable notifications for task reminders'}
                style={notificationsEnabled ? {
                  color: 'var(--color-primary)',
                } : {}}
              >
                {notificationsEnabled ? <Bell size={18} /> : <BellOff size={18} />}
              </Button>

              {/* Google Sign-In Button */}
              {googleInitialized && (
                <div>
                  {googleSignedIn ? (
                    <Button
                      variant="ghost"
                      onClick={handleGoogleSignOut}
                      className="nav-btn"
                      title="Sign out from Google"
                    >
                      <LogOut size={18} /> Google
                    </Button>
                  ) : (
                    <Button
                      variant="outline"
                      onClick={handleGoogleSignIn}
                      className="btn-outline"
                      style={{ padding: '0.5rem 1rem' }}
                      title="Sign in with Google to sync calendar"
                    >
                      <LogIn size={18} /> Sign in with Google
                    </Button>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {activePage === "tasks" && (
        <TaskSchedulerPage
          tasks={tasks}
          setTasks={setTasks}
          groups={groups}
          setGroups={setGroups}
          googleSignedIn={googleSignedIn}
        />
      )}
      {activePage === "clock" && <ClockPage />}
      {activePage === "calendar" && <CalendarPage tasks={tasks} />}
    </div>
  );
}
