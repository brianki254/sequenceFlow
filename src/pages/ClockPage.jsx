import { useState, useEffect } from "react";
import { Play, Pause, Square, RotateCcw, Timer, Clock } from "lucide-react";

export default function ClockPage() {
  const [currentTime, setCurrentTime] = useState(new Date());
  
  // Countdown Timer State
  const [countdownMinutes, setCountdownMinutes] = useState(5);
  const [countdownSeconds, setCountdownSeconds] = useState(0);
  const [countdownTimeLeft, setCountdownTimeLeft] = useState(0);
  const [countdownRunning, setCountdownRunning] = useState(false);
  const [countdownFinished, setCountdownFinished] = useState(false);
  
  // Stopwatch State
  const [stopwatchTime, setStopwatchTime] = useState(0);
  const [stopwatchRunning, setStopwatchRunning] = useState(false);

  useEffect(() => {
    const intervalId = setInterval(() => setCurrentTime(new Date()), 1000);
    return () => clearInterval(intervalId);
  }, []);
  
  // Countdown Timer Effect
  useEffect(() => {
    let intervalId;
    if (countdownRunning && countdownTimeLeft > 0) {
      intervalId = setInterval(() => {
        setCountdownTimeLeft(prev => {
          if (prev <= 1) {
            setCountdownRunning(false);
            setCountdownFinished(true);
            // Play notification sound or show alert
            if ('Notification' in window && Notification.permission === 'granted') {
              new Notification('Timer Finished!', {
                body: 'Your countdown timer has reached zero.',
                icon: '/favicon.ico'
              });
            } else {
              alert('Timer finished!');
            }
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    }
    return () => clearInterval(intervalId);
  }, [countdownRunning, countdownTimeLeft]);
  
  // Stopwatch Effect
  useEffect(() => {
    let intervalId;
    if (stopwatchRunning) {
      intervalId = setInterval(() => {
        setStopwatchTime(prev => prev + 1);
      }, 10); // Update every 10ms for more precision
    }
    return () => clearInterval(intervalId);
  }, [stopwatchRunning]);

  const hours = currentTime.getHours();
  const minutes = currentTime.getMinutes();
  const seconds = currentTime.getSeconds();
  const displayHours = hours % 12 || 12;
  const ampm = hours >= 12 ? "PM" : "AM";
  const pad = (num) => num.toString().padStart(2, "0");
  
  // Countdown Timer Functions
  const startCountdown = () => {
    const totalSeconds = countdownMinutes * 60 + countdownSeconds;
    if (totalSeconds > 0) {
      setCountdownTimeLeft(totalSeconds);
      setCountdownRunning(true);
      setCountdownFinished(false);
    }
  };
  
  const pauseCountdown = () => {
    setCountdownRunning(false);
  };
  
  const resetCountdown = () => {
    setCountdownRunning(false);
    setCountdownTimeLeft(0);
    setCountdownFinished(false);
  };
  
  const formatCountdownTime = (seconds) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${pad(mins)}:${pad(secs)}`;
  };
  
  // Stopwatch Functions
  const startStopwatch = () => {
    setStopwatchRunning(true);
  };
  
  const pauseStopwatch = () => {
    setStopwatchRunning(false);
  };
  
  const resetStopwatch = () => {
    setStopwatchRunning(false);
    setStopwatchTime(0);
  };
  
  const formatStopwatchTime = (centiseconds) => {
    const totalSeconds = Math.floor(centiseconds / 100);
    const minutes = Math.floor(totalSeconds / 60);
    const seconds = totalSeconds % 60;
    const cs = centiseconds % 100;
    return `${pad(minutes)}:${pad(seconds)}.${pad(cs)}`;
  };

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

      <div className="grid" style={{ gridTemplateColumns: 'repeat(2, 1fr)', gap: '1rem', marginBottom: '2rem' }}>
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
      
      {/* Countdown Timer Section */}
      <div className="card" style={{ marginBottom: '2rem', background: countdownFinished ? 'linear-gradient(135deg, #fef2f2 0%, #fecaca 100%)' : 'linear-gradient(135deg, #fff7ed 0%, #fed7aa 100%)' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '1.5rem' }}>
          <Timer style={{ fontSize: '1.5rem', color: '#f97316' }} />
          <h2 style={{ margin: 0, color: 'var(--color-text)', fontSize: '1.5rem', fontWeight: 600 }}>Countdown Timer</h2>
        </div>
        
        <div style={{ textAlign: 'center', marginBottom: '1.5rem' }}>
          <div style={{ 
            fontSize: '3rem', 
            fontWeight: 700, 
            fontFamily: 'monospace', 
            color: countdownTimeLeft > 0 ? '#f97316' : countdownFinished ? '#ef4444' : 'var(--color-text)',
            marginBottom: '1rem'
          }}>
            {countdownTimeLeft > 0 ? formatCountdownTime(countdownTimeLeft) : formatCountdownTime(countdownMinutes * 60 + countdownSeconds)}
          </div>
          
          {countdownFinished && (
            <div style={{ color: '#ef4444', fontWeight: 600, fontSize: '1.2rem', marginBottom: '1rem' }}>
              🎉 Timer Finished!
            </div>
          )}
        </div>
        
        {!countdownRunning && countdownTimeLeft === 0 && (
          <div style={{ display: 'flex', gap: '1rem', marginBottom: '1.5rem', alignItems: 'center', justifyContent: 'center', flexWrap: 'wrap' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <label style={{ color: 'var(--color-text)', fontWeight: 500 }}>Minutes:</label>
              <input
                type="number"
                min="0"
                max="60"
                value={countdownMinutes}
                onChange={(e) => setCountdownMinutes(Math.max(0, parseInt(e.target.value) || 0))}
                style={{ width: '80px', padding: '0.5rem', border: '1px solid var(--color-border)', borderRadius: 'var(--radius)' }}
              />
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <label style={{ color: 'var(--color-text)', fontWeight: 500 }}>Seconds:</label>
              <input
                type="number"
                min="0"
                max="59"
                value={countdownSeconds}
                onChange={(e) => setCountdownSeconds(Math.max(0, Math.min(59, parseInt(e.target.value) || 0)))}
                style={{ width: '80px', padding: '0.5rem', border: '1px solid var(--color-border)', borderRadius: 'var(--radius)' }}
              />
            </div>
          </div>
        )}
        
        <div style={{ display: 'flex', gap: '0.5rem', justifyContent: 'center', flexWrap: 'wrap' }}>
          {!countdownRunning ? (
            <button
              onClick={startCountdown}
              disabled={countdownMinutes === 0 && countdownSeconds === 0}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '0.5rem',
                padding: '0.75rem 1.5rem',
                background: (countdownMinutes === 0 && countdownSeconds === 0) ? '#ccc' : '#f97316',
                color: 'white',
                border: 'none',
                borderRadius: 'var(--radius)',
                cursor: (countdownMinutes === 0 && countdownSeconds === 0) ? 'not-allowed' : 'pointer',
                fontWeight: 600
              }}
            >
              <Play style={{ fontSize: '1rem' }} /> Start
            </button>
          ) : (
            <button
              onClick={pauseCountdown}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '0.5rem',
                padding: '0.75rem 1.5rem',
                background: '#f59e0b',
                color: 'white',
                border: 'none',
                borderRadius: 'var(--radius)',
                cursor: 'pointer',
                fontWeight: 600
              }}
            >
              <Pause style={{ fontSize: '1rem' }} /> Pause
            </button>
          )}
          
          <button
            onClick={resetCountdown}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '0.5rem',
              padding: '0.75rem 1.5rem',
              background: '#6b7280',
              color: 'white',
              border: 'none',
              borderRadius: 'var(--radius)',
              cursor: 'pointer',
              fontWeight: 600
            }}
          >
            <RotateCcw style={{ fontSize: '1rem' }} /> Reset
          </button>
        </div>
      </div>
      
      {/* Stopwatch Section */}
      <div className="card" style={{ background: 'linear-gradient(135deg, #f0f9ff 0%, #bfdbfe 100%)' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '1.5rem' }}>
          <Clock style={{ fontSize: '1.5rem', color: '#2563eb' }} />
          <h2 style={{ margin: 0, color: 'var(--color-text)', fontSize: '1.5rem', fontWeight: 600 }}>Stopwatch</h2>
        </div>
        
        <div style={{ textAlign: 'center', marginBottom: '1.5rem' }}>
          <div style={{ 
            fontSize: '3rem', 
            fontWeight: 700, 
            fontFamily: 'monospace', 
            color: '#2563eb',
            marginBottom: '1rem'
          }}>
            {formatStopwatchTime(stopwatchTime)}
          </div>
        </div>
        
        <div style={{ display: 'flex', gap: '0.5rem', justifyContent: 'center', flexWrap: 'wrap' }}>
          {!stopwatchRunning ? (
            <button
              onClick={startStopwatch}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '0.5rem',
                padding: '0.75rem 1.5rem',
                background: '#2563eb',
                color: 'white',
                border: 'none',
                borderRadius: 'var(--radius)',
                cursor: 'pointer',
                fontWeight: 600
              }}
            >
              <Play style={{ fontSize: '1rem' }} /> Start
            </button>
          ) : (
            <button
              onClick={pauseStopwatch}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '0.5rem',
                padding: '0.75rem 1.5rem',
                background: '#1d4ed8',
                color: 'white',
                border: 'none',
                borderRadius: 'var(--radius)',
                cursor: 'pointer',
                fontWeight: 600
              }}
            >
              <Pause style={{ fontSize: '1rem' }} /> Pause
            </button>
          )}
          
          <button
            onClick={resetStopwatch}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '0.5rem',
              padding: '0.75rem 1.5rem',
              background: '#6b7280',
              color: 'white',
              border: 'none',
              borderRadius: 'var(--radius)',
              cursor: 'pointer',
              fontWeight: 600
            }}
          >
            <RotateCcw style={{ fontSize: '1rem' }} /> Reset
          </button>
        </div>
      </div>
    </div>
  );
}
