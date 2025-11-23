import { useState, useMemo } from "react";
import { ListTodo, Plus, Trash2, Check, Upload, Download, Edit, Save, X, Clock, CheckCircle } from "lucide-react";
import Button from "../components/Button";
import TimeWheelPicker from "../components/TimeWheelPicker";
import { exportTasksToGoogle, importEventsFromGoogle } from "../services/googleCalendar";
import { exportTasksToOutlook, importEventsFromOutlook } from "../services/outlookCalendar";
import { notifyTaskAdded, notifyTaskCompleted, areNotificationsEnabled } from "../services/notifications";

export default function TaskSchedulerPage({ tasks: extTasks, setTasks: setExtTasks, groups: extGroups, setGroups: setExtGroups, googleSignedIn, outlookSignedIn }) {
  const useProvidedOrLocal = (data, setter, initial) => (Array.isArray(data) && typeof setter === 'function') ? [data, setter] : useState(initial);
  const [tasks, setTasks] = useProvidedOrLocal(extTasks, setExtTasks, []);
  
  // Simplified task creation state
  const [newTaskText, setNewTaskText] = useState("");
  const [newTaskDurationValue, setNewTaskDurationValue] = useState(2);
  const [newTaskDurationUnit, setNewTaskDurationUnit] = useState("hours"); // minutes|hours|days
  const [newTaskDependsOn, setNewTaskDependsOn] = useState("");
  const [useManualSchedule, setUseManualSchedule] = useState(false);
  const [manualStartDate, setManualStartDate] = useState(() => {
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    return tomorrow.toISOString().slice(0, 16);
  });
  
  // Recurrent scheduling state
  const [useRecurrentSchedule, setUseRecurrentSchedule] = useState(false);
  const [recurrentFrequency, setRecurrentFrequency] = useState("daily"); // daily|weekly|monthly
  const [recurrentStartDate, setRecurrentStartDate] = useState(() => {
    const today = new Date();
    return today.toISOString().slice(0, 10); // date only
  });
  const [recurrentEndDate, setRecurrentEndDate] = useState(() => {
    const oneWeek = new Date();
    oneWeek.setDate(oneWeek.getDate() + 7);
    return oneWeek.toISOString().slice(0, 10); // date only
  });
  const [recurrentStartTime, setRecurrentStartTime] = useState("09:00");
  const [chainRecurrentTasks, setChainRecurrentTasks] = useState(false);
  
  // Task editing state
  const [editingTaskId, setEditingTaskId] = useState(null);
  const [editTaskText, setEditTaskText] = useState("");
  const [editTaskDuration, setEditTaskDuration] = useState(2);
  const [editTaskDurationUnit, setEditTaskDurationUnit] = useState("hours");
  const [editTaskStartAt, setEditTaskStartAt] = useState("");
  
  // Groups
  const [groups, setGroups] = useProvidedOrLocal(extGroups, setExtGroups, []); // {id, name}
  const [newTaskGroupId, setNewTaskGroupId] = useState("");
  const [newGroupName, setNewGroupName] = useState("");

  const findTaskById = (id) => tasks.find(t => String(t.id) === String(id));
  const parseDateTimeLocal = (val) => new Date(val);
  const floorToMidnight = (d) => new Date(d.getFullYear(), d.getMonth(), d.getDate());
  const addMinutes = (date, minutes) => new Date(date.getTime() + minutes * 60000);
  const addDays = (date, days) => new Date(date.getTime() + days * 24 * 60 * 60000);
  const diffDays = (a, b) => Math.floor((floorToMidnight(a) - floorToMidnight(b)) / (1000*60*60*24));
  const diffHours = (a, b) => Math.round((a - b) / (1000*60*60));
  const toMinutes = (value, unit) => {
    const v = Math.max(1, Number(value) || 1);
    if (unit === 'minutes') return v;
    if (unit === 'hours') return v * 60;
    return v * 24 * 60; // days
  };
  const parseTimeToMinutes = (hhmm) => {
    const [hh, mm] = (hhmm || "00:00").split(":").map(n => parseInt(n || 0, 10));
    return (hh * 60) + (mm || 0);
  };
  const toHHMM = (minutes) => {
    const hh = String(Math.floor(minutes / 60)).padStart(2, '0');
    const mm = String(minutes % 60).padStart(2, '0');
    return `${hh}:${mm}`;
  };
  const combineDateAndTime = (dateOnly, hhmm) => addMinutes(floorToMidnight(dateOnly), parseTimeToMinutes(hhmm));

  const addTask = () => {
    if (newTaskText.trim() === "") return;
    
    const durationMinutes = toMinutes(newTaskDurationValue, newTaskDurationUnit);
    let groupId = newTaskGroupId || "";
    
    // Helper function to create a single task
    const createTask = (taskText, taskStartAt, taskId, isFirstInSeries = false) => {
      let deps = [];
      
      // Handle dependency logic - for recurrent tasks, only first task gets the dependency
      if (newTaskDependsOn && (!useRecurrentSchedule || isFirstInSeries)) {
        const dep = findTaskById(newTaskDependsOn);
        if (dep && dep.startAt && dep.durationMinutes) {
          const depStart = new Date(dep.startAt);
          const depEnd = addMinutes(depStart, dep.durationMinutes);
          
          // For recurrent tasks, adjust the start date if needed
          if (useRecurrentSchedule && isFirstInSeries) {
            const requestedStart = new Date(taskStartAt);
            if (requestedStart < depEnd) {
              // Adjust the start time to be after dependency
              const adjustedStart = new Date(depEnd.getTime() + 60000);
              const dateStr = adjustedStart.toISOString().slice(0, 10);
              const timeStr = adjustedStart.toTimeString().slice(0, 5);
              taskStartAt = `${dateStr}T${timeStr}`;
            }
          } else if (useManualSchedule && !useRecurrentSchedule) {
            // Check if manual start is after dependency for single tasks
            const manualStart = new Date(manualStartDate);
            if (manualStart < depEnd) {
              alert(`Task cannot start before its dependency ends (${depEnd.toLocaleString()})`);
              return null;
            }
          }
        }
        
        deps = [String(newTaskDependsOn)];
        // Inherit dependency group if none chosen
        if (!groupId && dep && dep.groupId) {
          groupId = dep.groupId;
        }
      }
      
      return {
        id: taskId || Date.now() + Math.random(),
        text: taskText,
        completed: false,
        status: 'pending', // pending|in-progress|completed
        createdAt: new Date().toLocaleString(),
        mode: "continuous",
        startAt: taskStartAt,
        durationMinutes: durationMinutes,
        deps,
        groupId,
        source: 'local'
      };
    };
    
    if (useRecurrentSchedule) {
      // Generate recurrent tasks
      const startDate = new Date(recurrentStartDate);
      const endDate = new Date(recurrentEndDate);
      const newTasks = [];
      
      if (startDate > endDate) {
        alert("Start date must be before end date");
        return;
      }
      
      let currentDate = new Date(startDate);
      let taskIndex = 1;
      let previousTaskId = null;
      
      while (currentDate <= endDate) {
        // Create datetime string
        const dateStr = currentDate.toISOString().slice(0, 10);
        let taskStartAt = `${dateStr}T${recurrentStartTime}`;
        
        const taskText = `${newTaskText} (${taskIndex})`;
        const taskId = Date.now() + Math.random() + taskIndex;
        const isFirstInSeries = taskIndex === 1;
        
        // Handle chaining logic
        let taskDependency = "";
        if (chainRecurrentTasks && previousTaskId) {
          taskDependency = String(previousTaskId);
        } else if (isFirstInSeries && newTaskDependsOn) {
          taskDependency = newTaskDependsOn;
        }
        
        // Temporarily override newTaskDependsOn for this task
        const originalDependency = newTaskDependsOn;
        if (chainRecurrentTasks && !isFirstInSeries) {
          setNewTaskDependsOn(String(previousTaskId));
        }
        
        const task = createTask(taskText, taskStartAt, taskId, isFirstInSeries);
        
        // Restore original dependency
        setNewTaskDependsOn(originalDependency);
        
        if (task) {
          // If chaining and not first task, calculate start time based on previous task
          if (chainRecurrentTasks && previousTaskId && !isFirstInSeries) {
            const previousTask = newTasks[newTasks.length - 1];
            if (previousTask) {
              const prevStart = new Date(previousTask.startAt);
              const prevEnd = addMinutes(prevStart, previousTask.durationMinutes);
              task.startAt = new Date(prevEnd.getTime() + 60000).toISOString().slice(0, 16);
              task.deps = [String(previousTaskId)];
            }
          }
          
          newTasks.push(task);
          previousTaskId = task.id;
        }
        
        // Increment date based on frequency
        if (recurrentFrequency === "daily") {
          currentDate.setDate(currentDate.getDate() + 1);
        } else if (recurrentFrequency === "weekly") {
          currentDate.setDate(currentDate.getDate() + 7);
        } else if (recurrentFrequency === "monthly") {
          currentDate.setMonth(currentDate.getMonth() + 1);
        }
        
        taskIndex++;
        
        // Safety check to prevent infinite loops
        if (taskIndex > 365) {
          alert("Cannot create more than 365 recurrent tasks");
          break;
        }
      }
      
      if (newTasks.length > 0) {
        setTasks([...newTasks, ...tasks]);
        
        // Notify about new tasks
        if (areNotificationsEnabled()) {
          newTasks.forEach(task => notifyTaskAdded(task));
        }
        
        alert(`Created ${newTasks.length} recurrent tasks`);
      }
    } else {
      // Single task (manual or automatic scheduling)
      let startAt;
      
      if (newTaskDependsOn) {
        const dep = findTaskById(newTaskDependsOn);
        if (dep && dep.startAt && dep.durationMinutes) {
          const depStart = new Date(dep.startAt);
          const depEnd = addMinutes(depStart, dep.durationMinutes);
          
          if (useManualSchedule) {
            // Check if manual start is after dependency
            const manualStart = new Date(manualStartDate);
            if (manualStart < depEnd) {
              alert(`Task cannot start before its dependency ends (${depEnd.toLocaleString()})`);
              return;
            }
            startAt = manualStartDate;
          } else {
            // Auto-schedule after dependency
            startAt = new Date(depEnd.getTime() + 60000).toISOString().slice(0, 16); // 1 minute after
          }
        } else {
          startAt = useManualSchedule ? manualStartDate : new Date().toISOString().slice(0, 16);
        }
      } else {
        // No dependency
        startAt = useManualSchedule ? manualStartDate : new Date().toISOString().slice(0, 16);
      }
      
      const newTask = createTask(newTaskText, startAt);
      if (newTask) {
        setTasks([newTask, ...tasks]);
        
        // Notify about new task
        if (areNotificationsEnabled()) {
          notifyTaskAdded(newTask);
        }
      }
    }
    
    // Reset form
    setNewTaskText("");
    setNewTaskDurationValue(2);
    setNewTaskDurationUnit("hours");
    setNewTaskDependsOn("");
    setNewTaskGroupId("");
    setUseManualSchedule(false);
    setUseRecurrentSchedule(false);
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    setManualStartDate(tomorrow.toISOString().slice(0, 16));
    // Reset recurrent fields
    setRecurrentFrequency("daily");
    const today = new Date();
    setRecurrentStartDate(today.toISOString().slice(0, 10));
    const oneWeek = new Date();
    oneWeek.setDate(oneWeek.getDate() + 7);
    setRecurrentEndDate(oneWeek.toISOString().slice(0, 10));
    setRecurrentStartTime("09:00");
    setChainRecurrentTasks(false);
  };

  const addGroup = () => {
    const name = newGroupName.trim() || `Group ${groups.length + 1}`;
    const id = `g-${Date.now()}`;
    setGroups(prev => [...prev, { id, name }]);
    setNewGroupName("");
  };

  const toggleTask = (taskId) => {
    setTasks(prev => {
      const target = prev.find(t => t.id === taskId);
      if (!target) return prev;
      const willComplete = !target.completed;
      if (willComplete && target.deps && target.deps.length > 0) {
        const allDepsDone = target.deps.every(id => {
          const dep = prev.find(t => String(t.id) === String(id));
          return dep ? dep.completed : true;
        });
        if (!allDepsDone) {
          alert("This task depends on other tasks. Complete all dependencies first.");
          return prev;
        }
      }
      
      // Notify about task completion
      if (willComplete && areNotificationsEnabled()) {
        notifyTaskCompleted(target);
      }
      
      return prev.map(task => task.id === taskId ? { ...task, completed: !task.completed } : task);
    });
  };

  const deleteTask = (taskId) => {
    setTasks(tasks.filter(task => task.id !== taskId));
  };

  const setTaskStatus = (taskId, status) => {
    setTasks(prev => prev.map(task => {
      if (task.id === taskId) {
        const updatedTask = { ...task, status };
        // Auto-set completed flag based on status
        if (status === 'completed') {
          updatedTask.completed = true;
          // Notify about task completion
          if (areNotificationsEnabled()) {
            notifyTaskCompleted(updatedTask);
          }
        } else {
          updatedTask.completed = false;
        }
        return updatedTask;
      }
      return task;
    }));
  };

  const startEditingTask = (taskId) => {
    const task = tasks.find(t => t.id === taskId);
    if (task) {
      setEditingTaskId(taskId);
      setEditTaskText(task.text);
      setEditTaskDuration(Math.floor(task.durationMinutes / 60) || 2);
      setEditTaskDurationUnit(task.durationMinutes >= 60 ? "hours" : "minutes");
      setEditTaskStartAt(task.startAt || "");
    }
  };

  const saveTaskEdit = () => {
    if (editTaskText.trim() === "") return;
    
    const durationMinutes = toMinutes(editTaskDuration, editTaskDurationUnit);
    
    setTasks(prev => prev.map(task => {
      if (task.id === editingTaskId) {
        return {
          ...task,
          text: editTaskText,
          durationMinutes,
          startAt: editTaskStartAt
        };
      }
      return task;
    }));
    
    cancelTaskEdit();
  };

  const cancelTaskEdit = () => {
    setEditingTaskId(null);
    setEditTaskText("");
    setEditTaskDuration(2);
    setEditTaskDurationUnit("hours");
    setEditTaskStartAt("");
  };

  const setTaskGroup = (taskId, groupId) => {
    setTasks(prev => prev.map(t => t.id === taskId ? { ...t, groupId: groupId || "" } : t));
  };

  const totalTasks = tasks.length;
  const completedTasks = tasks.filter(task => task.status === 'completed').length;
  const inProgressTasks = tasks.filter(task => task.status === 'in-progress').length;
  const pendingTasks = tasks.filter(task => task.status === 'pending').length;

  // Gantt data (hour-based width, day headers)
  const gantt = useMemo(() => {
    if (tasks.length === 0) return null;
    const withDates = tasks.filter(t => (t.mode === 'daily' || (t.startAt && (t.durationMinutes || t.duration))));
    if (withDates.length === 0) return null;
    const starts = withDates.map(t => t.mode === 'daily'
      ? combineDateAndTime(new Date(t.firstDay + 'T00:00:00'), t.dailyStart)
      : parseDateTimeLocal(t.startAt)
    );
    const minStart = new Date(Math.min(...starts));
    const ends = withDates.map(t => {
      if (t.mode === 'daily') {
        const first = new Date(t.firstDay + 'T00:00:00');
        const lastDay = addDays(first, Math.max(1, Number(t.daysCount)||1) - 1);
        return combineDateAndTime(lastDay, t.dailyEnd);
      }
      return addMinutes(parseDateTimeLocal(t.startAt), t.durationMinutes ?? (Number(t.duration) * 24 * 60));
    });
    const maxEnd = new Date(Math.max(...ends));
    const minDay = floorToMidnight(minStart);
    const maxDay = floorToMidnight(maxEnd);
    const totalDays = Math.max(1, diffDays(maxDay, minDay) + 1);
    const unitHour = 6; // px per hour
    const dayWidth = 24 * unitHour;
    return { minStart, maxEnd, minDay, maxDay, totalDays, unitHour, dayWidth };
  }, [tasks]);

  const handleExportToGoogle = async () => {
    if (!googleSignedIn) {
      alert('Please sign in with Google first');
      return;
    }
    try {
      const results = await exportTasksToGoogle(tasks);
      alert(`Export complete!\n✓ ${results.success} tasks exported\n${results.failed > 0 ? `✗ ${results.failed} failed` : ''}`);
    } catch (error) {
      console.error('Export failed:', error);
      alert('Failed to export tasks: ' + error.message);
    }
  };

  const handleImportFromGoogle = async () => {
    if (!googleSignedIn) {
      alert('Please sign in with Google first');
      return;
    }
    try {
      const now = new Date();
      const startDate = new Date(now.getFullYear(), now.getMonth() - 1, 1);
      const endDate = new Date(now.getFullYear(), now.getMonth() + 2, 0);
      
      const importedTasks = await importEventsFromGoogle(startDate, endDate);
      // Tag imported tasks with source
      const taggedTasks = importedTasks.map(task => ({ ...task, source: 'google' }));
      setTasks(prev => [...taggedTasks, ...prev]);
      alert(`Imported ${importedTasks.length} events from Google Calendar`);
    } catch (error) {
      console.error('Import failed:', error);
      alert('Failed to import events: ' + error.message);
    }
  };

  const handleExportToOutlook = async () => {
    if (!outlookSignedIn) {
      alert('Please sign in with Microsoft first');
      return;
    }
    try {
      const results = await exportTasksToOutlook(tasks);
      alert(`Export complete!\n✓ ${results.success} tasks exported\n${results.errors > 0 ? `✗ ${results.errors} failed` : ''}`);
    } catch (error) {
      console.error('Outlook export failed:', error);
      alert('Failed to export tasks: ' + error.message);
    }
  };

  const handleImportFromOutlook = async () => {
    if (!outlookSignedIn) {
      alert('Please sign in with Microsoft first');
      return;
    }
    try {
      const now = new Date();
      const startDate = new Date(now.getFullYear(), now.getMonth() - 1, 1);
      const endDate = new Date(now.getFullYear(), now.getMonth() + 2, 0);
      
      const importedTasks = await importEventsFromOutlook(startDate, endDate);
      // Tag imported tasks with source
      const taggedTasks = importedTasks.map(task => ({ ...task, source: 'outlook' }));
      setTasks(prev => [...taggedTasks, ...prev]);
      alert(`Imported ${importedTasks.length} events from Outlook Calendar`);
    } catch (error) {
      console.error('Outlook import failed:', error);
      alert('Failed to import events: ' + error.message);
    }
  };

  return (
    <div className="container" style={{ background: 'linear-gradient(135deg, #f8fafc 0%, #e0e7ff 100%)', minHeight: '100vh' }}>
      <div style={{ marginBottom: '2rem', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
        <div>
          <h1 style={{ color: 'var(--color-text)', fontWeight: 700, fontSize: '2rem', marginBottom: '0.75rem' }}>Task Scheduler</h1>
          <p style={{ color: 'var(--color-text-light)' }}>Organize your tasks and stay productive</p>
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          {/* Google Calendar Integration */}
          {googleSignedIn && (
            <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
              <span style={{ fontSize: '0.875rem', color: 'var(--color-text-light)', marginRight: '0.5rem' }}>Google:</span>
              <Button onClick={handleExportToGoogle} className="btn-outline" title="Export tasks to Google Calendar">
                <Upload size={16} /> Export
              </Button>
              <Button onClick={handleImportFromGoogle} className="btn-outline" title="Import events from Google Calendar">
                <Download size={16} /> Import
              </Button>
            </div>
          )}
          {/* Outlook Calendar Integration */}
          {outlookSignedIn && (
            <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
              <span style={{ fontSize: '0.875rem', color: 'var(--color-text-light)', marginRight: '0.5rem' }}>Outlook:</span>
              <Button onClick={handleExportToOutlook} className="btn-outline" title="Export tasks to Outlook Calendar">
                <Upload size={16} /> Export
              </Button>
              <Button onClick={handleImportFromOutlook} className="btn-outline" title="Import events from Outlook Calendar">
                <Download size={16} /> Import
              </Button>
            </div>
          )}
        </div>
      </div>

      <div className="grid" style={{ gridTemplateColumns: 'repeat(4, 1fr)', gap: '1rem', marginBottom: '1.5rem' }}>
        <div style={{ background: 'linear-gradient(135deg, #eff6ff 0%, #dbeafe 100%)', borderRadius: 'var(--radius)', padding: '1.25rem' }}>
          <div style={{ color: 'var(--color-primary)', fontWeight: 700, fontSize: '2rem' }}>{totalTasks}</div>
          <div style={{ color: 'var(--color-text-light)', fontSize: '0.9rem' }}>Total Tasks</div>
        </div>
        <div style={{ background: 'linear-gradient(135deg, #f1f5f9 0%, #cbd5e1 100%)', borderRadius: 'var(--radius)', padding: '1.25rem' }}>
          <div style={{ color: '#6b7280', fontWeight: 700, fontSize: '2rem' }}>{pendingTasks}</div>
          <div style={{ color: 'var(--color-text-light)', fontSize: '0.9rem' }}>Pending</div>
        </div>
        <div style={{ background: 'linear-gradient(135deg, #fef3c7 0%, #fbbf24 100%)', borderRadius: 'var(--radius)', padding: '1.25rem' }}>
          <div style={{ color: '#f59e0b', fontWeight: 700, fontSize: '2rem' }}>{inProgressTasks}</div>
          <div style={{ color: 'var(--color-text-light)', fontSize: '0.9rem' }}>In Progress</div>
        </div>
        <div style={{ background: 'linear-gradient(135deg, #ecfdf5 0%, #bbf7d0 100%)', borderRadius: 'var(--radius)', padding: '1.25rem' }}>
          <div style={{ color: '#22c55e', fontWeight: 700, fontSize: '2rem' }}>{completedTasks}</div>
          <div style={{ color: 'var(--color-text-light)', fontSize: '0.9rem' }}>Completed</div>
        </div>
      </div>

      <div className="card" style={{ marginBottom: '1.5rem', background: 'linear-gradient(135deg, #fff 0%, #f3f4f6 100%)' }}>
        {/* Row 1: Basic task inputs */}
        {/* Simplified Task Creation Form */}
        <div style={{ background: 'white', padding: '1.5rem', borderRadius: 'var(--radius)', border: '1px solid var(--color-border)', marginBottom: '1rem' }}>
          <h3 style={{ margin: '0 0 1rem 0', color: 'var(--color-text)', fontWeight: 600 }}>Add New Task</h3>
          
          {/* Task Name */}
          <div style={{ marginBottom: '1rem' }}>
            <label style={{ display: 'block', marginBottom: '0.5rem', color: 'var(--color-text)', fontWeight: 500 }}>Task Name</label>
            <input
              type="text"
              value={newTaskText}
              onChange={(e) => setNewTaskText(e.target.value)}
              onKeyPress={(e) => e.key === "Enter" && addTask()}
              placeholder="Enter task description..."
              style={{ width: '100%', padding: '0.75rem 1rem', border: '1px solid var(--color-border)', borderRadius: 'var(--radius)', outline: 'none', fontSize: '1rem' }}
            />
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1rem', marginBottom: '1rem' }}>
            {/* Duration */}
            <div>
              <label style={{ display: 'block', marginBottom: '0.5rem', color: 'var(--color-text)', fontWeight: 500 }}>Duration</label>
              <div style={{ display: 'flex', gap: '0.5rem' }}>
                <input
                  type="number"
                  min={1}
                  value={newTaskDurationValue}
                  onChange={(e) => setNewTaskDurationValue(e.target.value)}
                  style={{ flex: 1, padding: '0.75rem', border: '1px solid var(--color-border)', borderRadius: 'var(--radius)' }}
                />
                <select
                  value={newTaskDurationUnit}
                  onChange={(e) => setNewTaskDurationUnit(e.target.value)}
                  style={{ padding: '0.75rem', border: '1px solid var(--color-border)', borderRadius: 'var(--radius)', background: 'white' }}
                >
                  <option value="minutes">minutes</option>
                  <option value="hours">hours</option>
                  <option value="days">days</option>
                </select>
              </div>
            </div>

            {/* Dependency */}
            <div>
              <label style={{ display: 'block', marginBottom: '0.5rem', color: 'var(--color-text)', fontWeight: 500 }}>Dependency</label>
              <select
                value={newTaskDependsOn}
                onChange={(e) => setNewTaskDependsOn(e.target.value)}
                style={{ width: '100%', padding: '0.75rem', border: '1px solid var(--color-border)', borderRadius: 'var(--radius)', background: 'white' }}
                title={useRecurrentSchedule ? "Dependencies will apply to the first task in the series" : "Select a task this depends on"}
              >
                <option value="">No dependency</option>
                {tasks.map(t => (
                  <option key={t.id} value={t.id}>{t.text}</option>
                ))}
              </select>
              {useRecurrentSchedule && newTaskDependsOn && (
                <div style={{ marginTop: '0.25rem', fontSize: '0.75rem', color: 'var(--color-text-light)' }}>
                  Only the first recurrent task will depend on this task
                </div>
              )}
            </div>

            {/* Group */}
            <div>
              <label style={{ display: 'block', marginBottom: '0.5rem', color: 'var(--color-text)', fontWeight: 500 }}>Group</label>
              <select
                value={newTaskGroupId}
                onChange={(e) => setNewTaskGroupId(e.target.value)}
                style={{ width: '100%', padding: '0.75rem', border: '1px solid var(--color-border)', borderRadius: 'var(--radius)', background: 'white' }}
              >
                <option value="">No group</option>
                {groups.map(g => (
                  <option key={g.id} value={g.id}>{g.name}</option>
                ))}
              </select>
            </div>
          </div>

          {/* Scheduling Mode */}
          <div style={{ marginBottom: '1rem' }}>
            <label style={{ display: 'block', marginBottom: '0.75rem', color: 'var(--color-text)', fontWeight: 500 }}>Scheduling</label>
            <div style={{ display: 'flex', gap: '1.5rem', flexWrap: 'wrap' }}>
              <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', cursor: 'pointer' }}>
                <input
                  type="radio"
                  name="scheduleMode"
                  checked={!useManualSchedule && !useRecurrentSchedule}
                  onChange={() => {
                    setUseManualSchedule(false);
                    setUseRecurrentSchedule(false);
                  }}
                  style={{ margin: 0 }}
                />
                <span style={{ color: 'var(--color-text)' }}>Automatic (schedule based on dependencies)</span>
              </label>
              <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', cursor: 'pointer' }}>
                <input
                  type="radio"
                  name="scheduleMode"
                  checked={useManualSchedule && !useRecurrentSchedule}
                  onChange={() => {
                    setUseManualSchedule(true);
                    setUseRecurrentSchedule(false);
                  }}
                  style={{ margin: 0 }}
                />
                <span style={{ color: 'var(--color-text)' }}>Manual start time</span>
              </label>
              <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', cursor: 'pointer' }}>
                <input
                  type="radio"
                  name="scheduleMode"
                  checked={useRecurrentSchedule}
                  onChange={() => {
                    setUseManualSchedule(false);
                    setUseRecurrentSchedule(true);
                  }}
                  style={{ margin: 0 }}
                />
                <span style={{ color: 'var(--color-text)' }}>Recurrent scheduling</span>
              </label>
            </div>
          </div>

          {/* Manual Start Date/Time */}
          {useManualSchedule && !useRecurrentSchedule && (
            <div style={{ marginBottom: '1rem' }}>
              <label style={{ display: 'block', marginBottom: '0.5rem', color: 'var(--color-text)', fontWeight: 500 }}>Start Date & Time</label>
              <input
                type="datetime-local"
                value={manualStartDate}
                onChange={(e) => setManualStartDate(e.target.value)}
                style={{ padding: '0.75rem 1rem', border: '1px solid var(--color-border)', borderRadius: 'var(--radius)', fontSize: '1rem' }}
              />
            </div>
          )}

          {/* Recurrent Controls */}
          {useRecurrentSchedule && (
            <div style={{ marginBottom: '1rem', padding: '1rem', background: 'var(--color-bg-light)', borderRadius: 'var(--radius)', border: '1px solid var(--color-border)' }}>
              <h4 style={{ margin: '0 0 1rem 0', color: 'var(--color-text)', fontWeight: 600 }}>Recurrent Schedule Settings</h4>
              
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1rem', marginBottom: '1rem' }}>
                {/* Frequency */}
                <div>
                  <label style={{ display: 'block', marginBottom: '0.5rem', color: 'var(--color-text)', fontWeight: 500 }}>Frequency</label>
                  <select
                    value={recurrentFrequency}
                    onChange={(e) => setRecurrentFrequency(e.target.value)}
                    style={{ width: '100%', padding: '0.75rem', border: '1px solid var(--color-border)', borderRadius: 'var(--radius)', background: 'white' }}
                  >
                    <option value="daily">Daily</option>
                    <option value="weekly">Weekly</option>
                    <option value="monthly">Monthly</option>
                  </select>
                </div>

                {/* Start Time */}
                <div>
                  <label style={{ display: 'block', marginBottom: '0.5rem', color: 'var(--color-text)', fontWeight: 500 }}>Start Time</label>
                  <input
                    type="time"
                    value={recurrentStartTime}
                    onChange={(e) => setRecurrentStartTime(e.target.value)}
                    style={{ width: '100%', padding: '0.75rem', border: '1px solid var(--color-border)', borderRadius: 'var(--radius)' }}
                  />
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                {/* Start Date */}
                <div>
                  <label style={{ display: 'block', marginBottom: '0.5rem', color: 'var(--color-text)', fontWeight: 500 }}>Start Date</label>
                  <input
                    type="date"
                    value={recurrentStartDate}
                    onChange={(e) => setRecurrentStartDate(e.target.value)}
                    style={{ width: '100%', padding: '0.75rem', border: '1px solid var(--color-border)', borderRadius: 'var(--radius)' }}
                  />
                </div>

                {/* End Date */}
                <div>
                  <label style={{ display: 'block', marginBottom: '0.5rem', color: 'var(--color-text)', fontWeight: 500 }}>End Date</label>
                  <input
                    type="date"
                    value={recurrentEndDate}
                    onChange={(e) => setRecurrentEndDate(e.target.value)}
                    min={recurrentStartDate}
                    style={{ width: '100%', padding: '0.75rem', border: '1px solid var(--color-border)', borderRadius: 'var(--radius)' }}
                  />
                </div>
              </div>

              <div style={{ marginTop: '0.75rem' }}>
                <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', cursor: 'pointer' }}>
                  <input
                    type="checkbox"
                    checked={chainRecurrentTasks}
                    onChange={(e) => setChainRecurrentTasks(e.target.checked)}
                    style={{ margin: 0 }}
                  />
                  <span style={{ color: 'var(--color-text)', fontSize: '0.9rem' }}>Chain tasks together (each task depends on the previous one)</span>
                </label>
              </div>

              <div style={{ marginTop: '0.75rem', padding: '0.75rem', background: 'white', borderRadius: 'var(--radius)', color: 'var(--color-text-light)', fontSize: '0.875rem' }}>
                <strong>Preview:</strong> This will create {recurrentFrequency} tasks from {recurrentStartDate} to {recurrentEndDate} at {recurrentStartTime}
                {newTaskDependsOn && !chainRecurrentTasks && <><br />First task will depend on selected dependency</>}
                {chainRecurrentTasks && <><br />Tasks will be chained together in sequence</>}
                {newTaskDependsOn && chainRecurrentTasks && <><br />First task will depend on selected dependency, then chain together</>}
              </div>
            </div>
          )}

          {/* Add Task Button */}
          <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
            <Button 
              onClick={addTask} 
              className="btn"
              disabled={!newTaskText.trim()}
              style={{ 
                opacity: newTaskText.trim() ? 1 : 0.5,
                cursor: newTaskText.trim() ? 'pointer' : 'not-allowed'
              }}
            >
              <Plus style={{ fontSize: 16 }} /> Add Task
            </Button>
          </div>
        </div>
        {/* Row 3: Group management */}
        <div className="flex gap-2" style={{ gap: '0.5rem', alignItems: 'center', marginTop: '0.75rem' }}>
          <div style={{ color: 'var(--color-text-light)', fontSize: '0.95rem' }}>New group:</div>
          <input
            type="text"
            value={newGroupName}
            onChange={(e) => setNewGroupName(e.target.value)}
            placeholder="Group name"
            style={{ flex: '0 0 240px', padding: '0.5rem 0.75rem', border: '1px solid var(--color-border)', borderRadius: 'var(--radius)' }}
          />
          <Button onClick={addGroup} className="btn-outline">Add Group</Button>
        </div>
      </div>

      {gantt && (
        <div className="gantt" style={{ marginBottom: '1.5rem' }}>
          <div className="gantt-header">
            <div className="label">Tasks</div>
            <div className="label gantt-timeline">
              <div className="gantt-days" style={{ width: gantt.totalDays * gantt.dayWidth }}>
                {Array.from({ length: gantt.totalDays }).map((_, i) => (
                  <div
                    key={i}
                    className="gantt-day"
                    style={{ width: gantt.dayWidth }}
                  >
                    {i + 1}
                  </div>
                ))}
              </div>
            </div>
          </div>
          <div className="gantt-rows">
            {(() => {
              const groupedOrder = [...groups, { id: '__ungrouped__', name: 'Ungrouped' }];
              return groupedOrder.map(group => {
                const items = tasks.filter(t => (group.id === '__ungrouped__' ? !t.groupId : t.groupId === group.id));
                if (items.length === 0) return null;
                return (
                  <div key={group.id}>
                    <div className="gantt-group-header">
                      <div className="task-label">{group.name}</div>
                      <div className="task-track" style={{ width: gantt.totalDays * gantt.dayWidth }} />
                    </div>
                    {items.map(t => {
                      const isDaily = t.mode === 'daily';
                      const hasDates = isDaily || (t.startAt && (t.durationMinutes || t.duration));
                      const start = !isDaily && hasDates ? parseDateTimeLocal(t.startAt) : null;
                      const durMin = !isDaily && hasDates ? (t.durationMinutes ?? (Number(t.duration) * 24 * 60)) : 0;
                      const left = !isDaily && hasDates ? Math.max(0, (start - gantt.minDay) / (1000*60*60)) * gantt.unitHour : 0;
                      const width = !isDaily && hasDates ? Math.max(gantt.unitHour, (durMin / 60) * gantt.unitHour) : 0;
                      const blocked = (t.deps && t.deps.length > 0) && !t.deps.every(id => {
                        const dep = tasks.find(x => String(x.id) === String(id));
                        return dep ? dep.completed : true;
                      });
                      return (
                        <div key={t.id} className="gantt-row">
                          <div className="task-label">{t.text}</div>
                          <div className="task-track" style={{ width: gantt.totalDays * gantt.dayWidth, position: 'relative' }}>
                            {!isDaily && hasDates && (
                              <div
                                className={`gantt-bar ${t.completed ? 'completed' : ''} ${blocked ? 'blocked' : ''}`}
                                style={{ left, width }}
                                title={`${t.text} (${t.startAt} • ${Math.round(durMin)} min)`}
                              />
                            )}
                            {isDaily && (
                              Array.from({ length: Math.max(1, Number(t.daysCount)||1) }).map((_, idx) => {
                                const base = new Date(t.firstDay + 'T00:00:00');
                                const thisDay = addDays(base, idx);
                                const segStart = combineDateAndTime(thisDay, t.dailyStart);
                                const segEnd = combineDateAndTime(thisDay, t.dailyEnd);
                                const segLeft = Math.max(0, (segStart - gantt.minDay) / (1000*60*60)) * gantt.unitHour;
                                const segWidth = Math.max(gantt.unitHour, ((segEnd - segStart) / (1000*60*60)) * gantt.unitHour);
                                return (
                                  <div
                                    key={idx}
                                    className={`gantt-bar ${t.completed ? 'completed' : ''} ${blocked ? 'blocked' : ''}`}
                                    style={{ left: segLeft, width: segWidth }}
                                    title={`${t.text} (${t.dailyStart}-${t.dailyEnd}) day ${idx+1}/${t.daysCount}`}
                                  />
                                );
                              })
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                );
              });
            })()}
          </div>
        </div>
      )}

      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
        {tasks.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '3rem 0', color: 'var(--color-text-light)' }}>
            <ListTodo style={{ fontSize: 48, opacity: 0.3, marginBottom: '1rem' }} />
            <p>No tasks yet. Add one to get started!</p>
          </div>
        ) : (
          tasks.map(task => (
            <div
              key={task.id}
              className="card"
              style={{
                opacity: task.completed ? 0.6 : 1,
                transition: 'opacity 0.2s',
                background: 'linear-gradient(135deg, #fff 0%, #f3f4f6 100%)',
                border: '1px solid var(--color-border)',
                borderRadius: 'var(--radius)',
                padding: '1.25rem'
              }}
            >
              <div className="flex gap-2" style={{ alignItems: 'flex-start' }}>
                {/* Status Buttons */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
                  <button
                    onClick={() => setTaskStatus(task.id, 'pending')}
                    style={{ 
                      width: 24, 
                      height: 24, 
                      borderRadius: '4px', 
                      border: '2px solid', 
                      borderColor: task.status === 'pending' ? '#6b7280' : 'var(--color-border)', 
                      background: task.status === 'pending' ? '#6b7280' : 'transparent', 
                      display: 'flex', 
                      alignItems: 'center', 
                      justifyContent: 'center', 
                      cursor: 'pointer',
                      transition: 'all 0.2s'
                    }}
                    title="Mark as Pending"
                  >
                    {task.status === 'pending' && <div style={{ width: 8, height: 8, background: 'white', borderRadius: '50%' }} />}
                  </button>
                  
                  <button
                    onClick={() => setTaskStatus(task.id, 'in-progress')}
                    style={{ 
                      width: 24, 
                      height: 24, 
                      borderRadius: '4px', 
                      border: '2px solid', 
                      borderColor: task.status === 'in-progress' ? '#f59e0b' : 'var(--color-border)', 
                      background: task.status === 'in-progress' ? '#f59e0b' : 'transparent', 
                      display: 'flex', 
                      alignItems: 'center', 
                      justifyContent: 'center', 
                      cursor: 'pointer',
                      transition: 'all 0.2s'
                    }}
                    title="Mark as In Progress"
                  >
                    {task.status === 'in-progress' && <Clock style={{ fontSize: 12, color: 'white' }} />}
                  </button>
                  
                  <button
                    onClick={() => setTaskStatus(task.id, 'completed')}
                    style={{ 
                      width: 24, 
                      height: 24, 
                      borderRadius: '4px', 
                      border: '2px solid', 
                      borderColor: task.status === 'completed' ? '#22c55e' : 'var(--color-border)', 
                      background: task.status === 'completed' ? '#22c55e' : 'transparent', 
                      display: 'flex', 
                      alignItems: 'center', 
                      justifyContent: 'center', 
                      cursor: 'pointer',
                      transition: 'all 0.2s'
                    }}
                    title="Mark as Completed"
                  >
                    {task.status === 'completed' && <Check style={{ fontSize: 12, color: 'white' }} />}
                  </button>
                </div>

                <div style={{ flex: 1 }}>
                  {editingTaskId === task.id ? (
                    // Edit Mode
                    <div style={{ background: '#f8fafc', padding: '1rem', borderRadius: 'var(--radius)', border: '1px solid var(--color-border)' }}>
                      <div style={{ marginBottom: '0.75rem' }}>
                        <label style={{ display: 'block', marginBottom: '0.25rem', fontSize: '0.875rem', fontWeight: 500 }}>Task Name</label>
                        <input
                          type="text"
                          value={editTaskText}
                          onChange={(e) => setEditTaskText(e.target.value)}
                          style={{ width: '100%', padding: '0.5rem', border: '1px solid var(--color-border)', borderRadius: 'var(--radius)' }}
                        />
                      </div>
                      
                      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem', marginBottom: '0.75rem' }}>
                        <div>
                          <label style={{ display: 'block', marginBottom: '0.25rem', fontSize: '0.875rem', fontWeight: 500 }}>Duration</label>
                          <div style={{ display: 'flex', gap: '0.25rem' }}>
                            <input
                              type="number"
                              min={1}
                              value={editTaskDuration}
                              onChange={(e) => setEditTaskDuration(e.target.value)}
                              style={{ flex: 1, padding: '0.5rem', border: '1px solid var(--color-border)', borderRadius: 'var(--radius)' }}
                            />
                            <select
                              value={editTaskDurationUnit}
                              onChange={(e) => setEditTaskDurationUnit(e.target.value)}
                              style={{ padding: '0.5rem', border: '1px solid var(--color-border)', borderRadius: 'var(--radius)', background: 'white' }}
                            >
                              <option value="minutes">min</option>
                              <option value="hours">hrs</option>
                            </select>
                          </div>
                        </div>
                        
                        <div>
                          <label style={{ display: 'block', marginBottom: '0.25rem', fontSize: '0.875rem', fontWeight: 500 }}>Start Time</label>
                          <input
                            type="datetime-local"
                            value={editTaskStartAt}
                            onChange={(e) => setEditTaskStartAt(e.target.value)}
                            style={{ width: '100%', padding: '0.5rem', border: '1px solid var(--color-border)', borderRadius: 'var(--radius)' }}
                          />
                        </div>
                      </div>
                      
                      <div style={{ display: 'flex', gap: '0.5rem', justifyContent: 'flex-end' }}>
                        <button
                          onClick={cancelTaskEdit}
                          style={{ padding: '0.5rem 0.75rem', border: '1px solid var(--color-border)', borderRadius: 'var(--radius)', background: 'white', cursor: 'pointer' }}
                        >
                          <X style={{ fontSize: 14 }} /> Cancel
                        </button>
                        <button
                          onClick={saveTaskEdit}
                          disabled={!editTaskText.trim()}
                          style={{ 
                            padding: '0.5rem 0.75rem', 
                            border: 'none', 
                            borderRadius: 'var(--radius)', 
                            background: editTaskText.trim() ? 'var(--color-primary)' : '#ccc', 
                            color: 'white', 
                            cursor: editTaskText.trim() ? 'pointer' : 'not-allowed' 
                          }}
                        >
                          <Save style={{ fontSize: 14 }} /> Save
                        </button>
                      </div>
                    </div>
                  ) : (
                    // View Mode
                    <>
                      <div style={{ 
                        color: 'var(--color-text)', 
                        textDecoration: task.status === 'completed' ? 'line-through' : 'none',
                        opacity: task.status === 'completed' ? 0.7 : 1,
                        display: 'flex',
                        alignItems: 'center',
                        gap: '0.5rem'
                      }}>
                        <span>{task.text}</span>
                        <span style={{ 
                          fontSize: '0.75rem', 
                          padding: '0.2rem 0.5rem', 
                          borderRadius: '12px', 
                          background: task.status === 'pending' ? '#6b7280' : task.status === 'in-progress' ? '#f59e0b' : '#22c55e',
                          color: 'white',
                          fontWeight: 500
                        }}>
                          {task.status === 'in-progress' ? 'In Progress' : task.status.charAt(0).toUpperCase() + task.status.slice(1)}
                        </span>
                      </div>
                      
                      <div style={{ fontSize: '0.8rem', color: 'var(--color-text-light)', marginTop: 4, display: 'flex', gap: '1rem', flexWrap: 'wrap' }}>
                        <span>Created: {task.createdAt}</span>
                        <span>Duration: {task.durationMinutes >= 60 ? `${Math.floor(task.durationMinutes / 60)}h ${task.durationMinutes % 60}m` : `${task.durationMinutes}m`}</span>
                        {task.startAt && <span>Starts: {new Date(task.startAt).toLocaleString()}</span>}
                      </div>
                    </>
                  )}
                  
                  {editingTaskId !== task.id && (
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap', marginTop: 8 }}>
                      <div style={{ color: 'var(--color-text-light)', fontSize: '0.85rem' }}>Group:</div>
                      {/* None chip */}
                      <button
                        type="button"
                        onClick={() => setTaskGroup(task.id, "")}
                        style={{
                          padding: '0.2rem 0.6rem',
                          borderRadius: 999,
                          border: '1px solid var(--color-border)',
                          background: task.groupId ? 'var(--color-surface)' : 'var(--color-primary)',
                          color: task.groupId ? 'var(--color-text)' : 'white',
                          fontSize: '0.8rem',
                          cursor: 'pointer'
                        }}
                      >
                        None
                      </button>
                      {groups.map(g => {
                        const active = task.groupId === g.id;
                        return (
                          <button
                            key={g.id}
                            type="button"
                            onClick={() => setTaskGroup(task.id, g.id)}
                            title={`Assign to ${g.name}`}
                            style={{
                              padding: '0.2rem 0.6rem',
                              borderRadius: 999,
                              border: `1px solid ${active ? 'var(--color-primary)' : 'var(--color-border)'}`,
                              background: active ? 'var(--color-primary)' : 'var(--color-surface)',
                              color: active ? 'white' : 'var(--color-text)',
                              fontSize: '0.8rem',
                              cursor: 'pointer'
                            }}
                          >
                            {g.name}
                          </button>
                        );
                      })}
                    </div>
                  )}
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
                  {editingTaskId !== task.id && (
                    <button
                      onClick={() => startEditingTask(task.id)}
                      style={{ color: 'var(--color-primary)', background: 'none', border: 'none', cursor: 'pointer', padding: '0.25rem' }}
                      title="Edit task"
                    >
                      <Edit style={{ fontSize: 16 }} />
                    </button>
                  )}
                  <button
                    onClick={() => deleteTask(task.id)}
                    style={{ color: '#ef4444', background: 'none', border: 'none', cursor: 'pointer', padding: '0.25rem' }}
                    title="Delete task"
                  >
                    <Trash2 style={{ fontSize: 16 }} />
                  </button>
                </div>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
