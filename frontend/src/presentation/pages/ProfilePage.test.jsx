import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, waitFor, cleanup, act } from '@testing-library/react';
import { ProfilePage } from './ProfilePage';

const equipments = [
  { equipmentId: 'e1', name: 'Bodyweight', displayName: 'น้ำหนักตัว', icon: 'B' },
  { equipmentId: 'e2', name: 'Dumbbells', displayName: 'ดัมเบล', icon: 'D' },
];

const profile = {
  age: 31,
  gender: 'FEMALE',
  height: 165,
  weight: 70,
  targetWeight: 62,
  targetDate: '2027-01-15T00:00:00Z',
  fitnessGoal: 'LOSE_WEIGHT',
  equipmentOwned: ['Dumbbells'],
  physicalLimitations: ['Knee Pain'],
};

function json(body, ok = true) {
  return Promise.resolve({ ok, status: ok ? 200 : 400, json: () => Promise.resolve(body) });
}

// Routes fetch calls by URL and method; individual tests override pieces.
function stubApi(overrides = {}) {
  const calls = [];
  const handlers = {
    'GET /equipments': () => json(equipments),
    'GET /users/profile': () => json(profile),
    'PUT /users/profile': (init) => json({ ...profile, ...JSON.parse(init.body) }),
    'GET /users/setting': () => json({ notificationsEnabled: true, pushEnabled: true, defaultRemindDaysBefore: 1, defaultNotifyTime: '09:00', timezone: 'Asia/Bangkok' }),
    'PUT /users/setting': (init) => json(JSON.parse(init.body)),
    ...overrides,
  };
  vi.stubGlobal('fetch', vi.fn((url, init = {}) => {
    const path = url.replace(/^.*\/api/, '');
    const key = `${init.method || 'GET'} ${path}`;
    calls.push({ key, init });
    return (handlers[key] || (() => json({})))(init);
  }));
  return calls;
}

beforeEach(() => {
  vi.spyOn(console, 'error').mockImplementation(() => {});
});
afterEach(() => {
  cleanup();
  vi.useRealTimers();
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

const loaded = async () => screen.findByText('1. ข้อมูลสัดส่วนร่างกายและเป้าหมายน้ำหนัก');

describe('ProfilePage', () => {
  it('loads the profile and equipment list from the API', async () => {
    stubApi();
    const { container } = render(<ProfilePage userToken="T" onBackToDashboard={() => {}} />);
    expect(screen.getByText(/กำลังดึงข้อมูลสุขภาพ/)).toBeTruthy();
    await loaded();

    expect(container.querySelector('input[type="number"]').value).toBe('31');
    expect(container.querySelector('select').value).toBe('FEMALE');
    expect(container.querySelector('input[type="date"]').value).toBe('2027-01-15');
    expect(screen.getByText('Knee Pain', { selector: 'span' })).toBeTruthy();
    expect(screen.getAllByText(/ดัมเบล|Dumbbells/).length).toBeGreaterThan(0);
  });

  it('does not call the API without a token', () => {
    const calls = stubApi();
    render(<ProfilePage userToken={null} onBackToDashboard={() => {}} />);
    expect(calls.filter((c) => c.key.includes('/users/profile') || c.key.includes('/equipments'))).toHaveLength(0);
  });

  it('uses defaults when the profile is empty', async () => {
    stubApi({ 'GET /users/profile': () => json({ weight: 80 }), 'GET /equipments': () => json(null) });
    const { container } = render(<ProfilePage userToken="T" onBackToDashboard={() => {}} />);
    await loaded();
    const numbers = container.querySelectorAll('input[type="number"]');
    expect(numbers[2].value).toBe('80'); // weight
    expect(numbers[3].value).toBe('80'); // target weight falls back to current weight
    expect(container.querySelector('input[type="date"]').value).toMatch(/^\d{4}-\d{2}-\d{2}$/);
  });

  it('shows an error when loading fails', async () => {
    stubApi({ 'GET /equipments': () => json({ error: 'down' }, false) });
    render(<ProfilePage userToken="T" onBackToDashboard={() => {}} />);
    expect(await screen.findByText(/ไม่สามารถโหลดข้อมูลประวัติสุขภาพ/)).toBeTruthy();
  });

  it('saves edited values and returns to the dashboard', async () => {
    const calls = stubApi();
    const onBack = vi.fn();
    const onUpdated = vi.fn();
    const { container } = render(<ProfilePage userToken="T" onBackToDashboard={onBack} onProfileUpdateSuccess={onUpdated} />);
    await loaded();
    vi.useFakeTimers({ shouldAdvanceTime: true });

    const numbers = container.querySelectorAll('input[type="number"]');
    fireEvent.change(numbers[0], { target: { value: '33' } });
    fireEvent.change(container.querySelector('select'), { target: { value: 'OTHER' } });
    fireEvent.change(numbers[1], { target: { value: '171' } });
    fireEvent.change(numbers[2], { target: { value: '68.5' } });
    fireEvent.change(numbers[3], { target: { value: '60' } });
    fireEvent.change(container.querySelector('input[type="date"]'), { target: { value: '2027-03-01' } });
    fireEvent.click(screen.getByText('สร้างกล้ามเนื้อ').closest('button'));
    fireEvent.click(screen.getByText(/น้ำหนักตัว/, { selector: 'button *, button' }));

    fireEvent.submit(container.querySelector('form'));
    expect(await screen.findByText(/บันทึกข้อมูลสุขภาพและเป้าหมายของคุณสำเร็จ/)).toBeTruthy();

    const put = calls.find((c) => c.key === 'PUT /users/profile');
    const sent = JSON.parse(put.init.body);
    expect(sent).toMatchObject({ age: 33, gender: 'OTHER', height: 171, weight: 68.5, targetWeight: 60, targetDate: '2027-03-01', fitnessGoal: 'GAIN_MUSCLE' });
    expect(sent.equipmentOwned).toContain('Bodyweight');
    expect(onUpdated).toHaveBeenCalled();

    await act(async () => {
      vi.advanceTimersByTime(2000);
    });
    expect(onBack).toHaveBeenCalled();
  });

  it('reports a failed save and keeps the form', async () => {
    stubApi({ 'PUT /users/profile': () => json({ error: 'สูงเกินไป' }, false) });
    const onBack = vi.fn();
    const { container } = render(<ProfilePage userToken="T" onBackToDashboard={onBack} />);
    await loaded();
    fireEvent.submit(container.querySelector('form'));
    expect(await screen.findByText('สูงเกินไป')).toBeTruthy();
    expect(onBack).not.toHaveBeenCalled();
  });

  it('manages physical limitations: toggle presets, add a custom one, remove it', async () => {
    stubApi({ 'GET /users/profile': () => json({ ...profile, physicalLimitations: [] }) });
    const { container } = render(<ProfilePage userToken="T" onBackToDashboard={() => {}} />);
    await loaded();

    const preset = screen.getByText(/เจ็บหัวเข่า/).closest('button');
    fireEvent.click(preset);
    expect(screen.getAllByText('Knee Pain').length).toBeGreaterThan(0);
    fireEvent.click(preset);
    expect(screen.queryAllByText('Knee Pain', { selector: 'span' })).toHaveLength(0);

    const input = screen.getByPlaceholderText(/ปวดข้อมือซ้าย/);
    fireEvent.change(input, { target: { value: '  ปวดข้อมือ  ' } });
    fireEvent.click(screen.getByText('+ เพิ่มข้อจำกัด'));
    expect(screen.getByText('ปวดข้อมือ', { selector: 'span' })).toBeTruthy();
    expect(input.value).toBe('');

    // blanks and duplicates are ignored
    fireEvent.change(input, { target: { value: '   ' } });
    fireEvent.click(screen.getByText('+ เพิ่มข้อจำกัด'));
    fireEvent.change(input, { target: { value: 'ปวดข้อมือ' } });
    fireEvent.click(screen.getByText('+ เพิ่มข้อจำกัด'));
    expect(screen.getAllByText('ปวดข้อมือ', { selector: 'span' })).toHaveLength(1);

    const removeButton = container.querySelector('span button[type="button"]');
    fireEvent.click(removeButton);
    expect(screen.queryByText('ปวดข้อมือ', { selector: 'span' })).toBeNull();
  });

  it('sets the target date from the quick presets', async () => {
    stubApi();
    const { container } = render(<ProfilePage userToken="T" onBackToDashboard={() => {}} />);
    await loaded();
    const date = container.querySelector('input[type="date"]');
    const before = date.value;
    fireEvent.click(screen.getByText('+1 ปี'));
    expect(date.value).not.toBe(before);
    fireEvent.click(screen.getByText('+1 เดือน'));
    fireEvent.click(screen.getByText('+3 เดือน'));
    fireEvent.click(screen.getByText('+6 เดือน'));
    expect(date.value).toMatch(/^\d{4}-\d{2}-\d{2}$/);
  });

  it('navigates back from the header and the cancel button', async () => {
    stubApi();
    const onBack = vi.fn();
    render(<ProfilePage userToken="T" onBackToDashboard={onBack} />);
    await loaded();
    fireEvent.click(screen.getByText('ย้อนกลับไปที่ Dashboard').closest('button'));
    fireEvent.click(screen.getByText('ยกเลิก'));
    expect(onBack).toHaveBeenCalledTimes(2);
    await waitFor(() => expect(screen.getByText('บันทึกประวัติสุขภาพ')).toBeTruthy());
  });
});
