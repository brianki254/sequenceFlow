import { useState, useEffect } from "react";

export default function ClockPage() {
  const [currentTime, setCurrentTime] = useState(new Date());

  useEffect(() => {
    const intervalId = setInterval(() => setCurrentTime(new Date()), 1000);
    return () => clearInterval(intervalId);
  }, []);

  const hours = currentTime.getHours();
  const minutes = currentTime.getMinutes();
  const seconds = currentTime.getSeconds();
  const displayHours = hours % 12 || 12;
  const ampm = hours >= 12 ? "PM" : "AM";
  const pad = (num) => num.toString().padStart(2, "0");

  const timeString = `${pad(displayHours)}:${pad(minutes)}:${pad(seconds)}`;
  const dateString = currentTime.toLocaleDateString("en-US", {
    weekday: "long", year: "numeric", month: "long", day: "numeric"
  });
  const timezone = Intl.DateTimeFormat().resolvedOptions().timeZone;

  return (
    <div className="container" style={{ background: 'linear-gradient(135deg, #f8fafc 0%, #e0e7ff 100%)', minHeight: '100vh' }}>
      <div style={{ marginBottom: '2rem' }}>
        <h1 style={{ color: 'var(--color-text)', fontWeight: 700, fontSize: '2rem', marginBottom: '0.75rem' }}>Clock</h1>
        <p style={{ color: 'var(--color-text-light)' }}>Current time and date</p>
      </div>

      <div style={{ background: 'linear-gradient(135deg, #2563eb 0%, #9333ea 100%)', borderRadius: '1rem', boxShadow: 'var(--shadow-md)', padding: '3rem', color: 'white', textAlign: 'center', marginBottom: '1.5rem' }}>
        <div style={{ fontSize: '4rem', fontWeight: 700, fontFamily: 'monospace', marginBottom: '0.5rem', letterSpacing: '0.05em' }}>{timeString}</div>
        <div style={{ fontSize: '1.5rem', fontWeight: 500, marginBottom: '1.5rem', opacity: 0.9 }}>{ampm}</div>
        <div style={{ fontSize: '1.2rem', opacity: 0.9 }}>{dateString}</div>
      </div>

      <div className="grid" style={{ gridTemplateColumns: 'repeat(2, 1fr)', gap: '1rem' }}>
        <div className="card">
          <div style={{ color: 'var(--color-text-light)', marginBottom: '0.5rem', fontSize: '0.95rem' }}>Timezone</div>
          <div style={{ color: 'var(--color-text)', fontWeight: 600, fontSize: '1.2rem' }}>{timezone}</div>
        </div>

        <div className="card">
          <div style={{ color: 'var(--color-text-light)', marginBottom: '0.5rem', fontSize: '0.95rem' }}>24-Hour Format</div>
          <div style={{ color: 'var(--color-text)', fontWeight: 600, fontSize: '1.2rem' }}>
            {pad(hours)}:{pad(minutes)}:{pad(seconds)}
          </div>
        </div>
      </div>
    </div>
  );
}
