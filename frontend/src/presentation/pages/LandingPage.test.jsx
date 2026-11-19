import { describe, it, expect, vi, afterEach } from 'vitest';
import { render, screen, fireEvent, cleanup } from '@testing-library/react';
import { LandingPage } from './LandingPage';

afterEach(cleanup);

const props = () => ({
  onGetStarted: vi.fn(),
  checkinStatus: null,
  isAnalyzing: false,
  aiRecommendation: '',
  handleCheckin: vi.fn(),
  equipmentOptions: [],
  selectedEquipment: [],
  handleEquipmentToggle: vi.fn()
});

describe('LandingPage', () => {
  it('sends visitors to sign-in from the nav button', () => {
    const p = props();
    render(<LandingPage {...p} />);
    fireEvent.click(screen.getAllByText('Get Started')[0]);
    expect(p.onGetStarted).toHaveBeenCalled();
  });

  it('renders the footer', () => {
    render(<LandingPage {...props()} />);
    expect(screen.getByText(/All rights reserved/)).toBeTruthy();
  });

  it('lets visitors pick equipment', () => {
    const p = {
      ...props(),
      equipmentOptions: [{ id: 'dumbbell', name: 'Dumbbells', icon: 'D' }, { id: 'mat', name: 'Yoga Mat', icon: 'M' }],
      selectedEquipment: ['mat'],
    };
    render(<LandingPage {...p} />);
    fireEvent.click(screen.getByText('Dumbbells'));
    expect(p.handleEquipmentToggle).toHaveBeenCalledWith('dumbbell');
    expect(screen.getAllByText('✓')).toHaveLength(1);
  });

  it('sends every mood check-in to the handler', () => {
    const p = props();
    const { container } = render(<LandingPage {...p} />);
    const moodButtons = [...container.querySelectorAll('button')].filter((b) => /\S/.test(b.textContent) && !/Sign In|Get Started|เริ่ม|ลอง/.test(b.textContent));
    moodButtons.forEach((b) => fireEvent.click(b));
    const moods = p.handleCheckin.mock.calls.map((c) => c[0]);
    expect(moods).toEqual(expect.arrayContaining(['energetic', 'tired', 'stressed', 'focused']));
  });

  it('shows the placeholder, the spinner and then the recommendation', () => {
    const { rerender } = render(<LandingPage {...props()} />);
    expect(screen.getByText(/กดเลือกสภาพร่างกายด้านบน/)).toBeTruthy();

    rerender(<LandingPage {...props()} checkinStatus="tired" isAnalyzing />);
    expect(screen.getByText(/AI กำลังวิเคราะห์/)).toBeTruthy();

    const p = { ...props(), checkinStatus: 'focused', aiRecommendation: 'Try intervals today', equipmentOptions: [{ id: 'mat', name: 'Mat', icon: 'M' }], selectedEquipment: ['mat'] };
    rerender(<LandingPage {...p} />);
    expect(screen.getByText('Try intervals today')).toBeTruthy();
    fireEvent.click(screen.getByText(/บันทึกแผนและเริ่มใช้งานจริง/));
    expect(p.onGetStarted).toHaveBeenCalled();
  });

  it('scrolls to the top from the logo and exposes the other call-to-action buttons', () => {
    window.scrollTo = vi.fn();
    const p = props();
    const { container } = render(<LandingPage {...p} />);
    fireEvent.click(container.querySelector('.logo-container'));
    expect(window.scrollTo).toHaveBeenCalledWith({ top: 0, behavior: 'smooth' });

    fireEvent.click(screen.getByText('Sign In'));
    container.querySelectorAll('.btn-large').forEach((b) => fireEvent.click(b));
    expect(p.onGetStarted.mock.calls.length).toBeGreaterThan(2);
  });
});
