import { useMemo, useState, useEffect, useCallback } from "react";

/**
 * TimeWheelPicker
 * Props:
 * - value: string in format "HH:MM" (24-hour)
 * - onChange: (valueHHMM: string) => void
 * - stepMinutes?: number (default 5)
 * - height?: number (px) visual height of column (default 140)
 * - itemHeight?: number (px) height per row (default 28)
 */
export default function TimeWheelPicker({ value = "00:00", onChange, stepMinutes = 5, height = 140, itemHeight = 28 }) {
  const [hourIdx, setHourIdx] = useState(0);
  const [minuteIdx, setMinuteIdx] = useState(0);

  const hours = useMemo(() => Array.from({ length: 24 }, (_, i) => i), []);
  const minutes = useMemo(() => {
    const count = Math.floor(60 / stepMinutes);
    return Array.from({ length: count }, (_, i) => i * stepMinutes);
  }, [stepMinutes]);

  const visibleCount = Math.floor(height / itemHeight);
  const pad = Math.floor((visibleCount - 1) / 2); // items above and below

  const parseValue = useCallback((v) => {
    const [hh, mm] = (v || "00:00").split(":").map((n) => parseInt(n || 0, 10));
    return { hh: Math.max(0, Math.min(23, hh || 0)), mm: Math.max(0, Math.min(59, mm || 0)) };
  }, []);

  // Initialize indices from value (place in the middle of a large range to allow scrolling)
  useEffect(() => {
    const { hh, mm } = parseValue(value);
    setHourIdx(24 * 1000 + hh);
    const mi = minutes.indexOf(minutes.reduce((prev, curr) => (Math.abs(curr - mm) < Math.abs(prev - mm) ? curr : prev), minutes[0]));
    setMinuteIdx(minutes.length * 1000 + (mi >= 0 ? mi : 0));
  }, [value, minutes, parseValue]);

  const normHour = (idx) => ((idx % 24) + 24) % 24;
  const normMinuteIndex = (idx) => ((idx % minutes.length) + minutes.length) % minutes.length;

  const commit = (hIdx, mIdx) => {
    const h = normHour(hIdx);
    const m = minutes[normMinuteIndex(mIdx)];
    const hh = String(h).padStart(2, "0");
    const mm = String(m).padStart(2, "0");
    onChange && onChange(`${hh}:${mm}`);
  };

  const onWheelHours = (e) => {
    e.preventDefault();
    const delta = e.deltaY > 0 ? 1 : -1;
    setHourIdx((idx) => {
      const next = idx + delta;
      // commit immediately for responsiveness
      commit(next, minuteIdx);
      return next;
    });
  };
  const onWheelMinutes = (e) => {
    e.preventDefault();
    const delta = e.deltaY > 0 ? 1 : -1;
    setMinuteIdx((idx) => {
      const next = idx + delta;
      commit(hourIdx, next);
      return next;
    });
  };

  const incHour = (d) => setHourIdx((idx) => { const next = idx + d; commit(next, minuteIdx); return next; });
  const incMinute = (d) => setMinuteIdx((idx) => { const next = idx + d; commit(hourIdx, next); return next; });

  const renderItems = (centerIdx, list, normalize, format) => {
    const items = [];
    for (let i = -pad; i <= pad; i++) {
      const idx = centerIdx + i;
      const val = list(normalize(idx));
      items.push(
        <div key={i} className={`wheel-item ${i === 0 ? "active" : ""}`} style={{ height: itemHeight, lineHeight: `${itemHeight}px` }}>
          {format(val)}
        </div>
      );
    }
    return items;
  };

  return (
    <div className="time-wheel" style={{ height }}>
      <div className="wheel-col" onWheel={onWheelHours}>
        <button type="button" className="wheel-btn" onClick={() => incHour(-1)} aria-label="Hour up">▲</button>
        <div className="wheel-list" style={{ height: height - 2 * 24 }}>
          {renderItems(hourIdx, (i) => i, normHour, (n) => String(n).padStart(2, "0"))}
        </div>
        <button type="button" className="wheel-btn" onClick={() => incHour(1)} aria-label="Hour down">▼</button>
      </div>
      <div className="wheel-sep">:</div>
      <div className="wheel-col" onWheel={onWheelMinutes}>
        <button type="button" className="wheel-btn" onClick={() => incMinute(-1)} aria-label="Minute up">▲</button>
        <div className="wheel-list" style={{ height: height - 2 * 24 }}>
          {renderItems(minuteIdx, (i) => minutes[i], normMinuteIndex, (n) => String(n).padStart(2, "0"))}
        </div>
        <button type="button" className="wheel-btn" onClick={() => incMinute(1)} aria-label="Minute down">▼</button>
      </div>
      <div className="wheel-highlight" style={{ top: Math.floor(height / 2) - Math.floor(itemHeight / 2), height: itemHeight }} />
    </div>
  );
}
