import { useState, useMemo } from "react";
import { ListTodo, Plus, Trash2, Check, Upload, Download } from "lucide-react";
import Button from "../components/Button";
import TimeWheelPicker from "../components/TimeWheelPicker";
import { exportTasksToGoogle, importEventsFromGoogle } from "../services/googleCalendar";
import { notifyTaskAdded, notifyTaskCompleted, areNotificationsEnabled } from "../services/notifications";

export default function TaskSchedulerPage({ tasks: extTasks, setTasks: setExtTasks, groups: extGroups, setGroups: setExtGroups, googleSignedIn }) {
  const useProvidedOrLocal = (data, setter, initial) => (Array.isArray(data) && typeof setter === 'function') ? [data, setter] : useState(initial);
  const [tasks, setTasks] = useProvidedOrLocal(extTasks, setExtTasks, []);
  const [newTaskText, setNewTaskText] = useState("");
  const todayIso = () => new Date().toISOString().slice(0, 10);
  const toLocalDateTimeValue = (d = new Date()) => {
    // produce YYYY-MM-DDTHH:MM for <input type="datetime-local">
    const dt = new Date(d.getTime() - d.getTimezoneOffset() * 60000);
    return dt.toISOString().slice(0, 16);
  };
  const [newTaskStartAt, setNewTaskStartAt] = useState(toLocalDateTimeValue());
  const [newTaskDurationValue, setNewTaskDurationValue] = useState(3);
  const [newTaskDurationUnit, setNewTaskDurationUnit] = useState("days"); // minutes|hours|days
  const [newTaskDependsOn, setNewTaskDependsOn] = useState("");
  const [newTaskIsDaily, setNewTaskIsDaily] = useState(false);
  const [newTaskDaysCount, setNewTaskDaysCount] = useState(3);
  const [newTaskDailyStart, setNewTaskDailyStart] = useState("14:00");
  const [newTaskDailyEnd, setNewTaskDailyEnd] = useState("16:00");
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
    // compute dependency-adjusted start date/time
    let startAt = newTaskStartAt;
    let durationMinutes = toMinutes(newTaskDurationValue, newTaskDurationUnit);
    let deps = [];
    let groupId = newTaskGroupId || "";
    if (newTaskDependsOn) {
      const dep = findTaskById(newTaskDependsOn);
      if (dep && dep.startAt && (dep.durationMinutes || dep.duration)) {
        const depStart = parseDateTimeLocal(dep.startAt);
        const depEnd = addMinutes(depStart, dep.durationMinutes ?? (Number(dep.duration) * 24 * 60));
        if (!newTaskIsDaily) {
          const desired = parseDateTimeLocal(startAt);
          const minStart = addMinutes(depEnd, 1); // minute after dependency ends
          if (desired < minStart) {
            startAt = toLocalDateTimeValue(minStart);
          }
        }
      }
      deps = [String(newTaskDependsOn)];
      // Inherit dependency group if none chosen
      if (!groupId && dep && dep.groupId) {
        groupId = dep.groupId;
      }
    }

    let newTask;
    if (newTaskIsDaily) {
      // Daily window mode
      const reqStartDT = parseDateTimeLocal(startAt);
      let firstDay = floorToMidnight(reqStartDT);
      const dailyStartMin = parseTimeToMinutes(newTaskDailyStart);
      const dailyEndMinRaw = parseTimeToMinutes(newTaskDailyEnd);
      const dailyEndMin = Math.max(dailyStartMin + 30, dailyEndMinRaw); // at least 30 min
      // If dependency exists, push first day segment past dependency end
      if (newTaskDependsOn) {
        const dep = findTaskById(newTaskDependsOn);
        if (dep && dep.startAt && (dep.durationMinutes || dep.duration)) {
          const depStart = parseDateTimeLocal(dep.startAt);
          const depEnd = addMinutes(depStart, dep.durationMinutes ?? (Number(dep.duration) * 24 * 60));
          while (combineDateAndTime(firstDay, newTaskDailyStart) <= depEnd) {
            firstDay = addDays(firstDay, 1);
          }
        }
      }
      newTask = {
        id: Date.now(),
        text: newTaskText,
        completed: false,
        createdAt: new Date().toLocaleString(),
        mode: "daily",
        firstDay: firstDay.toISOString().slice(0,10),
        daysCount: Math.max(1, Number(newTaskDaysCount) || 1),
        dailyStart: toHHMM(dailyStartMin),
        dailyEnd: toHHMM(dailyEndMin),
        // representative start/duration for sorting
        startAt: toLocalDateTimeValue(combineDateAndTime(firstDay, toHHMM(dailyStartMin))),
        durationMinutes: (dailyEndMin - dailyStartMin),
        deps,
        groupId
      };
    } else {
      newTask = {
        id: Date.now(),
        text: newTaskText,
        completed: false,
        createdAt: new Date().toLocaleString(),
        mode: "continuous",
        startAt,
        durationMinutes,
        deps,
        groupId
      };
    }
    setTasks([newTask, ...tasks]);
    
    // Notify about new task
    if (areNotificationsEnabled()) {
      notifyTaskAdded(newTask);
    }
    
    setNewTaskText("");
    setNewTaskStartAt(toLocalDateTimeValue());
    setNewTaskDurationValue(3);
    setNewTaskDurationUnit("days");
    setNewTaskIsDaily(false);
    setNewTaskDaysCount(3);
    setNewTaskDailyStart("14:00");
    setNewTaskDailyEnd("16:00");
    setNewTaskDependsOn("");
    setNewTaskGroupId("");
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

  const setTaskGroup = (taskId, groupId) => {
    setTasks(prev => prev.map(t => t.id === taskId ? { ...t, groupId: groupId || "" } : t));
  };

  const totalTasks = tasks.length;
  const completedTasks = tasks.filter(task => task.completed).length;
  const pendingTasks = totalTasks - completedTasks;

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
      setTasks(prev => [...importedTasks, ...prev]);
      alert(`Imported ${importedTasks.length} events from Google Calendar`);
    } catch (error) {
      console.error('Import failed:', error);
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
        {googleSignedIn && (
          <div style={{ display: 'flex', gap: '0.5rem' }}>
            <Button onClick={handleExportToGoogle} className="btn-outline" title="Export tasks to Google Calendar">
              <Upload size={16} /> Export
            </Button>
            <Button onClick={handleImportFromGoogle} className="btn-outline" title="Import events from Google Calendar">
              <Download size={16} /> Import
            </Button>
          </div>
        )}
      </div>

      <div className="grid" style={{ gridTemplateColumns: 'repeat(3, 1fr)', gap: '1rem', marginBottom: '1.5rem' }}>
        <div style={{ background: 'linear-gradient(135deg, #eff6ff 0%, #dbeafe 100%)', borderRadius: 'var(--radius)', padding: '1.25rem' }}>
          <div style={{ color: 'var(--color-primary)', fontWeight: 700, fontSize: '2rem' }}>{totalTasks}</div>
          <div style={{ color: 'var(--color-text-light)', fontSize: '0.9rem' }}>Total Tasks</div>
        </div>
        <div style={{ background: 'linear-gradient(135deg, #ecfdf5 0%, #bbf7d0 100%)', borderRadius: 'var(--radius)', padding: '1.25rem' }}>
          <div style={{ color: '#22c55e', fontWeight: 700, fontSize: '2rem' }}>{completedTasks}</div>
          <div style={{ color: 'var(--color-text-light)', fontSize: '0.9rem' }}>Completed</div>
        </div>
        <div style={{ background: 'linear-gradient(135deg, #fff7ed 0%, #fed7aa 100%)', borderRadius: 'var(--radius)', padding: '1.25rem' }}>
          <div style={{ color: '#f97316', fontWeight: 700, fontSize: '2rem' }}>{pendingTasks}</div>
          <div style={{ color: 'var(--color-text-light)', fontSize: '0.9rem' }}>Pending</div>
        </div>
      </div>

      <div className="card" style={{ marginBottom: '1.5rem', background: 'linear-gradient(135deg, #fff 0%, #f3f4f6 100%)' }}>
        {/* Row 1: Basic task inputs */}
        <div className="flex gap-2" style={{ flexWrap: 'wrap', gap: '0.5rem', alignItems: 'center' }}>
          <input
            type="text"
            value={newTaskText}
            onChange={(e) => setNewTaskText(e.target.value)}
            onKeyPress={(e) => e.key === "Enter" && addTask()}
            placeholder="Enter a new task..."
            style={{ flex: 1, padding: '0.6rem 1rem', border: '1px solid var(--color-border)', borderRadius: 'var(--radius)', outline: 'none', fontSize: '1rem' }}
          />
          <input
            type="datetime-local"
            value={newTaskStartAt}
            onChange={(e) => setNewTaskStartAt(e.target.value)}
            title="Start date & time"
            style={{ padding: '0.6rem 0.8rem', border: '1px solid var(--color-border)', borderRadius: 'var(--radius)' }}
          />
          <select
            value={newTaskDependsOn}
            onChange={(e) => setNewTaskDependsOn(e.target.value)}
            title="Depends on"
            style={{ minWidth: 160, padding: '0.6rem 0.8rem', border: '1px solid var(--color-border)', borderRadius: 'var(--radius)', background: 'white' }}
          >
            <option value="">No dependency</option>
            {tasks.map(t => (
              <option key={t.id} value={t.id}>{t.text}</option>
            ))}
          </select>
          <select
            value={newTaskGroupId}
            onChange={(e) => setNewTaskGroupId(e.target.value)}
            title="Group"
            style={{ minWidth: 160, padding: '0.6rem 0.8rem', border: '1px solid var(--color-border)', borderRadius: 'var(--radius)', background: 'white' }}
          >
            <option value="">No group</option>
            {groups.map(g => (
              <option key={g.id} value={g.id}>{g.name}</option>
            ))}
          </select>
          <Button onClick={addTask} className="btn">
            <Plus style={{ fontSize: 16 }} /> Add Task
          </Button>
        </div>

        {/* Row 2: Daily window controls (placed on a distinct line) */}
        <div className="flex gap-2" style={{ gap: '0.5rem', alignItems: 'center', marginTop: '0.75rem' }}>
          <label style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
            <input type="checkbox" checked={newTaskIsDaily} onChange={(e) => setNewTaskIsDaily(e.target.checked)} />
            <span style={{ color: 'var(--color-text-light)' }}>Daily time window</span>
          </label>
          {newTaskIsDaily && (
            <>
              <div style={{ display: 'inline-flex', alignItems: 'center', gap: 8 }}>
                <div style={{ color: 'var(--color-text-light)' }}>Start</div>
                <TimeWheelPicker
                  value={newTaskDailyStart}
                  stepMinutes={5}
                  onChange={(v) => {
                    setNewTaskDailyStart(v);
                    // ensure end >= start + 30 min
                    const s = parseTimeToMinutes(v);
                    const e = parseTimeToMinutes(newTaskDailyEnd);
                    if (e <= s + 30) {
                      const adjusted = (s + 30) % (24 * 60);
                      const hh = String(Math.floor(adjusted / 60)).padStart(2, '0');
                      const mm = String(adjusted % 60).padStart(2, '0');
                      setNewTaskDailyEnd(`${hh}:${mm}`);
                    }
                  }}
                />
              </div>
              <div style={{ display: 'inline-flex', alignItems: 'center', gap: 8 }}>
                <div style={{ color: 'var(--color-text-light)' }}>End</div>
                <TimeWheelPicker
                  value={newTaskDailyEnd}
                  stepMinutes={5}
                  onChange={(v) => {
                    // ensure end >= start + 30 min
                    const s = parseTimeToMinutes(newTaskDailyStart);
                    const e = parseTimeToMinutes(v);
                    if (e <= s + 30) {
                      const adjusted = (s + 30) % (24 * 60);
                      const hh = String(Math.floor(adjusted / 60)).padStart(2, '0');
                      const mm = String(adjusted % 60).padStart(2, '0');
                      setNewTaskDailyEnd(`${hh}:${mm}`);
                    } else {
                      setNewTaskDailyEnd(v);
                    }
                  }}
                />
              </div>
              <input
                type="number"
                min={1}
                value={newTaskDaysCount}
                onChange={(e) => setNewTaskDaysCount(e.target.value)}
                title="Number of days"
                style={{ width: 140, padding: '0.5rem 0.75rem', border: '1px solid var(--color-border)', borderRadius: 'var(--radius)' }}
              />
            </>
          )}
          {!newTaskIsDaily && (
            <>
              <input
                type="number"
                min={1}
                value={newTaskDurationValue}
                onChange={(e) => setNewTaskDurationValue(e.target.value)}
                title="Duration"
                style={{ width: 120, padding: '0.5rem 0.75rem', border: '1px solid var(--color-border)', borderRadius: 'var(--radius)' }}
              />
              <select
                value={newTaskDurationUnit}
                onChange={(e) => setNewTaskDurationUnit(e.target.value)}
                title="Duration unit"
                style={{ padding: '0.5rem 0.75rem', border: '1px solid var(--color-border)', borderRadius: 'var(--radius)', background: 'white' }}
              >
                <option value="minutes">minutes</option>
                <option value="hours">hours</option>
                <option value="days">days</option>
              </select>
            </>
          )}
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
                <button
                  onClick={() => toggleTask(task.id)}
                  style={{ marginTop: 4, width: 22, height: 22, borderRadius: '50%', border: '2px solid', borderColor: task.completed ? '#22c55e' : 'var(--color-border)', background: task.completed ? '#22c55e' : 'transparent', display: 'flex', alignItems: 'center', justifyContent: 'center', transition: 'border-color 0.2s, background 0.2s' }}
                >
                  {task.completed && <Check style={{ fontSize: 14, color: 'white' }} />}
                </button>

                <div style={{ flex: 1 }}>
                  <div style={{ color: 'var(--color-text)', textDecoration: task.completed ? 'line-through' : 'none' }}>
                    {task.text}
                  </div>
                  <div style={{ fontSize: '0.8rem', color: 'var(--color-text-light)', marginTop: 4 }}>
                    Created: {task.createdAt}
                  </div>
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
                </div>

                <button
                  onClick={() => deleteTask(task.id)}
                  style={{ color: '#ef4444', background: 'none', border: 'none', cursor: 'pointer', transition: 'color 0.2s' }}
                >
                  <Trash2 style={{ fontSize: 18 }} />
                </button>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
