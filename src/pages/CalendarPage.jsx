import { useMemo, useState } from "react";
import Button from "../components/Button";

export default function CalendarPage({ tasks = [] }) {
  const [currentDate, setCurrentDate] = useState(new Date());

  const getDaysInMonth = (year, month) => new Date(year, month + 1, 0).getDate();
  const getFirstDayOfMonth = (year, month) => new Date(year, month, 1).getDay();

  const previousMonth = () => setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() - 1, 1));
  const nextMonth = () => setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 1));
  const goToToday = () => setCurrentDate(new Date());

  const year = currentDate.getFullYear();
  const month = currentDate.getMonth();
  const daysInMonth = getDaysInMonth(year, month);
  const firstDay = getFirstDayOfMonth(year, month);
  const today = new Date();
  const isCurrentMonth = today.getMonth() === month && today.getFullYear() === year;
  const todayDate = today.getDate();
  const monthName = currentDate.toLocaleDateString("en-US", { month: "long", year: "numeric" });
  const dayNames = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

  // Helpers borrowed from TaskScheduler for interpreting times
  const floorToMidnight = (d) => new Date(d.getFullYear(), d.getMonth(), d.getDate());
  const addDays = (date, days) => new Date(date.getTime() + days * 24 * 60 * 60000);
  const parseDateTimeLocal = (val) => new Date(val);
  const parseTimeToMinutes = (hhmm) => {
    const [hh, mm] = (hhmm || "00:00").split(":").map(n => parseInt(n || 0, 10));
    return (hh * 60) + (mm || 0);
  };
  const combineDateAndTime = (dateOnly, hhmm) => new Date(floorToMidnight(dateOnly).getTime() + parseTimeToMinutes(hhmm) * 60000);

  // Build a map of YYYY-MM-DD -> [{id, text, mode}]
  const tasksByDate = useMemo(() => {
    const map = new Map();
    const toDateKey = (d) => {
      const year = d.getFullYear();
      const month = String(d.getMonth() + 1).padStart(2, '0');
      const day = String(d.getDate()).padStart(2, '0');
      return `${year}-${month}-${day}`;
    };
    const add = (d, t) => {
      const key = toDateKey(d);
      if (!map.has(key)) map.set(key, []);
      map.get(key).push({ id: t.id, text: t.text, mode: t.mode, completed: t.completed });
    };
    (tasks || []).forEach(t => {
      if (t.mode === 'daily') {
        const first = new Date(t.firstDay + 'T00:00:00');
        const count = Math.max(1, Number(t.daysCount) || 1);
        for (let i = 0; i < count; i++) add(addDays(first, i), t);
      } else if (t.startAt && (t.durationMinutes || t.duration)) {
        const start = parseDateTimeLocal(t.startAt);
        const durationMin = t.durationMinutes ?? (Number(t.duration) * 24 * 60);
        const end = new Date(start.getTime() + durationMin * 60000);
        let d = floorToMidnight(start);
        const endDay = floorToMidnight(end);
        while (d <= endDay) {
          add(d, t);
          d = addDays(d, 1);
        }
      }
    });
    return map;
  }, [tasks]);

  const calendarCells = [];
  for (let i = 0; i < firstDay; i++) calendarCells.push({ type: "empty", key: `empty-${i}` });
  for (let day = 1; day <= daysInMonth; day++) {
    calendarCells.push({ type: "day", day, isToday: isCurrentMonth && day === todayDate, key: `day-${day}` });
  }

  return (
    <div className="container" style={{ background: 'linear-gradient(135deg, #f8fafc 0%, #e0e7ff 100%)', minHeight: '100vh' }}>
      <div style={{ marginBottom: '2rem' }}>
        <h1 style={{ color: 'var(--color-text)', fontWeight: 700, fontSize: '2rem', marginBottom: '0.75rem' }}>Calendar</h1>
        <p style={{ color: 'var(--color-text-light)' }}>View dates and plan ahead</p>
      </div>

      <div className="card" style={{ marginBottom: '1.5rem', background: 'linear-gradient(135deg, #fff 0%, #f3f4f6 100%)' }}>
        <div className="flex justify-between" style={{ alignItems: 'center' }}>
          <Button variant="ghost" onClick={previousMonth}>← Previous</Button>
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '0.5rem' }}>
            <div style={{ fontWeight: 700, fontSize: '1.5rem', color: 'var(--color-text)' }}>{monthName}</div>
            <Button className="btn" onClick={goToToday} style={{ fontSize: '0.85rem', padding: '0.4rem 0.8rem' }}>Today</Button>
          </div>
          <Button variant="ghost" onClick={nextMonth}>Next →</Button>
        </div>
      </div>

      <div className="card" style={{ background: 'linear-gradient(135deg, #fff 0%, #f3f4f6 100%)' }}>
        <div className="grid" style={{ gridTemplateColumns: 'repeat(7, 1fr)', gap: '0.5rem', marginBottom: '0.5rem' }}>
          {dayNames.map(day => (
            <div key={day} style={{ textAlign: 'center', fontWeight: 600, color: 'var(--color-text-light)', fontSize: '0.95rem', padding: '0.5rem 0' }}>
              {day}
            </div>
          ))}
        </div>

        <div className="grid" style={{ gridTemplateColumns: 'repeat(7, 1fr)', gap: '0.5rem' }}>
          {calendarCells.map(cell => cell.type === "empty" ? (
            <div key={cell.key} style={{ aspectRatio: '1 / 1' }} />
          ) : (
            (() => {
              const monthStr = String(month + 1).padStart(2, '0');
              const dayStr = String(cell.day).padStart(2, '0');
              const dateStr = `${year}-${monthStr}-${dayStr}`;
              const items = tasksByDate.get(dateStr) || [];
              const preview = items.slice(0, 3);
              const extra = items.length - preview.length;
              return (
                <div
                  key={cell.key}
                  style={{
                    aspectRatio: '1 / 1',
                    display: 'flex',
                    flexDirection: 'column',
                    borderRadius: 'var(--radius)',
                    border: '1px solid var(--color-border)',
                    background: cell.isToday ? 'linear-gradient(135deg, #f0f7ff 0%, #e6eeff 100%)' : 'white',
                    color: 'var(--color-text)',
                    boxShadow: cell.isToday ? 'var(--shadow-sm)' : 'none',
                    padding: '0.4rem',
                    overflow: 'hidden'
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 6 }}>
                    <div style={{
                      width: 28, height: 28, borderRadius: 8,
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      fontWeight: 700,
                      color: cell.isToday ? 'white' : 'var(--color-text)',
                      background: cell.isToday ? 'linear-gradient(135deg, #2563eb 0%, #9333ea 100%)' : '#f3f4f6',
                      border: cell.isToday ? 'none' : '1px solid var(--color-border)'
                    }}>{cell.day}</div>
                    {items.length > 0 && (
                      <div style={{ fontSize: '0.75rem', color: 'var(--color-text-light)' }}>{items.length} task{items.length > 1 ? 's' : ''}</div>
                    )}
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                    {preview.map(t => (
                      <div key={t.id} title={t.text} style={{
                        fontSize: '0.75rem',
                        whiteSpace: 'nowrap',
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                        padding: '2px 6px',
                        borderRadius: 999,
                        background: t.completed ? 'linear-gradient(90deg, #22c55e, #16a34a)' : 'linear-gradient(90deg, #2563eb, #9333ea)',
                        color: 'white'
                      }}>
                        {t.text}
                      </div>
                    ))}
                    {extra > 0 && (
                      <div style={{ fontSize: '0.75rem', color: 'var(--color-text-light)' }}>+{extra} more</div>
                    )}
                  </div>
                </div>
              );
            })()
          ))}
        </div>
      </div>

      <div style={{ marginTop: '1.5rem', background: 'linear-gradient(135deg, #eff6ff 0%, #dbeafe 100%)', borderRadius: 'var(--radius)', padding: '1rem', border: '1px solid #93c5fd' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.95rem', color: 'var(--color-text-light)' }}>
          <div style={{ width: 16, height: 16, background: 'linear-gradient(135deg, #2563eb 0%, #9333ea 100%)', borderRadius: '50%' }}></div>
          <span>Today's date is highlighted in blue</span>
        </div>
      </div>
    </div>
  );
}
