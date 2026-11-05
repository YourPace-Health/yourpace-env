// @vitest-environment jsdom
import { describe, it, expect, vi, afterEach } from 'vitest';
import { render, screen, fireEvent, waitFor, cleanup } from '@testing-library/react';
import { ReminderSettings } from './ReminderSettings';

afterEach(cleanup);

const stored = {
  userId: 'u1',
  notificationsEnabled: true,
  pushEnabled: true,
  defaultRemindDaysBefore: 3,
  defaultNotifyTime: '09:00',
  timezone: 'Asia/Bangkok',
  skills: ''
};

const source = (over = {}) => ({
  getSettings: vi.fn().mockResolvedValue(stored),
  saveSettings: vi.fn(async (s) => s),
  ...over
});

describe('ReminderSettings', () => {
  it('loads and shows the saved settings', async () => {
    render(<ReminderSettings userToken="t" dataSource={source()} />);
    const checkbox = await screen.findByLabelText('เปิดการแจ้งเตือนทางอีเมล');
    expect(checkbox.checked).toBe(true);
    expect(screen.getByLabelText('เวลาที่ต้องการให้เตือน').value).toBe('09:00');
  });

  it('saves the full settings object with the change applied', async () => {
    const ds = source();
    render(<ReminderSettings userToken="tok" dataSource={ds} />);
    fireEvent.click(await screen.findByLabelText('เปิดการแจ้งเตือนทางอีเมล'));
    fireEvent.change(screen.getByLabelText('เวลาที่ต้องการให้เตือน'), { target: { value: '07:30' } });
    fireEvent.click(screen.getByText('บันทึกการแจ้งเตือน'));

    await waitFor(() => expect(ds.saveSettings).toHaveBeenCalled());
    const [sent, token] = ds.saveSettings.mock.calls[0];
    expect(token).toBe('tok');
    // other fields are preserved because the backend overwrites every field
    expect(sent).toMatchObject({ timezone: 'Asia/Bangkok', defaultRemindDaysBefore: 3, defaultNotifyTime: '07:30' });
    expect(await screen.findByText('บันทึกการแจ้งเตือนเรียบร้อยแล้ว')).toBeTruthy();
  });

  it('disables the time input while reminders are off', async () => {
    render(<ReminderSettings userToken="t" dataSource={source({ getSettings: vi.fn().mockResolvedValue({ ...stored, notificationsEnabled: false }) })} />);
    const time = await screen.findByLabelText('เวลาที่ต้องการให้เตือน');
    expect(time.disabled).toBe(true);
  });

  it('shows an alert when saving fails', async () => {
    const ds = source({ saveSettings: vi.fn().mockRejectedValue(new Error('boom')) });
    render(<ReminderSettings userToken="t" dataSource={ds} />);
    fireEvent.click(await screen.findByText('บันทึกการแจ้งเตือน'));
    expect((await screen.findByRole('alert')).textContent).toBe('boom');
  });

  it('shows an alert when loading fails', async () => {
    const ds = source({ getSettings: vi.fn().mockRejectedValue(new Error('offline')) });
    render(<ReminderSettings userToken="t" dataSource={ds} />);
    expect((await screen.findByRole('alert')).textContent).toBe('offline');
  });
});
