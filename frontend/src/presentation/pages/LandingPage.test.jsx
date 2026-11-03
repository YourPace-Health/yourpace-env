// @vitest-environment jsdom
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
});
