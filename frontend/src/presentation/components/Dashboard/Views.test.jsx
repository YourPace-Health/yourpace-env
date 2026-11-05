// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, cleanup, fireEvent } from '@testing-library/react';
import { SchedulesView } from './SchedulesView';
import { NutritionView } from './NutritionView';
import { ProgressView } from './ProgressView';

beforeEach(() => {
  vi.stubGlobal('fetch', vi.fn(async () => new Response('[]', { status: 200 })));
});
afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
});

const fn = () => vi.fn();

const schedulesProps = (over = {}) => ({
  calendarEvents: [],
  calendarLoading: false,
  cardioSteps: 0,
  completedPlansCount: 1,
  getScheduleId: (s) => s.scheduleId,
  getSessionToken: () => 'tok',
  handleConnectCalendar: fn(),
  handleDeleteAllSchedules: fn(),
  handleDeleteSchedule: fn(),
  handleOpenWarmupGuide: fn(),
  handleToggleCardioTarget: fn(),
  handleToggleGCalEvent: fn(),
  handleToggleScheduleStatus: fn(),
  handleWaterGlassesChange: fn(),
  isCalendarConnected: false,
  isN8nPlanning: false,
  isProfilePending: false,
  loadCalendarEvents: fn(),
  schedulesLoading: false,
  setShowLogBurnModal: fn(),
  setShowN8nPlanModal: fn(),
  setWorkoutTab: fn(),
  targetDistanceKm: 3,
  targetSteps: 4000,
  targetWaterGlasses: 10,
  totalBurned: 320,
  totalPlansCount: 3,
  upcomingPlansCount: 2,
  waterGlasses: 4,
  workoutSchedules: [],
  workoutTab: 'plan',
  ...over
});

describe('SchedulesView', () => {
  it('renders with no schedules and wires the main action buttons', () => {
    const p = schedulesProps();
    const { container } = render(<SchedulesView {...p} />);
    expect(container.firstChild).toBeTruthy();
    container.querySelectorAll('button').forEach((b) => fireEvent.click(b));
    // at least the log-burn / planner / tab buttons are connected to handlers
    const calls = p.setShowLogBurnModal.mock.calls.length + p.setShowN8nPlanModal.mock.calls.length + p.setWorkoutTab.mock.calls.length;
    expect(calls).toBeGreaterThan(0);
  });

  it('shows the water glass count from props', () => {
    const { container } = render(<SchedulesView {...schedulesProps({ waterGlasses: 7 })} />);
    expect(container.textContent).toContain('7');
  });

  it('renders the history tab without crashing', () => {
    const { container } = render(<SchedulesView {...schedulesProps({ workoutTab: 'history' })} />);
    expect(container.firstChild).toBeTruthy();
  });
});

const nutritionProps = (over = {}) => ({
  coachFeedback: null,
  energyBalance: null,
  getSessionToken: () => 'tok',
  handleDeleteMeal: fn(),
  handleWaterGlassesChange: fn(),
  loadCoachFeedback: fn(),
  loadEnergyBalance: fn(),
  loadWeeklyNutrition: fn(),
  nutritionSubTab: 'tracker',
  setMealAnalysisPreview: fn(),
  setMealForm: fn(),
  setMealModalMode: fn(),
  setNutritionSubTab: fn(),
  setPhotoBase64: fn(),
  setPhotoPreview: fn(),
  setShowLogMealModal: fn(),
  targetWaterGlasses: 10,
  todayMealsSummary: null,
  totalBurned: 0,
  userProfile: { targetCalories: 2000 },
  waterGlasses: 3,
  weeklyNutrition: null,
  ...over
});

describe('NutritionView', () => {
  it('renders each sub-tab without data', () => {
    for (const tab of ['tracker', 'energy', 'hydration', 'analytics', 'coach']) {
      const { container, unmount } = render(<NutritionView {...nutritionProps({ nutritionSubTab: tab })} />);
      expect(container.firstChild).toBeTruthy();
      unmount();
    }
  });

  it('switches sub-tab when a tab button is clicked', () => {
    const p = nutritionProps();
    const { container } = render(<NutritionView {...p} />);
    container.querySelectorAll('button').forEach((b) => fireEvent.click(b));
    expect(p.setNutritionSubTab).toHaveBeenCalled();
  });
});

const progressProps = (over = {}) => ({
  currentUser: { name: 'Tester' },
  getSessionToken: () => 'tok',
  handleFetchWeeklyRecap: fn(),
  isRecapLoading: false,
  milestonesList: [],
  progressAnalytics: null,
  setShowLogWeightModal: fn(),
  setWeightForm: fn(),
  weeklyRecapData: null,
  ...over
});

describe('ProgressView', () => {
  it('renders with no analytics yet and includes the trend charts', () => {
    const { container } = render(<ProgressView {...progressProps()} />);
    expect(container.firstChild).toBeTruthy();
    expect(container.textContent).toContain('แนวโน้ม');
  });

  it('opens the weight modal from a button', () => {
    const p = progressProps();
    const { container } = render(<ProgressView {...p} />);
    container.querySelectorAll('button').forEach((b) => fireEvent.click(b));
    expect(p.setShowLogWeightModal).toHaveBeenCalledWith(true);
  });
});
