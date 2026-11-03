// @vitest-environment jsdom
import { describe, it, expect, afterEach } from 'vitest';
import { render, screen, cleanup } from '@testing-library/react';
import { FormattedChatMessage } from './FormattedChatMessage';
import { FormattedWorkoutDescription } from './FormattedWorkoutDescription';

afterEach(cleanup);

describe('FormattedChatMessage', () => {
  it('renders nothing for empty text', () => {
    const { container } = render(<FormattedChatMessage text="" />);
    expect(container.firstChild).toBeNull();
  });

  it('turns ### lines into headers without markdown markers', () => {
    render(<FormattedChatMessage text={'### **Plan**\nDrink water'} />);
    expect(screen.getByText('Plan')).toBeTruthy();
    expect(screen.getByText('Drink water')).toBeTruthy();
    expect(screen.queryByText(/###/)).toBeNull();
  });

  it('strips a ```json wrapper', () => {
    render(<FormattedChatMessage text={'```json\nhello\n```'} />);
    expect(screen.getByText('hello')).toBeTruthy();
    expect(screen.queryByText(/```/)).toBeNull();
  });
});

describe('FormattedWorkoutDescription', () => {
  it('renders nothing without a description', () => {
    const { container } = render(<FormattedWorkoutDescription description="" />);
    expect(container.firstChild).toBeNull();
  });

  it('renders text for a plain description', () => {
    const { container } = render(<FormattedWorkoutDescription description="Push-ups 3x12" />);
    expect(container.textContent).toContain('Pushups');
  });
});
