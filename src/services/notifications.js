/**
 * Notification Service
 * Handles browser notifications for task reminders
 */

let notificationPermission = 'default';

/**
 * Request notification permission from user
 */
export async function requestNotificationPermission() {
  if (!('Notification' in window)) {
    console.warn('This browser does not support notifications');
    return false;
  }

  if (Notification.permission === 'granted') {
    notificationPermission = 'granted';
    return true;
  }

  if (Notification.permission !== 'denied') {
    const permission = await Notification.requestPermission();
    notificationPermission = permission;
    return permission === 'granted';
  }

  return false;
}

/**
 * Check if notifications are enabled
 */
export function areNotificationsEnabled() {
  return 'Notification' in window && Notification.permission === 'granted';
}

/**
 * Show a notification
 */
export function showNotification(title, options = {}) {
  if (!areNotificationsEnabled()) {
    console.warn('Notifications not enabled');
    return null;
  }

  const defaultOptions = {
    icon: '/vite.svg',
    badge: '/vite.svg',
    requireInteraction: false,
    ...options,
  };

  return new Notification(title, defaultOptions);
}

/**
 * Schedule notification for a task
 */
export function scheduleTaskNotification(task, minutesBefore = 5) {
  if (!areNotificationsEnabled()) return null;

  let startTime;
  if (task.mode === 'daily' && task.firstDay && task.dailyStart) {
    const first = new Date(task.firstDay + 'T00:00:00');
    const [hh, mm] = task.dailyStart.split(':').map(Number);
    startTime = new Date(first.getTime() + (hh * 60 + mm) * 60000);
  } else if (task.startAt) {
    startTime = new Date(task.startAt);
  } else {
    return null;
  }

  const notifyTime = new Date(startTime.getTime() - minutesBefore * 60000);
  const now = new Date();
  const delay = notifyTime - now;

  if (delay <= 0) return null; // Already past notification time

  const timeoutId = setTimeout(() => {
    showNotification(`Upcoming Task: ${task.text}`, {
      body: `Starting ${minutesBefore === 0 ? 'now' : `in ${minutesBefore} minutes`}`,
      tag: `task-${task.id}`,
      icon: '/vite.svg',
    });
  }, delay);

  return timeoutId;
}

/**
 * Check for tasks starting soon and notify
 */
export function checkUpcomingTasks(tasks, options = {}) {
  const {
    lookAheadMinutes = 15,
    notifyBeforeMinutes = 5,
  } = options;

  if (!areNotificationsEnabled()) return [];

  const now = new Date();
  const lookAhead = new Date(now.getTime() + lookAheadMinutes * 60000);
  const scheduledNotifications = [];

  tasks.forEach(task => {
    if (task.completed) return;

    let startTime;
    if (task.mode === 'daily' && task.firstDay && task.dailyStart) {
      const first = new Date(task.firstDay + 'T00:00:00');
      const [hh, mm] = task.dailyStart.split(':').map(Number);
      startTime = new Date(first.getTime() + (hh * 60 + mm) * 60000);
    } else if (task.startAt) {
      startTime = new Date(task.startAt);
    } else {
      return;
    }

    if (startTime > now && startTime <= lookAhead) {
      const timeoutId = scheduleTaskNotification(task, notifyBeforeMinutes);
      if (timeoutId) {
        scheduledNotifications.push({ taskId: task.id, timeoutId });
      }
    }
  });

  return scheduledNotifications;
}

/**
 * Show notification for completed task
 */
export function notifyTaskCompleted(task) {
  if (!areNotificationsEnabled()) return;
  
  showNotification('Task Completed! 🎉', {
    body: task.text,
    tag: `completed-${task.id}`,
  });
}

/**
 * Show notification for new task added
 */
export function notifyTaskAdded(task) {
  if (!areNotificationsEnabled()) return;

  let timeInfo = '';
  if (task.mode === 'daily') {
    timeInfo = `Daily from ${task.dailyStart} to ${task.dailyEnd}`;
  } else if (task.startAt) {
    const start = new Date(task.startAt);
    timeInfo = start.toLocaleString();
  }

  showNotification('New Task Added', {
    body: `${task.text}${timeInfo ? '\n' + timeInfo : ''}`,
    tag: `new-${task.id}`,
  });
}
