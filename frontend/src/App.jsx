import { useState, useEffect } from 'react';
import { useMentorChat } from './presentation/hooks/useMentorChat';
import { useMealTracker } from './presentation/hooks/useMealTracker';
import { useHealthInsights } from './presentation/hooks/useHealthInsights';
import { useGoogleCalendar } from './presentation/hooks/useGoogleCalendar';
import { useBurnLogger } from './presentation/hooks/useBurnLogger';
import { useWarmupGuide } from './presentation/hooks/useWarmupGuide';
import { useWaterTracker } from './presentation/hooks/useWaterTracker';
import { SchedulesView } from './presentation/components/Dashboard/SchedulesView';
import { NutritionView } from './presentation/components/Dashboard/NutritionView';
import { ProgressView } from './presentation/components/Dashboard/ProgressView';
import { clickable } from './presentation/utils/a11y';
import { API_BASE_URL } from './config/api';
import {
  Bot,
  Calendar,
  CheckCircle,
  LogOut,
  Flame,
  AlertTriangle,
  Settings,
  X,
  BarChart3,
  Medal,
  Utensils
} from 'lucide-react';
import { AuthPage } from './presentation/pages/AuthPage';
import { LogBurnModal } from './presentation/components/Workout/LogBurnModal';
import { LogMealModal } from './presentation/components/Meals/LogMealModal';
import { LogWeightModal } from './presentation/components/Health/LogWeightModal';
import { N8nPlanModal } from './presentation/components/Workout/N8nPlanModal';
import { WarmupCooldownModal } from './presentation/components/Workout/WarmupCooldownModal';
import { ChatWidget } from './presentation/components/Chat/ChatWidget';
import { LandingPage } from './presentation/pages/LandingPage';
import { ProfilePage } from './presentation/pages/ProfilePage';
import { useHistoryRoute } from './presentation/hooks/useHistoryRoute';
import { useAuthViewModel } from './presentation/hooks/useAuthViewModel';
import { MentorApiDataSource } from './data/datasources/MentorApiDataSource';
import { AuthApiDataSource } from './data/datasources/AuthApiDataSource';
import { MealApiDataSource } from './data/datasources/MealApiDataSource';

const mentorApiDataSource = new MentorApiDataSource();
const authDataSource = new AuthApiDataSource();
const mealDataSource = new MealApiDataSource();

import { FormattedWorkoutDescription } from './presentation/components/Formatting/FormattedWorkoutDescription';

// Re-exported for existing importers
export { FormattedWorkoutDescription };

function App() {
  const {
    currentUser,
    setCurrentUser,
    checkSession,
    isLoading: _authLoading,
    logout,
    error,
    setError,
    successMessage,
    setSuccessMessage,
    verifyMagicLink
  } = useAuthViewModel();

  // Helper to extract session token from storage
  const getSessionToken = () => {
    const localData = localStorage.getItem("yourpace_session");
    if (localData) return JSON.parse(localData).token;
    const sessionData = sessionStorage.getItem("yourpace_session");
    if (sessionData) return JSON.parse(sessionData).token;
    return null;
  };

  // URL-synced routing: 'landing' | 'auth' | 'dashboard' | 'profile'
  const [currentRoute, setCurrentRoute] = useHistoryRoute();

  // Profile status
  const [userProfile, setUserProfile] = useState(null);
  const [_profileLoading, setProfileLoading] = useState(false);

  // Schedules state
  const [workoutSchedules, setWorkoutSchedules] = useState([]);
  const [schedulesLoading, setSchedulesLoading] = useState(false);
  const [_scheduleGenerating, _setScheduleGenerating] = useState(false);

  // Cardio Target state (Steps & Distance)
  const [cardioSteps, setCardioSteps] = useState(0);
  const targetSteps = 8000;
  const targetDistanceKm = (targetSteps * 0.00075).toFixed(1); // 6.0 km

  const handleCompleteCardioTarget = async () => {
    const token = getSessionToken();
    if (!token) return;

    const alreadyCompleted = workoutSchedules.some(s => s.status === 'COMPLETED' && s.title.includes('เป้าหมายคาร์ดิโอ'));
    if (alreadyCompleted) {
      setCardioSteps(targetSteps);
      setSuccessMessage(`ℹ️ คุณได้บันทึกความสำเร็จเป้าหมายคาร์ดิโอประจำวันนี้ไว้เรียบร้อยแล้ว`);
      return;
    }

    const burnedCal = 320;
    setCardioSteps(targetSteps);

    try {
      const response = await fetch(getApiUrl("/schedules/log-burn"), {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${token}`
        },
        body: JSON.stringify({
          title: `🏃 เดิน/วิ่งตามเป้าหมายคาร์ดิโอ (${targetSteps.toLocaleString()} ก้าว / ~${targetDistanceKm} กม.)`,
          durationMinutes: 60,
          burnedCalories: burnedCal
        })
      });

      if (response.ok) {
        setSuccessMessage(`🎉 ยินดีด้วย! คุณสะสมคาร์ดิโอครบ ${targetSteps.toLocaleString()} ก้าว (~${targetDistanceKm} กม.) สำเร็จตามเป้าหมายแล้ว! (+${burnedCal} kcal)`);
        await loadUserData();
      }
    } catch (err) {
      console.error("Complete cardio target error:", err);
    }
  };

  const getScheduleId = (s) => s ? (s.scheduleId || s.schedule_id || s.scheduleID) : null;

  const handleToggleCardioTarget = async () => {
    const token = getSessionToken();
    if (!token) return;

    if (cardioSteps >= targetSteps) {
      setCardioSteps(0);
      setSuccessMessage("↩️ ยกเลิกสถานะทำสำเร็จเป้าหมายคาร์ดิโอเรียบร้อยแล้ว");
      const match = workoutSchedules.find(s => s.title.includes('เป้าหมายคาร์ดิโอ'));
      const targetId = getScheduleId(match);
      if (targetId) {
        await handleDeleteSchedule(targetId);
        await loadUserData();
      }
    } else {
      await handleCompleteCardioTarget();
    }
  };

  // Dashboard calculations based on real completed schedules
  const [totalBurned, setTotalBurned] = useState(0);
  const {
    showLogBurnModal,
    setShowLogBurnModal,
    workoutPresets,
    calculateEndTimeString,
    burnForm,
    setBurnForm,
    isSavingBurnLog,
    isCalculatingAiBurn,
    aiBurnExplanation,
    aiIntensityMap,
    handleSelectPreset,
    handleCalculateBurnWithN8N,
    handleBurnDurationChange,
    handleBurnIntensityChange,
    handleSaveBurnLog,
  } = useBurnLogger({
    getSessionToken,
    getApiUrl: (path) => getApiUrl(path),
    getIsCalendarConnected: () => isCalendarConnected,
    setSuccessMessage,
    setWorkoutTab: (tab) => setWorkoutTab(tab),
    loadUserData: () => loadUserData(),
    loadCalendarEvents: (token) => loadCalendarEvents(token)
  });

  const [showN8nPlanModal, setShowN8nPlanModal] = useState(false);
  const [n8nCustomNote, setN8nCustomNote] = useState('');
  const [n8nDaysCount, setN8nDaysCount] = useState(3);
  const [workoutTab, setWorkoutTab] = useState('plan'); // 'plan' | 'history'

  const {
    showWarmupModal,
    setShowWarmupModal,
    warmupSelectedTab,
    setWarmupSelectedTab,
    warmupCategory,
    setWarmupCategory,
    warmupModalTitle,
    completedWarmupIds,
    setCompletedWarmupIds,
    handleOpenWarmupGuide,
    handleToggleWarmupCheck,
  } = useWarmupGuide();

  const {
    waterGlasses,
    setWaterGlasses,
    targetWaterGlasses,
    setTargetWaterGlasses,
    handleWaterGlassesChange,
  } = useWaterTracker({ authDataSource });

  // Check-in simulator states (for landing page demo)
  const [checkinStatus, setCheckinStatus] = useState(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [aiRecommendation, setAiRecommendation] = useState('');

  // Dashboard AI Chat real state
  const {
    chatMessage,
    setChatMessage,
    isChatLoading,
    isChatHistoryLoading,
    chatLog,
    setChatLog,
    chatEndRef,
    isChatOpen,
    setIsChatOpen,
    loadChatHistory,
    handleClearChatHistory,
    handleSendChatMessage,
  } = useMentorChat({ getSessionToken, mentorApiDataSource });

  // Daily Tasks Mock in Dashboard (fallback or minor tasks)
  const [_dailyTasks, _setDailyTasks] = useState([
    { id: 1, text: 'ดื่มน้ำให้ครบ 2.5 ลิตร', done: true },
    { id: 2, text: 'บันทึกปริมาณแคลอรี่ในมื้อเที่ยง', done: true },
  ]);


  // Main Dashboard View Mode: 'schedules' (แผนการซ้อม & ตารางงาน) | 'progress' (ความคืบหน้า & สถิติ)
  const [dashboardMainTab, setDashboardMainTab] = useState('schedules');


  // Health Progress & Trends Analytics States
  const [progressAnalytics, setProgressAnalytics] = useState(null);
  const [_analyticsLoading, setAnalyticsLoading] = useState(false);
  const [milestonesList, setMilestonesList] = useState([]);
  const {
    weeklyRecapData,
    isRecapLoading,
    showLogWeightModal,
    setShowLogWeightModal,
    weightForm,
    setWeightForm,
    isSavingWeight,
    loadWeightHistory,
    handleFetchWeeklyRecap,
    handleSaveWeight,
  } = useHealthInsights({ getSessionToken, setSuccessMessage, getApiUrl: (path) => getApiUrl(path), loadUserData: (...a) => loadUserData(...a), loadProgressAnalytics: (...a) => loadProgressAnalytics(...a), loadMilestones: (...a) => loadMilestones(...a) });

  const {
    todayMealsSummary,
    showLogMealModal,
    setShowLogMealModal,
    mealModalMode,
    setMealModalMode,
    photoPreview,
    setPhotoPreview,
    setPhotoBase64,
    isAnalyzingPhoto,
    mealForm,
    setMealForm,
    mealAnalysisPreview,
    setMealAnalysisPreview,
    isAnalyzingMeal,
    isSavingMeal,
    nutritionSubTab,
    setNutritionSubTab,
    energyBalance,
    weeklyNutrition,
    coachFeedback,
    loadTodayMeals,
    loadEnergyBalance,
    loadWeeklyNutrition,
    loadCoachFeedback,
    handlePhotoFileSelect,
    handleAnalyzePhoto,
    handleAnalyzeMealPreview,
    handleSaveMeal,
    handleDeleteMeal,
  } = useMealTracker({ getSessionToken, mealDataSource });

  const {
    isCalendarConnected,
    calendarEvents,
    calendarLoading,
    loadCalendarStatus,
    loadCalendarEvents,
    handleConnectCalendar,
  } = useGoogleCalendar({ getSessionToken, getApiUrl: (path) => getApiUrl(path), setSuccessMessage });

  const getApiUrl = (path) => {
    return `${API_BASE_URL}${path}`;
  };

  // Fetch Progress Analytics
  const loadProgressAnalytics = async (token) => {
    setAnalyticsLoading(true);
    try {
      const response = await fetch(getApiUrl("/health/progress-analytics"), {
        headers: { "Authorization": `Bearer ${token}` }
      });
      if (response.ok) {
        const data = await response.json();
        setProgressAnalytics(data);
      }
    } catch (err) {
      console.error("Failed to load progress analytics:", err);
    } finally {
      setAnalyticsLoading(false);
    }
  };

  // Fetch Milestones
  const loadMilestones = async (token) => {
    try {
      const response = await fetch(getApiUrl("/milestones"), {
        headers: { "Authorization": `Bearer ${token}` }
      });
      if (response.ok) {
        const data = await response.json();
        setMilestonesList(data || []);
      }
    } catch (err) {
      console.error("Failed to load milestones:", err);
    }
  };

  // Load User Profile and Workout Schedules if logged in
  const loadUserData = async () => {
    const token = getSessionToken();
    if (!token) return;

    // Load Profile
    setProfileLoading(true);
    try {
      const response = await fetch(getApiUrl("/users/profile"), {
        headers: { "Authorization": `Bearer ${token}` }
      });
      if (response.ok) {
        const data = await response.json();
        setUserProfile(data);
      } else if (response.status === 401) {
        console.warn("Unauthorized token, logging out...");
        logout();
        setCurrentRoute('auth');
        return;
      }
    } catch (err) {
      console.error("Failed to load profile:", err);
    } finally {
      setProfileLoading(false);
    }

    // Load Calendar data
    const isConnected = await loadCalendarStatus(token);
    if (isConnected) {
      loadCalendarEvents(token);
    }

    // Load Water Intake from API
    try {
      const waterData = await authDataSource.getTodayWaterLog();
      if (waterData) {
        setWaterGlasses(waterData.glasses);
        if (waterData.targetGlasses) {
          setTargetWaterGlasses(waterData.targetGlasses);
        }
      }
    } catch (err) {
      console.error("Failed to load water log:", err);
    }

    // Load Schedules
    setSchedulesLoading(true);
    try {
      const response = await fetch(getApiUrl("/schedules"), {
        headers: { "Authorization": `Bearer ${token}` }
      });
      if (response.ok) {
        const data = await response.json();
        setWorkoutSchedules(data || []);

        // Calculate total calories burned
        const completed = data ? data.filter(s => s.status === 'COMPLETED') : [];
        const burned = completed.reduce((sum, s) => sum + (s.burnedCalories || 0), 0);
        setTotalBurned(burned);

        // Check if Cardio Target was already completed TODAY in DB
        const hasCardioCompletedToday = completed.some(s => {
          return (s.title || '').includes('เป้าหมายคาร์ดิโอ');
        });

        if (hasCardioCompletedToday) {
          setCardioSteps(8000);
        } else {
          setCardioSteps(0);
        }
      } else if (response.status === 401) {
        console.warn("Unauthorized token, logging out...");
        logout();
        setCurrentRoute('auth');
        return;
      }
    } catch (err) {
      console.error("Failed to load schedules:", err);
    } finally {
      setSchedulesLoading(false);
    }

    // Load Progress Analytics, Milestones, Weight History, Chat History, and Today Meals
    loadProgressAnalytics(token);
    loadMilestones(token);
    loadWeightHistory(token);
    loadChatHistory(token);
    loadTodayMeals(token);
  };

  useEffect(() => {
    if (currentUser) {
      setCurrentRoute('dashboard');
      loadUserData();
    } else {
      setUserProfile(null);
      setWorkoutSchedules([]);
      if (currentRoute === 'dashboard' || currentRoute === 'profile') {
        setCurrentRoute('landing');
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentUser]);

  // Check for calendar redirect status
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const googleCalendar = params.get("google-calendar");
    const calendarErr = params.get("calendar_error");

    if (googleCalendar === "connected") {
      setSuccessMessage("เชื่อมต่อกับ Google Calendar สำเร็จแล้ว! ดึงตารางงานของคุณเข้าสู่ระบบเรียบร้อย");
      setCurrentRoute('dashboard');
      const token = getSessionToken();
      if (token) {
        loadUserData();
      }
      // Clean URL
      const newUrl = window.location.pathname;
      window.history.replaceState({}, document.title, newUrl);
    } else if (calendarErr) {
      setError("การเชื่อมต่อ Google Calendar ล้มเหลว: " + calendarErr);
      setCurrentRoute('dashboard');
      const newUrl = window.location.pathname;
      window.history.replaceState({}, document.title, newUrl);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Check for Magic Link login token in URL query parameter
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const magicToken = params.get("magic-token");
    if (magicToken) {
      verifyMagicLink(magicToken)
        .then(() => {
          // Clean URL
          const newUrl = window.location.pathname;
          window.history.replaceState({}, document.title, newUrl);
        })
        .catch(() => {
          // Clean URL
          const newUrl = window.location.pathname;
          window.history.replaceState({}, document.title, newUrl);
        });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Equipment interactive list
  const [selectedEquipment, setSelectedEquipment] = useState(['bodyweight']);
  const equipmentOptions = [
    { id: 'bodyweight', name: 'น้ำหนักตัว (Bodyweight)', icon: '🏃' },
    { id: 'dumbbells', name: 'ดัมเบล (Dumbbells)', icon: '💪' },
    { id: 'resistance_bands', name: 'ยางยืดแรงต้าน (Bands)', icon: '🎗️' },
    { id: 'treadmill', name: 'ลู่วิ่ง (Treadmill)', icon: '👟' },
  ];

  const handleCheckin = (status) => {
    setCheckinStatus(status);
    setIsAnalyzing(true);

    setTimeout(() => {
      setIsAnalyzing(false);
      let recommendation;
      switch (status) {
        case 'energetic':
          recommendation = '🔋 พลังงานเต็มเปี่ยม! AI แนะนำโปรแกรม Strength Training หนัก 45 นาที ร่วมกับคาร์ดิโอความเข้มข้นสูง (HIIT) เพื่อเผาผลาญไขมันสูงสุด และแนะนำเน้นโปรตีนหลังออกกำลังกาย';
          break;
        case 'tired':
          recommendation = '😴 ร่างกายต้องการการฟื้นฟู! วันนี้ควรเน้นการยืดเหยียดโยคะ 20 นาที และเน้นดื่มน้ำมากๆ หลีกเลี่ยงคาร์ดิโอหนัก เพื่อช่วยให้กล้ามเนื้อได้คลายตัวและนอนหลับได้ดียิ่งขึ้น';
          break;
        case 'stressed':
          recommendation = '🧘 ผ่อนคลายจิตใจก่อน! แนะนำการฝึกหายใจ (Mindful Breathing) 5 นาที ผสมผสานกับการเดินเบาๆ (LISS) 15 นาที เพื่อลดฮอร์โมนความเครียด (Cortisol) และเพิ่มระดับฮอร์โมนแห่งความสุข';
          break;
        case 'focused':
          recommendation = '🎯 มีสมาธิดีเยี่ยม! เหมาะกับทักษะการออกกำลังกายที่ซับซ้อน เช่น การฝึกท่าบอดี้เวทขั้นสูง (Calisthenics) หรือการฝึกซ้อมความทนทานของกล้ามเนื้อ (Endurance)';
          break;
        default:
          recommendation = '';
      }
      setAiRecommendation(recommendation);
    }, 1000);
  };

  const handleEquipmentToggle = (id) => {
    if (selectedEquipment.includes(id)) {
      if (selectedEquipment.length > 1) {
        setSelectedEquipment(selectedEquipment.filter(item => item !== id));
      }
    } else {
      setSelectedEquipment([...selectedEquipment, id]);
    }
  };

  // n8n AI Workout Planning State & Handler
  const [isN8nPlanning, setIsN8nPlanning] = useState(false);

  const handlePlanFreeTimeWithN8N = async (e, noteOverride, daysOverride) => {
    if (e && e.preventDefault) e.preventDefault();
    const token = getSessionToken();
    if (!token) return;

    const noteToSend = noteOverride !== undefined ? noteOverride : n8nCustomNote;
    const daysToSend = daysOverride !== undefined ? daysOverride : n8nDaysCount;

    setIsN8nPlanning(true);
    setSuccessMessage("🤖 กำลังส่ง Prompt ข้อมูลสุขภาพ นัดหมายตารางงาน และเงื่อนไขเพิ่มเติมให้ n8n AI ออกแบบตาราง...");

    try {
      const response = await fetch(getApiUrl("/mentor/n8n-plan"), {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${token}`
        },
        body: JSON.stringify({
          calendarEvents: calendarEvents,
          userNote: noteToSend,
          daysCount: Number(daysToSend) || 3
        })
      });

      if (response.ok) {
        const data = await response.json();
        const userPromptMsg = noteToSend.trim()
          ? `🤖 วางแผนออกกำลังกายในเวลาว่าง (${daysToSend} วัน) โดยมีเงื่อนไขเพิ่มเติม: "${noteToSend.trim()}"`
          : `🤖 วางแผนออกกำลังกายในเวลาว่าง (${daysToSend} วัน) จาก Google Calendar ตามข้อมูลส่วนตัว`;

        setChatLog(prev => [
          ...prev,
          { sender: 'user', text: userPromptMsg },
          { sender: 'ai', text: data.response || 'n8n AI ดำเนินการวางแผนและสร้างตารางซ้อมเรียบร้อยแล้ว!' }
        ]);
        setIsChatOpen(true);
        setShowN8nPlanModal(false);
        setSuccessMessage("✨ n8n AI ออกแบบและสร้างตารางออกกำลังกายในเวลาว่างให้คุณเรียบร้อยแล้ว!");
        await loadUserData(); // Reload parsed AI schedules from DB
      } else {
        const errData = await response.json();
        setError(errData.error || "ไม่สามารถเชื่อมต่อกับ n8n AI ได้");
      }
    } catch (err) {
      console.error("n8n Planning error:", err);
      setError("เกิดข้อผิดพลาดในการเชื่อมต่อ n8n AI");
    } finally {
      setIsN8nPlanning(false);
    }
  };

  // Delete all workout schedules
  const handleDeleteAllSchedules = async () => {
    const token = getSessionToken();
    if (!token) return;

    if (!confirm("คุณต้องการลบตารางการออกกำลังกายทั้งหมดใช่หรือไม่? (ระบบจะลบทั้งในระบบและปฏิทินที่สร้างโดย yourPace)")) return;

    try {
      const response = await fetch(getApiUrl("/schedules"), {
        method: "DELETE",
        headers: { "Authorization": `Bearer ${token}` }
      });
      if (response.ok) {
        setWorkoutSchedules([]);
        setSuccessMessage("ลบตารางการออกกำลังกายทั้งหมดเรียบร้อยแล้ว!");
        // Refresh calendar events to reflect deleted YourPace events
        setTimeout(() => {
          loadCalendarEvents(token);
          loadUserData();
        }, 1200);
      }
    } catch (err) {
      console.error("Failed to delete all schedules:", err);
    }
  };


  // Delete individual schedule
  const handleDeleteSchedule = async (scheduleId) => {
    const token = getSessionToken();
    if (!token || !scheduleId) return;

    try {
      const response = await fetch(getApiUrl(`/schedules/${scheduleId}`), {
        method: "DELETE",
        headers: { "Authorization": `Bearer ${token}` }
      });
      if (response.ok) {
        setWorkoutSchedules(prev => prev.filter(s => getScheduleId(s) !== scheduleId));
      }
    } catch (err) {
      console.error("Failed to delete schedule:", err);
    }
  };

  // Complete Workout Schedule
  const handleCompleteSchedule = async (scheduleId) => {
    const token = getSessionToken();
    if (!token) return;

    try {
      const response = await fetch(getApiUrl(`/schedules/${scheduleId}/status`), {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${token}`
        },
        body: JSON.stringify({ status: "COMPLETED" })
      });
      if (response.ok) {
        setSuccessMessage("✨ บันทึกสถานะออกกำลังกายสำเร็จเรียบร้อยแล้ว!");
        await loadUserData(); // Reload to update burned calories
      }
    } catch (err) {
      console.error("Complete schedule error:", err);
    }
  };

  // Complete Google Calendar Event / n8n AI Workout Event and save to DB
  const handleCompleteGCalEvent = async (event) => {
    const token = getSessionToken();
    if (!token) return;

    // 1. Extract title, duration, burned calories
    const title = event.summary ? event.summary.replace(/\s*\(YourPaceEvent\)\s*/gi, '').trim() : 'การออกกำลังกาย';
    
    let durationMinutes = 60;
    let eventDateStr = "";
    if (event.start && event.end) {
      const s = new Date(event.start.dateTime || event.start.date);
      const e = new Date(event.end.dateTime || event.end.date);
      const diffMs = e.getTime() - s.getTime();
      if (diffMs > 0) {
        durationMinutes = Math.round(diffMs / (1000 * 60));
      }
      eventDateStr = (event.start.dateTime || event.start.date).split('T')[0];
    }

    let burnedCalories = 300;
    if (event.description) {
      const calMatch = event.description.match(/เผาผลาญประมาณ:\s*(\d+)/i) || 
                       event.description.match(/(\d+)\s*(?:kcal|กิโลแคลอรี)/i);
      if (calMatch) {
        burnedCalories = parseFloat(calMatch[1]);
      }
    }

    try {
      const response = await fetch(getApiUrl("/schedules/log-burn"), {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${token}`
        },
        body: JSON.stringify({
          title: title,
          durationMinutes: durationMinutes,
          burnedCalories: burnedCalories,
          description: event.description || "",
          scheduledDate: eventDateStr,
          skipGoogleCalendar: true // ป้องกันการยิงสร้าง event ซ้ำลง Google Calendar เพราะมีอยู่แล้ว
        })
      });

      if (response.ok) {
        setSuccessMessage(`✨ บันทึกการออกกำลังกาย "${title}" ลงฐานข้อมูลเรียบร้อยแล้ว! (+${Math.round(burnedCalories)} kcal)`);
        await loadUserData(); // Reload DB schedules and recalculate total calories burned for the week!
      } else {
        const err = await response.json();
        alert(err.error || "ไม่สามารถบันทึกการออกกำลังกายได้");
      }
    } catch (err) {
      console.error("Complete GCal event error:", err);
      alert("เกิดข้อผิดพลาดในการเชื่อมต่อเซิร์ฟเวอร์");
    }
  };

  // Toggle Workout Schedule Status (Complete <-> Pending)
  const handleToggleScheduleStatus = async (schedule) => {
    const token = getSessionToken();
    const targetId = getScheduleId(schedule);
    if (!token || !targetId) return;

    if (schedule.status === 'COMPLETED') {
      if (!schedule.details || schedule.details.length === 0) {
        await handleDeleteSchedule(targetId);
        setSuccessMessage(`↩️ ยกเลิกและลบบันทึกกิจกรรม "${schedule.title}" เรียบร้อยแล้ว`);
        await loadUserData();
      } else {
        try {
          const response = await fetch(getApiUrl(`/schedules/${targetId}/status`), {
            method: "PUT",
            headers: {
              "Content-Type": "application/json",
              "Authorization": `Bearer ${token}`
            },
            body: JSON.stringify({ status: "PENDING" })
          });
          if (response.ok) {
            setSuccessMessage(`↩️ ยกเลิกสถานะทำสำเร็จสำหรับ "${schedule.title}" เรียบร้อยแล้ว`);
            await loadUserData();
          }
        } catch (err) {
          console.error("Failed to toggle schedule status:", err);
        }
      }
    } else {
      await handleCompleteSchedule(targetId);
    }
  };

  // Toggle Google Calendar / n8n AI Workout Event Status (Complete <-> Pending)
  const handleToggleGCalEvent = async (event) => {
    const token = getSessionToken();
    if (!token) return;

    const title = event.summary ? event.summary.replace(/\s*\(YourPaceEvent\)\s*/gi, '').trim() : 'การออกกำลังกาย';
    const cleanSummary = title.toLowerCase().trim();

    const matchingSchedule = workoutSchedules.find(s => {
      if (s.status !== 'COMPLETED') return false;
      const cleanSTitle = (s.title || '').toLowerCase().replace(/\s*\(yourpaceevent\)\s*/gi, '').trim();
      return cleanSTitle.length > 0 && (cleanSTitle.includes(cleanSummary) || cleanSummary.includes(cleanSTitle));
    });

    const matchingId = getScheduleId(matchingSchedule);
    if (matchingSchedule && matchingId) {
      try {
        const response = await fetch(getApiUrl(`/schedules/${matchingId}`), {
          method: "DELETE",
          headers: { "Authorization": `Bearer ${token}` }
        });
        if (response.ok) {
          setSuccessMessage(`↩️ ยกเลิกสถานะทำสำเร็จสำหรับ "${title}" เรียบร้อยแล้ว`);
          await loadUserData();
        }
      } catch (err) {
        console.error("Failed to undo GCal event completion:", err);
      }
    } else {
      await handleCompleteGCalEvent(event);
    }
  };

  // Send real message to AI Mentor
  // If user is authenticated, redirect directly to dashboard view
  const isUserLoggedIn = !!currentUser;

  // ROUTE: Authentication Page
  if (currentRoute === 'auth' && !isUserLoggedIn) {
    return (
      <AuthPage
        onBackToHome={() => setCurrentRoute('landing')}
        onAuthSuccess={async (user) => {
          if (user) {
            setCurrentUser(user);
          } else {
            await checkSession();
          }
          setCurrentRoute('dashboard');
          loadUserData();
        }}
      />
    );
  }

  // ROUTE: Profile Page Settings
  if (isUserLoggedIn && currentRoute === 'profile') {
    return (
      <div className="app-container" style={{ paddingBottom: '60px' }}>
        <ProfilePage
          userToken={getSessionToken()}
          onBackToDashboard={() => setCurrentRoute('dashboard')}
          onProfileUpdateSuccess={() => {
            loadUserData();
          }}
        />
      </div>
    );
  }


  // VIEW: Dashboard (User logged in)ช่วย
  if (isUserLoggedIn && currentRoute === 'dashboard') {
    // Check if user has initialized health profile data
    const isProfilePending = !userProfile || !userProfile.fitnessGoal || userProfile.height === 0;

    // คำนวณจำนวนตารางซ้อมที่สัมพันธ์กับ Event ที่ลงท้ายด้วย (YourPaceEvent)
    const upcomingSchedulesCount = workoutSchedules.filter(schedule => {
      if (schedule.status === 'COMPLETED') return false;
      const hasMatchingGCalEvent = calendarEvents.some(e => {
        if (!e.summary) return false;
        const sumClean = e.summary.toLowerCase().replace(/\s*\(yourpaceevent\)\s*/gi, '').trim();
        const titleClean = schedule.title.toLowerCase().trim();
        return sumClean.length > 0 && (sumClean.includes(titleClean) || titleClean.includes(sumClean));
      });
      return !hasMatchingGCalEvent;
    }).length;

    const upcomingGCalEventsCount = calendarEvents.filter(event => {
      if (!event.summary || !event.summary.toLowerCase().includes('yourpaceevent')) return false;
      const cleanSummary = (event.summary || '').toLowerCase().replace(/\s*\(yourpaceevent\)\s*/gi, '').trim();
      const isCompleted = workoutSchedules.some(s => {
        if (s.status !== 'COMPLETED') return false;
        const cleanSTitle = (s.title || '').toLowerCase().replace(/\s*\(yourpaceevent\)\s*/gi, '').trim();
        return cleanSTitle.length > 0 && (cleanSTitle.includes(cleanSummary) || cleanSummary.includes(cleanSTitle));
      });
      return !isCompleted;
    }).length;

    const upcomingPlansCount = upcomingSchedulesCount + upcomingGCalEventsCount;

    const completedSchedulesCount = workoutSchedules.filter(schedule => {
      if (schedule.status !== 'COMPLETED') return false;
      const hasMatchingGCalEvent = calendarEvents.some(e => {
        if (!e.summary) return false;
        const sumClean = e.summary.toLowerCase().replace(/\s*\(yourpaceevent\)\s*/gi, '').trim();
        const titleClean = schedule.title.toLowerCase().trim();
        return sumClean.length > 0 && (sumClean.includes(titleClean) || titleClean.includes(sumClean));
      });
      return !hasMatchingGCalEvent;
    }).length;

    const completedGCalEventsCount = calendarEvents.filter(event => {
      if (!event.summary || !event.summary.toLowerCase().includes('yourpaceevent')) return false;
      const cleanSummary = (event.summary || '').toLowerCase().replace(/\s*\(yourpaceevent\)\s*/gi, '').trim();
      const isCompleted = workoutSchedules.some(s => {
        if (s.status !== 'COMPLETED') return false;
        const cleanSTitle = (s.title || '').toLowerCase().replace(/\s*\(yourpaceevent\)\s*/gi, '').trim();
        return cleanSTitle.length > 0 && (cleanSTitle.includes(cleanSummary) || cleanSummary.includes(cleanSTitle));
      });
      return isCompleted;
    }).length;

    const completedPlansCount = completedSchedulesCount + completedGCalEventsCount;

    const totalPlansCount = workoutSchedules.length + calendarEvents.filter(e => {
      if (!e.summary || !e.summary.toLowerCase().includes('yourpaceevent')) return false;
      const cleanSummary = e.summary.toLowerCase().replace(/\s*\(yourpaceevent\)\s*/gi, '').trim();
      const hasMatch = workoutSchedules.some(s => {
        const cleanSTitle = (s.title || '').toLowerCase().replace(/\s*\(yourpaceevent\)\s*/gi, '').trim();
        return cleanSTitle.length > 0 && (cleanSTitle.includes(cleanSummary) || cleanSummary.includes(cleanSTitle));
      });
      return !hasMatch;
    }).length;

    return (
      <div style={{ width: '100%', minHeight: '100vh', background: 'var(--bg-main)', position: 'relative' }}>
        <div className="app-container" style={{ paddingBottom: '60px' }}>
          {/* Dashboard Navbar */}
          <header className="navbar animate-fade-in" style={{ borderBottom: '1px solid var(--border-color)', marginBottom: '24px' }}>
            <div className="logo-container" {...clickable(() => window.scrollTo({ top: 0, behavior: 'smooth' }))}>
              <div className="logo-badge">yP</div>
              <span className="logo-text">yourPace <span>Dashboard</span></span>
            </div>

          <div className="nav-actions" style={{ gap: '20px' }}>
            {/* Health Profile Edit Shortcut Button */}
            <button
              className="btn btn-outline"
              onClick={() => setCurrentRoute('profile')}
              style={{
                padding: '8px 16px',
                fontSize: '13px',
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
                borderColor: 'var(--primary)',
                color: 'var(--primary)',
                fontWeight: '600'
              }}
            >
              <Settings size={14} /> ข้อมูลสุขภาพ / โปรไฟล์
            </button>

            {/* AI Mentor Chat Toggle Button */}
            <button
              className="btn btn-outline"
              onClick={() => setIsChatOpen(!isChatOpen)}
              style={{
                padding: '8px 16px',
                fontSize: '13px',
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
                borderColor: isChatOpen ? 'var(--primary)' : '#cbd5e1',
                background: isChatOpen ? 'var(--primary-light)' : 'transparent',
                color: isChatOpen ? 'var(--primary)' : 'var(--text-dark)',
                fontWeight: '600',
                transition: 'all 0.2s'
              }}
            >
              <Bot size={16} /> AI Mentor {isChatOpen ? '💬' : ''}
            </button>

            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <div style={{
                width: '36px',
                height: '36px',
                borderRadius: '50%',
                backgroundColor: 'var(--primary-light)',
                color: 'var(--primary)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontWeight: '700',
                fontSize: '14px',
                border: '1px solid rgba(0,135,90,0.2)',
                overflow: 'hidden'
              }}>
                {currentUser.profilePicture ? (
                  <img src={currentUser.profilePicture} alt="Profile" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                ) : (
                  currentUser.name.charAt(0)
                )}
              </div>
              <span style={{ fontSize: '15px', fontWeight: '600', color: 'var(--text-dark)' }}>
                {currentUser.name}
              </span>
            </div>

            <button className="btn btn-outline" onClick={logout} style={{ padding: '8px 16px', fontSize: '13px', display: 'flex', gap: '6px', borderColor: '#cbd5e1', color: 'var(--text-muted)' }}>
              <LogOut size={14} /> ออกจากระบบ
            </button>
          </div>
        </header>

        {/* Global Success / Error Notification Banners */}
        {successMessage && (
          <div style={{
            background: '#f0fdf4',
            border: '1px solid #86efac',
            borderRadius: 'var(--radius-md)',
            padding: '14px 20px',
            marginBottom: '20px',
            color: '#15803d',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            boxShadow: 'var(--shadow-sm)'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <CheckCircle size={20} color="#16a34a" />
              <span style={{ fontWeight: '600', fontSize: '14px' }}>{successMessage}</span>
            </div>
            <button onClick={() => setSuccessMessage(null)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#15803d' }}>
              <X size={18} />
            </button>
          </div>
        )}

        {error && (
          <div style={{
            background: '#fef2f2',
            border: '1px solid #fca5a5',
            borderRadius: 'var(--radius-md)',
            padding: '14px 20px',
            marginBottom: '20px',
            color: '#b91c1c',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            boxShadow: 'var(--shadow-sm)'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <AlertTriangle size={20} color="#dc2626" />
              <span style={{ fontWeight: '600', fontSize: '14px' }}>{error}</span>
            </div>
            <button onClick={() => setError(null)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#b91c1c' }}>
              <X size={18} />
            </button>
          </div>
        )}

        {/* Profile Settings Pending Alert Banner */}
        {isProfilePending && (
          <div style={{
            background: 'linear-gradient(135deg, #fffbeb 0%, #fef3c7 100%)',
            border: '1px solid #f59e0b',
            borderRadius: 'var(--radius-md)',
            padding: '16px 24px',
            marginBottom: '28px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            boxShadow: 'var(--shadow-sm)',
            animation: 'pulse 2s infinite'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px', textAlign: 'left' }}>
              <AlertTriangle size={24} color="#d97706" />
              <div>
                <strong style={{ color: '#92400e', fontSize: '15px', display: 'block' }}>คุณยังไม่ได้ระบุข้อมูลสุขภาพและเป้าหมายส่วนตัว!</strong>
                <span style={{ color: '#b45309', fontSize: '13px' }}>ข้อมูลเหล่านี้จะถูกนำไปใช้เป็นบริบทเพิ่มเติมที่สำคัญมากเพื่อให้ AI Mentor แนะนำการออกกำลังกายให้คุณได้อย่างปลอดภัย</span>
              </div>
            </div>
            <button
              className="btn btn-primary"
              onClick={() => setCurrentRoute('profile')}
              style={{
                background: '#d97706',
                border: 'none',
                color: 'white',
                padding: '8px 16px',
                fontSize: '13px',
                fontWeight: '700'
              }}
            >
              ตั้งค่าข้อมูลสุขภาพทันที &rarr;
            </button>
          </div>
        )}

        {/* Dashboard Grid Layout (Full width for maximum readability) */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '32px' }} className="animate-slide-up">

          {/* Main Panel */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '32px' }}>

            {/* Enhanced Hero Level & Motivation Banner */}
            <div style={{
              background: 'linear-gradient(135deg, #0f172a 0%, #1e293b 50%, #064e3b 100%)',
              borderRadius: 'var(--radius-md)',
              padding: '26px 30px',
              color: 'white',
              display: 'flex',
              flexDirection: 'column',
              gap: '20px',
              boxShadow: '0 8px 24px rgba(0,0,0,0.12)',
              position: 'relative',
              overflow: 'hidden'
            }}>
              {/* Background ambient lighting */}
              <div style={{
                position: 'absolute',
                top: '-40px',
                right: '-40px',
                width: '180px',
                height: '180px',
                borderRadius: '50%',
                background: 'radial-gradient(circle, rgba(16, 185, 129, 0.25) 0%, rgba(16, 185, 129, 0) 70%)',
                pointerEvents: 'none'
              }}></div>

              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '16px' }}>
                <div style={{ textAlign: 'left', flex: 1, minWidth: '240px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
                    <span style={{ fontSize: '12px', fontWeight: '800', background: 'rgba(16, 185, 129, 0.2)', color: '#34d399', padding: '3px 10px', borderRadius: '12px', border: '1px solid rgba(52, 211, 153, 0.3)' }}>
                      🏆 {progressAnalytics?.levelInfo?.levelTitle || "Beginner Starter (ระดับเริ่มต้น)"}
                    </span>
                    <span style={{ fontSize: '12px', fontWeight: '800', background: 'rgba(245, 158, 11, 0.2)', color: '#fbbf24', padding: '3px 10px', borderRadius: '12px', border: '1px solid rgba(251, 191, 36, 0.3)', display: 'flex', alignItems: 'center', gap: '4px' }}>
                      <Flame size={13} /> {progressAnalytics?.currentStreakDays || 0} วันติดกัน!
                    </span>
                  </div>
                  <h2 style={{ color: 'white', fontSize: '24px', fontWeight: '800', margin: '4px 0 6px', lineHeight: '1.2' }}>
                    ยินดีต้อนรับ, {currentUser.name}! 🌟
                  </h2>
                  <p style={{ opacity: 0.85, fontSize: '13.5px', margin: 0, lineHeight: '1.4' }}>
                    {progressAnalytics?.currentStreakDays && progressAnalytics.currentStreakDays >= 3
                      ? `ยอดเยี่ยมมาก! คุณกำลังรักษาสถิติต่อเนื่อง ${progressAnalytics.currentStreakDays} วัน สะสมพลังงานได้ยอดเยี่ยม`
                      : "ตั้งเป้าหมายและลงมือทำทีละนิด เพื่อสุขภาพและร่างกายที่คุณภูมิใจ"}
                  </p>
                </div>

                <div style={{ display: 'flex', gap: '12px', flexShrink: 0 }}>
                  <div style={{ textAlign: 'center', background: 'rgba(255,255,255,0.08)', backdropFilter: 'blur(8px)', padding: '12px 18px', borderRadius: '12px', minWidth: '90px', border: '1px solid rgba(255,255,255,0.1)' }}>
                    <div style={{ fontSize: '20px', fontWeight: '800', color: '#34d399', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '4px' }}>
                      <CheckCircle size={18} /> {progressAnalytics?.totalWorkoutsCompleted || workoutSchedules.filter(s => s.status === 'COMPLETED').length}
                    </div>
                    <span style={{ fontSize: '10.5px', opacity: 0.75, textTransform: 'uppercase', letterSpacing: '0.5px' }}>สำเร็จ (ครั้ง)</span>
                  </div>

                  <div style={{ textAlign: 'center', background: 'rgba(255,255,255,0.08)', backdropFilter: 'blur(8px)', padding: '12px 18px', borderRadius: '12px', minWidth: '90px', border: '1px solid rgba(255,255,255,0.1)' }}>
                    <div style={{ fontSize: '20px', fontWeight: '800', color: '#fb923c', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '4px' }}>
                      <Flame size={18} /> {Math.round(progressAnalytics?.totalCaloriesAllTime || totalBurned)}
                    </div>
                    <span style={{ fontSize: '10.5px', opacity: 0.75, textTransform: 'uppercase', letterSpacing: '0.5px' }}>เผาผลาญ (kcal)</span>
                  </div>

                  <div style={{ textAlign: 'center', background: 'rgba(255,255,255,0.08)', backdropFilter: 'blur(8px)', padding: '12px 18px', borderRadius: '12px', minWidth: '90px', border: '1px solid rgba(255,255,255,0.1)' }}>
                    <div style={{ fontSize: '20px', fontWeight: '800', color: '#60a5fa', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '4px' }}>
                      <Medal size={18} /> {milestonesList.length}
                    </div>
                    <span style={{ fontSize: '10.5px', opacity: 0.75, textTransform: 'uppercase', letterSpacing: '0.5px' }}>เหรียญรางวัล</span>
                  </div>
                </div>
              </div>

              {/* Level EXP Bar */}
              <div style={{ background: 'rgba(255,255,255,0.06)', borderRadius: '10px', padding: '12px 16px', border: '1px solid rgba(255,255,255,0.08)' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '12px', marginBottom: '6px' }}>
                  <span style={{ color: '#94a3b8', fontWeight: '600' }}>
                    ความคืบหน้าระดับ: <strong style={{ color: 'white' }}>{progressAnalytics?.levelInfo?.levelCode || 'R1'}</strong> &rarr; ระดับถัดไป
                  </span>
                  <span style={{ color: '#34d399', fontWeight: '700' }}>
                    {progressAnalytics?.levelInfo?.currentExp || 0} / {progressAnalytics?.levelInfo?.nextLevelExp || 500} EXP ({progressAnalytics?.levelInfo?.progressPercentage || 0}%)
                  </span>
                </div>
                <div style={{ width: '100%', height: '8px', background: 'rgba(0,0,0,0.3)', borderRadius: '4px', overflow: 'hidden' }}>
                  <div style={{
                    width: `${Math.min(100, Math.max(0, progressAnalytics?.levelInfo?.progressPercentage ?? 0))}%`,
                    height: '100%',
                    background: 'linear-gradient(90deg, #10b981 0%, #34d399 50%, #60a5fa 100%)',
                    borderRadius: '4px',
                    transition: 'width 0.8s cubic-bezier(0.4, 0, 0.2, 1)'
                  }}></div>
                </div>
              </div>

              {/* Dashboard Main Tabs Switcher */}
              <div style={{ display: 'flex', gap: '10px', paddingTop: '4px', flexWrap: 'wrap' }}>
                <button
                  type="button"
                  onClick={() => setDashboardMainTab('schedules')}
                  style={{
                    padding: '9px 18px',
                    fontSize: '13.5px',
                    fontWeight: '700',
                    borderRadius: '8px',
                    border: dashboardMainTab === 'schedules' ? '1.5px solid #34d399' : '1px solid rgba(255,255,255,0.2)',
                    background: dashboardMainTab === 'schedules' ? '#10b981' : 'rgba(255,255,255,0.06)',
                    color: 'white',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '6px',
                    transition: 'all 0.2s',
                    boxShadow: dashboardMainTab === 'schedules' ? '0 2px 8px rgba(16, 185, 129, 0.35)' : 'none'
                  }}
                >
                  <Calendar size={16} />
                  <span>ตารางการซ้อม & นัดหมาย</span>
                </button>

                <button
                  type="button"
                  onClick={() => {
                    setDashboardMainTab('nutrition');
                    const token = getSessionToken();
                    if (token) {
                      loadTodayMeals(token);
                    }
                  }}
                  style={{
                    padding: '9px 18px',
                    fontSize: '13.5px',
                    fontWeight: '700',
                    borderRadius: '8px',
                    border: dashboardMainTab === 'nutrition' ? '1.5px solid #38bdf8' : '1px solid rgba(255,255,255,0.2)',
                    background: dashboardMainTab === 'nutrition' ? '#0284c7' : 'rgba(255,255,255,0.06)',
                    color: 'white',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '6px',
                    transition: 'all 0.2s',
                    boxShadow: dashboardMainTab === 'nutrition' ? '0 2px 8px rgba(2, 132, 199, 0.35)' : 'none'
                  }}
                >
                  <Utensils size={16} />
                  <span>โภชนาการ & พลังงาน (AI Nutrition)</span>
                </button>

                <button
                  type="button"
                  onClick={() => {
                    setDashboardMainTab('progress');
                    const token = getSessionToken();
                    if (token) {
                      loadProgressAnalytics(token);
                      loadMilestones(token);
                      loadWeightHistory(token);
                    }
                  }}
                  style={{
                    padding: '9px 18px',
                    fontSize: '13.5px',
                    fontWeight: '700',
                    borderRadius: '8px',
                    border: dashboardMainTab === 'progress' ? '1.5px solid #60a5fa' : '1px solid rgba(255,255,255,0.2)',
                    background: dashboardMainTab === 'progress' ? '#2563eb' : 'rgba(255,255,255,0.06)',
                    color: 'white',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '6px',
                    transition: 'all 0.2s',
                    boxShadow: dashboardMainTab === 'progress' ? '0 2px 8px rgba(37, 99, 235, 0.35)' : 'none'
                  }}
                >
                  <BarChart3 size={16} />
                  <span>ติดตามความคืบหน้า & สถิติสุขภาพ</span>
                </button>
              </div>
            </div>

            {/* VIEW 1: Schedules & Calendar View */}
            {dashboardMainTab === 'schedules' ? (
              <SchedulesView
                calendarEvents={calendarEvents}
                calendarLoading={calendarLoading}
                cardioSteps={cardioSteps}
                completedPlansCount={completedPlansCount}
                getScheduleId={getScheduleId}
                getSessionToken={getSessionToken}
                handleConnectCalendar={handleConnectCalendar}
                handleDeleteAllSchedules={handleDeleteAllSchedules}
                handleDeleteSchedule={handleDeleteSchedule}
                handleOpenWarmupGuide={handleOpenWarmupGuide}
                handleToggleCardioTarget={handleToggleCardioTarget}
                handleToggleGCalEvent={handleToggleGCalEvent}
                handleToggleScheduleStatus={handleToggleScheduleStatus}
                handleWaterGlassesChange={handleWaterGlassesChange}
                isCalendarConnected={isCalendarConnected}
                isN8nPlanning={isN8nPlanning}
                isProfilePending={isProfilePending}
                loadCalendarEvents={loadCalendarEvents}
                schedulesLoading={schedulesLoading}
                setShowLogBurnModal={setShowLogBurnModal}
                setShowN8nPlanModal={setShowN8nPlanModal}
                setWorkoutTab={setWorkoutTab}
                targetDistanceKm={targetDistanceKm}
                targetSteps={targetSteps}
                targetWaterGlasses={targetWaterGlasses}
                totalBurned={totalBurned}
                totalPlansCount={totalPlansCount}
                upcomingPlansCount={upcomingPlansCount}
                waterGlasses={waterGlasses}
                workoutSchedules={workoutSchedules}
                workoutTab={workoutTab}
              />
            ) : dashboardMainTab === 'nutrition' ? (
              /* VIEW 2: DEDICATED AI NUTRITION & ENERGY STUDIO */
              <NutritionView
                                  coachFeedback={coachFeedback}
                energyBalance={energyBalance}
                getSessionToken={getSessionToken}
                handleDeleteMeal={handleDeleteMeal}
                handleWaterGlassesChange={handleWaterGlassesChange}
                loadCoachFeedback={loadCoachFeedback}
                loadEnergyBalance={loadEnergyBalance}
                loadWeeklyNutrition={loadWeeklyNutrition}
                nutritionSubTab={nutritionSubTab}
                setMealAnalysisPreview={setMealAnalysisPreview}
                setMealForm={setMealForm}
                setMealModalMode={setMealModalMode}
                setNutritionSubTab={setNutritionSubTab}
                setPhotoBase64={setPhotoBase64}
                setPhotoPreview={setPhotoPreview}
                setShowLogMealModal={setShowLogMealModal}
                targetWaterGlasses={targetWaterGlasses}
                todayMealsSummary={todayMealsSummary}
                totalBurned={totalBurned}
                userProfile={userProfile}
                waterGlasses={waterGlasses}
                weeklyNutrition={weeklyNutrition}
              />
            ) : (
              <ProgressView
                currentUser={currentUser}
                getSessionToken={getSessionToken}
                handleFetchWeeklyRecap={handleFetchWeeklyRecap}
                isRecapLoading={isRecapLoading}
                milestonesList={milestonesList}
                progressAnalytics={progressAnalytics}
                setShowLogWeightModal={setShowLogWeightModal}
                setWeightForm={setWeightForm}
                weeklyRecapData={weeklyRecapData}
              />
            )}

          </div>

          </div> {/* Close Dashboard Grid Layout */}
        </div> {/* Close .app-container */}

        {/* Modal: n8n AI Workout Free-Time Planning with Custom Notes */}
        {showN8nPlanModal && (
          <N8nPlanModal
            calendarEvents={calendarEvents}
            handlePlanFreeTimeWithN8N={handlePlanFreeTimeWithN8N}
            isCalendarConnected={isCalendarConnected}
            isN8nPlanning={isN8nPlanning}
            n8nCustomNote={n8nCustomNote}
            n8nDaysCount={n8nDaysCount}
            setN8nCustomNote={setN8nCustomNote}
            setN8nDaysCount={setN8nDaysCount}
            setShowN8nPlanModal={setShowN8nPlanModal}
          />
        )}

        {/* Log Calories Burned Modal (Manual Workout Logging) - Fullscreen Overlay */}
        {showLogBurnModal && (
          <LogBurnModal
            aiBurnExplanation={aiBurnExplanation}
            aiIntensityMap={aiIntensityMap}
            burnForm={burnForm}
            calculateEndTimeString={calculateEndTimeString}
            handleBurnDurationChange={handleBurnDurationChange}
            handleBurnIntensityChange={handleBurnIntensityChange}
            handleCalculateBurnWithN8N={handleCalculateBurnWithN8N}
            handleSaveBurnLog={handleSaveBurnLog}
            handleSelectPreset={handleSelectPreset}
            isCalculatingAiBurn={isCalculatingAiBurn}
            isCalendarConnected={isCalendarConnected}
            isSavingBurnLog={isSavingBurnLog}
            setBurnForm={setBurnForm}
            setShowLogBurnModal={setShowLogBurnModal}
            workoutPresets={workoutPresets}
          />
        )}

        {/* Modal: Log Body Weight Modal */}
        {showLogWeightModal && (
          <LogWeightModal
            handleSaveWeight={handleSaveWeight}
            isSavingWeight={isSavingWeight}
            setShowLogWeightModal={setShowLogWeightModal}
            setWeightForm={setWeightForm}
            weightForm={weightForm}
          />
        )}

        {/* AI Meal & Nutrition Logging Modal */}
        {showLogMealModal && (
          <LogMealModal
            handleAnalyzeMealPreview={handleAnalyzeMealPreview}
            handleAnalyzePhoto={handleAnalyzePhoto}
            handlePhotoFileSelect={handlePhotoFileSelect}
            handleSaveMeal={handleSaveMeal}
            isAnalyzingMeal={isAnalyzingMeal}
            isAnalyzingPhoto={isAnalyzingPhoto}
            isSavingMeal={isSavingMeal}
            mealAnalysisPreview={mealAnalysisPreview}
            mealForm={mealForm}
            mealModalMode={mealModalMode}
            photoPreview={photoPreview}
            setMealForm={setMealForm}
            setMealModalMode={setMealModalMode}
            setPhotoBase64={setPhotoBase64}
            setPhotoPreview={setPhotoPreview}
            setShowLogMealModal={setShowLogMealModal}
          />
        )}

        {/* Modal: Warm-up & Cool-down Routine Guide */}
        {showWarmupModal && (
          <WarmupCooldownModal
          completedWarmupIds={completedWarmupIds}
          handleToggleWarmupCheck={handleToggleWarmupCheck}
          setCompletedWarmupIds={setCompletedWarmupIds}
          setShowWarmupModal={setShowWarmupModal}
          setWarmupCategory={setWarmupCategory}
          setWarmupSelectedTab={setWarmupSelectedTab}
          warmupCategory={warmupCategory}
          warmupModalTitle={warmupModalTitle}
          warmupSelectedTab={warmupSelectedTab}
          />
        )}

        <ChatWidget
          chatEndRef={chatEndRef}
          chatLog={chatLog}
          chatMessage={chatMessage}
          handleClearChatHistory={handleClearChatHistory}
          handleSendChatMessage={handleSendChatMessage}
          isChatHistoryLoading={isChatHistoryLoading}
          isChatLoading={isChatLoading}
          isChatOpen={isChatOpen}
          setChatMessage={setChatMessage}
          setIsChatOpen={setIsChatOpen}
        />

      </div>
    );
  }

  // VIEW: Default Landing Page (User NOT logged in)
  return (
    <LandingPage
      onGetStarted={() => setCurrentRoute('auth')}
      checkinStatus={checkinStatus}
      isAnalyzing={isAnalyzing}
      aiRecommendation={aiRecommendation}
      handleCheckin={handleCheckin}
      equipmentOptions={equipmentOptions}
      selectedEquipment={selectedEquipment}
      handleEquipmentToggle={handleEquipmentToggle}
    />
  );
}

export default App;
