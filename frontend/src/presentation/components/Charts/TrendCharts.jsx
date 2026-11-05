import { useEffect, useMemo, useState } from 'react';
import { API_BASE_URL } from '../../../config/api';
import { buildSeries, lastDays, linePaths, summarize } from './trendData';

const DAYS = 14;
const W = 280;
const H = 90;

async function getJson(path, token) {
  const res = await fetch(`${API_BASE_URL}${path}`, { headers: { Authorization: `Bearer ${token}` } });
  if (!res.ok) throw new Error(`${path} ${res.status}`);
  const body = res.status === 204 ? [] : await res.json();
  return Array.isArray(body) ? body : [];
}

function Sparkline({ title, unit, color, series, dates, min, max, digits = 1 }) {
  const { paths, points } = useMemo(() => linePaths(series, W, H, { min, max }), [series, min, max]);
  const summary = summarize(series);

  const label = summary
    ? `${title}: ${summary.count} วันที่มีข้อมูลใน ${DAYS} วันล่าสุด ล่าสุด ${summary.latest.toFixed(digits)} ${unit}` +
      (summary.count > 1 ? ` เปลี่ยนแปลง ${summary.change > 0 ? '+' : ''}${summary.change} ${unit}` : '')
    : `${title}: ยังไม่มีข้อมูลใน ${DAYS} วันล่าสุด`;

  return (
    <figure style={{ margin: 0, padding: '16px', border: '1px solid #e2e8f0', borderRadius: '14px', background: '#fff' }}>
      <figcaption style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: '8px' }}>
        <span style={{ fontWeight: 700, fontSize: '14px' }}>{title}</span>
        <span style={{ fontSize: '12px', color: '#64748b' }}>
          {summary ? `${summary.latest.toFixed(digits)} ${unit}` : 'ไม่มีข้อมูล'}
        </span>
      </figcaption>
      <svg viewBox={`0 0 ${W} ${H}`} role="img" aria-label={label} style={{ width: '100%', height: 'auto', display: 'block' }}>
        <title>{label}</title>
        <line x1="0" y1={H - 1} x2={W} y2={H - 1} stroke="#e2e8f0" />
        {paths.map((p) => (
          <polyline key={p} points={p} fill="none" stroke={color} strokeWidth="2" strokeLinejoin="round" strokeLinecap="round" />
        ))}
        {points.map((pt) => (
          <circle key={pt.index} cx={pt.x} cy={pt.y} r="3" fill={color}>
            <title>{`${dates[pt.index]}: ${pt.value} ${unit}`}</title>
          </circle>
        ))}
      </svg>
      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '11px', color: '#94a3b8', marginTop: '4px' }}>
        <span>{dates[0].slice(5)}</span>
        <span>{dates[dates.length - 1].slice(5)}</span>
      </div>
    </figure>
  );
}

/** 14-day trends for weight, water intake and mood/energy check-ins. */
export function TrendCharts({ userToken, refreshKey }) {
  const [data, setData] = useState({ weight: [], water: [], checkins: [] });
  const [failed, setFailed] = useState(false);
  const dates = useMemo(() => lastDays(DAYS), []);

  useEffect(() => {
    if (!userToken) return undefined;
    let cancelled = false;
    Promise.all([
      getJson('/health/weight/history', userToken),
      getJson('/water/history', userToken),
      getJson('/checkin/history', userToken),
    ])
      .then(([weight, water, checkins]) => {
        if (!cancelled) setData({ weight, water, checkins });
      })
      .catch(() => {
        if (!cancelled) setFailed(true);
      });
    return () => {
      cancelled = true;
    };
  }, [userToken, refreshKey]);

  const weight = buildSeries(data.weight, dates, (r) => r.logDate, (r) => r.weight);
  const water = buildSeries(data.water, dates, (r) => r.logDate, (r) => r.glasses);
  const mood = buildSeries(data.checkins, dates, (r) => r.checkinDate, (r) => r.emotionalState);
  const energy = buildSeries(data.checkins, dates, (r) => r.checkinDate, (r) => r.energyLevel);

  if (failed) {
    return <p role="alert" style={{ color: '#b91c1c' }}>โหลดข้อมูลแนวโน้มไม่สำเร็จ</p>;
  }

  return (
    <section aria-labelledby="trend-heading" style={{ marginBottom: '24px' }}>
      <h3 id="trend-heading" style={{ fontSize: '16px', margin: '0 0 12px' }}>แนวโน้ม {DAYS} วันล่าสุด</h3>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '16px' }}>
        <Sparkline title="น้ำหนัก" unit="กก." color="#0ea5e9" series={weight} dates={dates} />
        <Sparkline title="น้ำดื่ม" unit="แก้ว" color="#10b981" series={water} dates={dates} min={0} digits={0} />
        <Sparkline title="อารมณ์ (1-5)" unit="คะแนน" color="#f59e0b" series={mood} dates={dates} min={1} max={5} digits={0} />
        <Sparkline title="พลังงาน (1-5)" unit="คะแนน" color="#8b5cf6" series={energy} dates={dates} min={1} max={5} digits={0} />
      </div>
    </section>
  );
}
