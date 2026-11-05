import { useEffect, useState } from 'react';
import { Bell } from 'lucide-react';

const DEFAULT_TIME = '09:00';

/**
 * Lets the user switch workout reminder emails on or off and pick the time of day.
 * Backed by GET/PUT /users/setting; the server only emails users who turned this on.
 */
export function ReminderSettings({ userToken, dataSource }) {
  const [settings, setSettings] = useState(null);
  const [status, setStatus] = useState({ type: 'idle', message: '' });
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    let cancelled = false;
    dataSource
      .getSettings(userToken)
      .then((data) => {
        if (!cancelled) setSettings(data);
      })
      .catch((err) => {
        if (!cancelled) setStatus({ type: 'error', message: err.message });
      });
    return () => {
      cancelled = true;
    };
  }, [userToken, dataSource]);

  const save = async (event) => {
    event.preventDefault();
    setSaving(true);
    setStatus({ type: 'idle', message: '' });
    try {
      const saved = await dataSource.saveSettings(settings, userToken);
      setSettings(saved);
      setStatus({ type: 'success', message: 'บันทึกการแจ้งเตือนเรียบร้อยแล้ว' });
    } catch (err) {
      setStatus({ type: 'error', message: err.message });
    } finally {
      setSaving(false);
    }
  };

  if (!settings) {
    return status.type === 'error' ? (
      <p role="alert" style={{ color: '#b91c1c', marginTop: '32px' }}>{status.message}</p>
    ) : null;
  }

  return (
    <form
      onSubmit={save}
      aria-labelledby="reminder-heading"
      style={{ marginTop: '40px', padding: '24px', border: '1px solid #e2e8f0', borderRadius: '16px', background: '#fff' }}
    >
      <h2 id="reminder-heading" style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '18px', margin: '0 0 6px' }}>
        <Bell size={18} aria-hidden="true" /> แจ้งเตือนการออกกำลังกาย
      </h2>
      <p style={{ color: 'var(--text-muted)', fontSize: '14px', margin: '0 0 16px' }}>
        ส่งอีเมลเตือนในวันที่มีแผนออกกำลังกายที่ยังไม่ได้ทำ
      </p>

      <label style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '14px', fontWeight: 600 }}>
        <input
          type="checkbox"
          checked={!!settings.notificationsEnabled}
          onChange={(e) => setSettings({ ...settings, notificationsEnabled: e.target.checked })}
        />
        เปิดการแจ้งเตือนทางอีเมล
      </label>

      <label style={{ display: 'flex', flexDirection: 'column', gap: '6px', maxWidth: '220px', fontWeight: 600 }}>
        เวลาที่ต้องการให้เตือน
        <input
          type="time"
          value={settings.defaultNotifyTime || DEFAULT_TIME}
          disabled={!settings.notificationsEnabled}
          onChange={(e) => setSettings({ ...settings, defaultNotifyTime: e.target.value })}
          style={{ padding: '10px 12px', borderRadius: '10px', border: '1px solid #cbd5e1', fontSize: '15px' }}
        />
      </label>

      <div style={{ display: 'flex', alignItems: 'center', gap: '14px', marginTop: '18px' }}>
        <button type="submit" className="btn btn-primary" disabled={saving}>
          {saving ? 'กำลังบันทึก...' : 'บันทึกการแจ้งเตือน'}
        </button>
        <span
          role={status.type === 'error' ? 'alert' : 'status'}
          style={{ fontSize: '14px', color: status.type === 'error' ? '#b91c1c' : '#047857' }}
        >
          {status.message}
        </span>
      </div>
    </form>
  );
}
