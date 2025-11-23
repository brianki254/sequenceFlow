// localStorage utilities for data persistence

const STORAGE_KEYS = {
  TASKS: 'sequenceflow_tasks',
  GROUPS: 'sequenceflow_groups',
  SETTINGS: 'sequenceflow_settings'
};

/**
 * Save tasks to localStorage
 */
export function saveTasks(tasks) {
  try {
    localStorage.setItem(STORAGE_KEYS.TASKS, JSON.stringify(tasks));
    return true;
  } catch (error) {
    console.error('Failed to save tasks to localStorage:', error);
    return false;
  }
}

/**
 * Load tasks from localStorage
 */
export function loadTasks() {
  try {
    const stored = localStorage.getItem(STORAGE_KEYS.TASKS);
    if (stored) {
      const tasks = JSON.parse(stored);
      // Ensure all tasks have required fields
      return tasks.map(task => ({
        source: 'local',
        ...task
      }));
    }
    return [];
  } catch (error) {
    console.error('Failed to load tasks from localStorage:', error);
    return [];
  }
}

/**
 * Save groups to localStorage
 */
export function saveGroups(groups) {
  try {
    localStorage.setItem(STORAGE_KEYS.GROUPS, JSON.stringify(groups));
    return true;
  } catch (error) {
    console.error('Failed to save groups to localStorage:', error);
    return false;
  }
}

/**
 * Load groups from localStorage
 */
export function loadGroups() {
  try {
    const stored = localStorage.getItem(STORAGE_KEYS.GROUPS);
    return stored ? JSON.parse(stored) : [];
  } catch (error) {
    console.error('Failed to load groups from localStorage:', error);
    return [];
  }
}

/**
 * Save app settings to localStorage
 */
export function saveSettings(settings) {
  try {
    localStorage.setItem(STORAGE_KEYS.SETTINGS, JSON.stringify(settings));
    return true;
  } catch (error) {
    console.error('Failed to save settings to localStorage:', error);
    return false;
  }
}

/**
 * Load app settings from localStorage
 */
export function loadSettings() {
  try {
    const stored = localStorage.getItem(STORAGE_KEYS.SETTINGS);
    return stored ? JSON.parse(stored) : {
      notificationsEnabled: false,
      lastActiveTab: 'clock'
    };
  } catch (error) {
    console.error('Failed to load settings from localStorage:', error);
    return {
      notificationsEnabled: false,
      lastActiveTab: 'clock'
    };
  }
}

/**
 * Clear all app data from localStorage
 */
export function clearAllData() {
  try {
    localStorage.removeItem(STORAGE_KEYS.TASKS);
    localStorage.removeItem(STORAGE_KEYS.GROUPS);
    localStorage.removeItem(STORAGE_KEYS.SETTINGS);
    return true;
  } catch (error) {
    console.error('Failed to clear data from localStorage:', error);
    return false;
  }
}

/**
 * Get storage usage information
 */
export function getStorageInfo() {
  try {
    const tasks = localStorage.getItem(STORAGE_KEYS.TASKS) || '[]';
    const groups = localStorage.getItem(STORAGE_KEYS.GROUPS) || '[]';
    const settings = localStorage.getItem(STORAGE_KEYS.SETTINGS) || '{}';
    
    const tasksSize = new Blob([tasks]).size;
    const groupsSize = new Blob([groups]).size;
    const settingsSize = new Blob([settings]).size;
    const totalSize = tasksSize + groupsSize + settingsSize;
    
    const tasksCount = JSON.parse(tasks).length;
    const groupsCount = JSON.parse(groups).length;
    
    return {
      totalSize,
      tasksSize,
      groupsSize,
      settingsSize,
      tasksCount,
      groupsCount,
      formattedSize: formatBytes(totalSize)
    };
  } catch (error) {
    console.error('Failed to get storage info:', error);
    return {
      totalSize: 0,
      tasksSize: 0,
      groupsSize: 0,
      settingsSize: 0,
      tasksCount: 0,
      groupsCount: 0,
      formattedSize: '0 B'
    };
  }
}

/**
 * Format bytes to human readable string
 */
function formatBytes(bytes, decimals = 2) {
  if (bytes === 0) return '0 B';
  
  const k = 1024;
  const dm = decimals < 0 ? 0 : decimals;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  
  return parseFloat((bytes / Math.pow(k, i)).toFixed(dm)) + ' ' + sizes[i];
}

/**
 * Export data as JSON for backup
 */
export function exportData() {
  try {
    const data = {
      tasks: loadTasks(),
      groups: loadGroups(),
      settings: loadSettings(),
      exportDate: new Date().toISOString(),
      version: '1.0'
    };
    
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    
    const link = document.createElement('a');
    link.href = url;
    link.download = `sequenceflow-backup-${new Date().toISOString().split('T')[0]}.json`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
    
    return true;
  } catch (error) {
    console.error('Failed to export data:', error);
    return false;
  }
}

/**
 * Import data from JSON backup
 */
export function importData(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    
    reader.onload = (e) => {
      try {
        const data = JSON.parse(e.target.result);
        
        // Validate data structure
        if (!data.tasks || !Array.isArray(data.tasks)) {
          throw new Error('Invalid backup file: missing or invalid tasks data');
        }
        
        if (!data.groups || !Array.isArray(data.groups)) {
          throw new Error('Invalid backup file: missing or invalid groups data');
        }
        
        // Save imported data
        saveTasks(data.tasks);
        saveGroups(data.groups);
        
        if (data.settings) {
          saveSettings(data.settings);
        }
        
        resolve({
          tasksCount: data.tasks.length,
          groupsCount: data.groups.length,
          importDate: data.exportDate || 'Unknown'
        });
      } catch (error) {
        reject(error);
      }
    };
    
    reader.onerror = () => reject(new Error('Failed to read backup file'));
    reader.readAsText(file);
  });
}