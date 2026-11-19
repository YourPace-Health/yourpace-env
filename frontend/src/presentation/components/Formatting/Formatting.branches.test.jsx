import { describe, it, expect, afterEach } from 'vitest';
import { render, cleanup } from '@testing-library/react';
import { FormattedChatMessage } from './FormattedChatMessage';
import { FormattedWorkoutDescription } from './FormattedWorkoutDescription';

afterEach(cleanup);

describe('FormattedChatMessage structures', () => {
  it('renders rules, bullets, numbered items and bold text', () => {
    const text = [
      '### **Header**',
      '---',
      '* **Bold bullet** and more',
      '• plain bullet with **bold**',
      '- dash bullet',
      '',
      '1. first **step**',
      '2. second step',
      'Normal line with **bold** inside',
      '***',
    ].join('\n');
    const { container } = render(<FormattedChatMessage text={text} />);
    expect(container.querySelectorAll('hr').length).toBe(2);
    expect(container.querySelectorAll('strong').length).toBeGreaterThanOrEqual(4);
    expect(container.textContent).toContain('first step');
    expect(container.textContent).toContain('dash bullet');
    expect(container.textContent).toContain('Normal line with bold inside');
  });
});

describe('FormattedWorkoutDescription structured exercises', () => {
  const item = '[Name: Squat, Description: 3 x 12, MuscleGroup: Legs, EquipmentNeeded: Dumbbells, BurnRate: 8, DifficultyLevel: EASY]';

  it('renders parsed exercises with benefit and calories', () => {
    const { container } = render(
      <FormattedWorkoutDescription description={`${item} | ประโยชน์: แข็งแรง] | เผาผลาญประมาณ: 200 kcal]`} />
    );
    expect(container.textContent).toContain('Squat');
    expect(container.textContent).toContain('💪 Legs');
    expect(container.textContent).toContain('🧘 Dumbbells');
    expect(container.textContent).toContain('แข็งแรง');
    expect(container.textContent).toContain('200 kcal');
  });

  it('renders parsed exercises without extras', () => {
    const { container } = render(<FormattedWorkoutDescription description={item} />);
    expect(container.textContent).toContain('Squat');
    expect(container.textContent).not.toContain('ประโยชน์');
  });

  it('shows only a benefit or only calories', () => {
    const a = render(<FormattedWorkoutDescription description={`${item} | ประโยชน์: ดี`} />);
    expect(a.container.textContent).toContain('ดี');
    expect(a.container.textContent).not.toContain('เผาผลาญประมาณ');
    cleanup();
    const b = render(<FormattedWorkoutDescription description={`${item} | เผาผลาญประมาณ: 90`} />);
    expect(b.container.textContent).toContain('90');
    expect(b.container.textContent).not.toContain('ประโยชน์');
  });
});

describe('FormattedWorkoutDescription fallback text', () => {
  it('splits bullet lists, reads metadata in parentheses and drops headings', () => {
    const text = [
      'รายการท่าฝึก: • Squat - ต้นขา (กล้ามเนื้อ: ขา | อุปกรณ์: ดัมเบล)',
      '• Plank',
      '• # heading',
      '• --- rule',
      '• อุปกรณ์',
      '• คำแนะนำ ทั่วไป',
      '• Push-up – อก ประโยชน์: ดี',
    ].join(' ');
    const { container } = render(<FormattedWorkoutDescription description={text} />);
    expect(container.textContent).toContain('Squat');
    expect(container.textContent).toContain('💪 ขา');
    expect(container.textContent).toContain('⚙️ ดัมเบล');
    expect(container.textContent).toContain('Plank');
    expect(container.textContent).not.toContain('heading');
    expect(container.textContent).toContain('ประโยชน์');
  });

  it('splits plain newline lists and shows calories', () => {
    const text = 'Jog - warm up\nSprint\n(อุปกรณ์: เชือก)\nประโยชน์: หัวใจ\nเผาผลาญประมาณ: 150 kcal';
    const { container } = render(<FormattedWorkoutDescription description={text} />);
    expect(container.textContent).toContain('Jog');
    expect(container.textContent).toContain('Sprint');
    expect(container.textContent).toContain('หัวใจ');
    expect(container.textContent).toContain('150 kcal');
  });

  it('skips metadata-only names and handles equipment-only items', () => {
    const text = '• กล้ามเนื้อ (กล้ามเนื้อ: แขน)\n• Row (อุปกรณ์: บาร์)';
    const { container } = render(<FormattedWorkoutDescription description={text} />);
    expect(container.textContent).toContain('Row');
    expect(container.textContent).toContain('⚙️ บาร์');
  });
});
