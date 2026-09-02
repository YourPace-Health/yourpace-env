import { useState, useEffect, useRef } from 'react';
import {
  Bot,
  Sparkles,
  TrendingUp,
  Target,
  Calendar,
  Clock,
  Heart,
  Users,
  CheckCircle,
  ArrowRight,
  Smile,
  Meh,
  Frown,
  BatteryCharging,
  LogOut,
  Dumbbell,
  Flame,
  Send,
  Check,
  AlertTriangle,
  Settings,
  Plus,
  Trash2,
  X,
  Zap,
  BarChart3,
  Scale,
  Medal,
  Activity,
  RefreshCw,
  Minus,
  ChevronDown,
  Utensils,
  Apple,
  Salad,
  ChefHat,
  Camera,
  Droplets,
  TrendingDown,
  Lightbulb
} from 'lucide-react';
import { AuthPage } from './presentation/pages/AuthPage';
import { ProfilePage } from './presentation/pages/ProfilePage';
import { useAuthViewModel } from './presentation/hooks/useAuthViewModel';
import { MentorApiDataSource } from './data/datasources/MentorApiDataSource';
import { AuthApiDataSource } from './data/datasources/AuthApiDataSource';
import { MealApiDataSource } from './data/datasources/MealApiDataSource';
import { WARMUP_COOLDOWN_DATA, detectWorkoutMuscleCategory } from './data/warmupCooldownData';

const mentorApiDataSource = new MentorApiDataSource();
const authDataSource = new AuthApiDataSource();
const mealDataSource = new MealApiDataSource();

// Component to parse and format workout descriptions into clean visual cards & badges
export const FormattedWorkoutDescription = ({ description }) => {
  if (!description) return null;

  // 1. Try parsing raw [Name: ..., Description: ..., MuscleGroup: ..., EquipmentNeeded: ..., BurnRate: ..., DifficultyLevel: ...]
  const itemRegex = /\[Name:\s*([^,]+?),\s*Description:\s*([^,]+?),\s*MuscleGroup:\s*([^,]+?),\s*EquipmentNeeded:\s*([^,]+?),\s*BurnRate:\s*([^,]+?),\s*DifficultyLevel:\s*([^\]]+?)\]/g;
  let match;
  const exercises = [];
  while ((match = itemRegex.exec(description)) !== null) {
    exercises.push({
      name: match[1].trim(),
      description: match[2].trim(),
      muscleGroup: match[3].trim(),
      equipment: match[4].trim(),
      burnRate: match[5].trim(),
      difficulty: match[6].trim()
    });
  }

  const benefitMatch = description.match(/\|\s*ประโยชน์:\s*([^|]+)/);
  const benefit = benefitMatch ? benefitMatch[1].replace(/\]+$/, '').trim() : null;

  const calMatch = description.match(/\|\s*เผาผลาญประมาณ:\s*([^|]+)/);
  const calories = calMatch ? calMatch[1].replace(/\]+$/, '').trim() : null;

  if (exercises.length > 0) {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '12px' }}>
          {exercises.map((ex, i) => (
            <div key={i} style={{
              background: '#f8fafc',
              borderRadius: '12px',
              padding: '16px 18px',
              display: 'flex',
              flexDirection: 'column',
              gap: '6px',
              border: '1px solid #f1f5f9'
            }}>
              <span style={{ fontWeight: '700', fontSize: '15px', color: '#334155' }}>
                {ex.name}
              </span>
              <span style={{ fontSize: '13px', color: '#10b981', fontWeight: '600' }}>
                {ex.description}
              </span>
              {(ex.muscleGroup || ex.equipment) && (
                <div style={{ display: 'flex', gap: '4px', flexWrap: 'wrap', marginTop: '2px' }}>
                  {ex.muscleGroup && (
                    <span style={{ fontSize: '10.5px', padding: '2px 8px', borderRadius: '10px', background: '#ecfdf5', color: '#047857', fontWeight: '600' }}>
                      💪 {ex.muscleGroup}
                    </span>
                  )}
                  {ex.equipment && (
                    <span style={{ fontSize: '10.5px', padding: '2px 8px', borderRadius: '10px', background: '#eff6ff', color: '#1d4ed8', fontWeight: '600' }}>
                      🧘 {ex.equipment}
                    </span>
                  )}
                </div>
              )}
            </div>
          ))}
        </div>

        {(benefit || calories) && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', marginTop: '4px' }}>
            {benefit && (
              <div style={{ background: '#f0fdf4', border: '1px solid #bbf7d0', borderRadius: '8px', padding: '10px 14px', fontSize: '12.5px', color: '#15803d', display: 'flex', alignItems: 'center', gap: '6px' }}>
                <span>✨</span> <span><strong>ประโยชน์:</strong> {benefit}</span>
              </div>
            )}
            {calories && (
              <div style={{ background: '#fff7ed', border: '1px solid #ffedd5', borderRadius: '8px', padding: '10px 14px', fontSize: '12.5px', color: '#c2410c', fontWeight: '700', display: 'flex', alignItems: 'center', gap: '6px' }}>
                <span>🔥</span> <span><strong>เผาผลาญประมาณ:</strong> {calories}</span>
              </div>
            )}
          </div>
        )}
      </div>
    );
  }

  // Fallback formatting: parse bullet points or line items
  let cleanedText = description.replace(/^รายการท่าฝึก\s*:\s*/i, '');
  
  // Separate benefits and calories
  const bMatch = cleanedText.match(/\|?\s*ประโยชน์:\s*([^|\n]+)/i);
  const benefitStr = bMatch ? bMatch[1].replace(/\]+$/, '').trim() : null;

  const cMatch = cleanedText.match(/\|?\s*เผาผลาญประมาณ:\s*([^|\n]+)/i);
  const caloriesStr = cMatch ? cMatch[1].replace(/\]+$/, '').trim() : null;

  // Remove benefit and calories from main text before splitting bullet points
  let exercisesText = cleanedText
    .replace(/\|?\s*ประโยชน์:[\s\S]*/i, '')
    .replace(/\|?\s*เผาผลาญประมาณ:[\s\S]*/i, '');

  // Split by bullet points (•) or newlines (\n)
  const rawItems = exercisesText.includes('•')
    ? exercisesText.split('•').map(s => s.trim()).filter(Boolean)
    : exercisesText.split('\n').map(s => s.trim()).filter(Boolean);

  const parsedExercises = rawItems
    .filter(item => {
      const clean = item.trim();
      if (!clean) return false;
      if (clean.startsWith('#') || clean.startsWith('---') || clean.startsWith('ประโยชน์') || clean.startsWith('เผาผลาญ') || clean.startsWith('คำแนะนำ')) return false;
      return true;
    })
    .map(item => {
      // Extract muscle and equipment inside parentheses e.g. (กล้ามเนื้อ: ต้นขา | อุปกรณ์: ดัมเบล)
      const metaMatch = item.match(/\(([^)]+)\)/);
      let muscleGroup = null;
      let equipment = null;
      let mainText = item;

      if (metaMatch) {
        const metaContent = metaMatch[1];
        mainText = item.replace(metaMatch[0], '').trim();

        const mMatch = metaContent.match(/กล้ามเนื้อ:\s*([^|)]+)/i);
        if (mMatch) muscleGroup = mMatch[1].trim().replace(/^[()]+|[()]+$/g, '');

        const eqMatch = metaContent.match(/อุปกรณ์:\s*([^|)]+)/i);
        if (eqMatch) equipment = eqMatch[1].trim().replace(/^[()]+|[()]+$/g, '');
      }

      mainText = mainText.replace(/^[()]+|[()]+$/g, '').trim();

      const parts = mainText.split(/[-–—]/).map(s => s.trim());
      let name = parts[0] ? parts[0].replace(/^[()*#]+|[()*#]+$/g, '').trim() : mainText;
      let desc = parts.slice(1).join(' - ').replace(/^[()*#]+|[()*#]+$/g, '').trim() || name;

      if (name.toLowerCase() === 'อุปกรณ์' || name.toLowerCase() === 'กล้ามเนื้อ') {
        return null;
      }

      return {
        name: name,
        description: desc,
        muscleGroup: muscleGroup,
        equipment: equipment
      };
    })
    .filter(Boolean);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '12px' }}>
        {parsedExercises.map((ex, i) => (
          <div key={`ex-${ex.name || 'item'}-${i}`} style={{
            background: '#f8fafc',
            borderRadius: '12px',
            padding: '16px 18px',
            display: 'flex',
            flexDirection: 'column',
            gap: '6px',
            border: '1px solid #f1f5f9'
          }}>
            <span style={{ fontWeight: '700', fontSize: '15px', color: '#334155' }}>
              {ex.name}
            </span>
            <span style={{ fontSize: '13px', color: '#10b981', fontWeight: '600' }}>
              {ex.description}
            </span>
            {(ex.muscleGroup || ex.equipment) && (
              <div style={{ display: 'flex', gap: '4px', flexWrap: 'wrap', marginTop: '2px' }}>
                {ex.muscleGroup && (
                  <span style={{ fontSize: '10.5px', padding: '2px 8px', borderRadius: '10px', background: '#ecfdf5', color: '#047857', fontWeight: '600' }}>
                    💪 {ex.muscleGroup}
                  </span>
                )}
                {ex.equipment && (
                  <span style={{ fontSize: '10.5px', padding: '2px 8px', borderRadius: '10px', background: '#f1f5f9', color: '#475569', fontWeight: '600' }}>
                    ⚙️ {ex.equipment}
                  </span>
                )}
              </div>
            )}
          </div>
        ))}
      </div>

      {(benefitStr || caloriesStr) && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', marginTop: '4px' }}>
          {benefitStr && (
            <div style={{ background: '#f0fdf4', border: '1px solid #bbf7d0', borderRadius: '8px', padding: '10px 14px', fontSize: '12.5px', color: '#15803d', display: 'flex', alignItems: 'center', gap: '6px' }}>
              <span>✨</span> <span><strong>ประโยชน์:</strong> {benefitStr}</span>
            </div>
          )}
          {caloriesStr && (
            <div style={{ background: '#fff7ed', border: '1px solid #ffedd5', borderRadius: '8px', padding: '10px 14px', fontSize: '12.5px', color: '#c2410c', fontWeight: '700', display: 'flex', alignItems: 'center', gap: '6px' }}>
              <span>🔥</span> <span><strong>เผาผลาญประมาณ:</strong> {caloriesStr}</span>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

// Component to render AI Chat messages cleanly formatted without markdown clutter
const FormattedChatMessage = ({ text }) => {
  if (!text) return null;

  // 1. Remove json wrapper block if present
  let cleanText = text.replace(/^```json\s*/i, '').replace(/\s*```$/i, '');

  // 2. Normalize section headers
  cleanText = cleanText.replaceAll('### ', '\n\n### ');

  // 3. Normalize horizontal rules
  cleanText = cleanText.replaceAll('---', '\n---\n').replaceAll('***', '\n---\n');

  // 4. Normalize bullet points
  cleanText = cleanText.replaceAll('* **', '\n• **');

  // Split text into paragraphs by newline
  const lines = cleanText.split('\n');

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', textAlign: 'left', whiteSpace: 'pre-wrap', lineHeight: '1.6' }}>
      {lines.map((line, i) => {
        const trimmed = line.trim();
        if (!trimmed) return null;

        // Header lines (### Header)
        if (trimmed.startsWith('###')) {
          const headerText = trimmed.replace(/^###\s*/, '').replaceAll('**', '').trim();
          return (
            <div key={`header-${i}-${headerText.slice(0, 8)}`} style={{
              fontWeight: '700',
              fontSize: '13.5px',
              color: '#0f172a',
              marginTop: '8px',
              marginBottom: '2px',
              display: 'flex',
              alignItems: 'center',
              gap: '6px'
            }}>
              <span style={{ width: '4px', height: '14px', background: '#10b981', borderRadius: '2px', display: 'inline-block' }}></span>
              <span>{headerText}</span>
            </div>
          );
        }

        // Horizontal divider (---)
        if (trimmed === '---') {
          return <hr key={`hr-${i}`} style={{ border: 'none', borderTop: '1px dashed #cbd5e1', margin: '6px 0' }} />;
        }

        // Parse bold markdown **text** inside line
        const parts = trimmed.split(/(\*\*.*?\*\*)/g);
        const formattedParts = parts.map((part, pIdx) => {
          if (part.startsWith('**') && part.endsWith('**')) {
            return <strong key={`part-bold-${pIdx}-${part.slice(2, 6)}`} style={{ color: '#0f172a', fontWeight: '700' }}>{part.slice(2, -2)}</strong>;
          }
          return part;
        });

        // Bullet point lines
        if (trimmed.startsWith('•') || trimmed.startsWith('*') || trimmed.startsWith('-')) {
          const cleanItem = trimmed.replace(/^[•*-]\s*/, '');
          const itemParts = cleanItem.split(/(\*\*.*?\*\*)/g).map((part, pIdx) => {
            if (part.startsWith('**') && part.endsWith('**')) {
              return <strong key={`bullet-bold-${pIdx}-${part.slice(2, 6)}`} style={{ color: '#0f172a', fontWeight: '700' }}>{part.slice(2, -2)}</strong>;
            }
            return part;
          });
          return (
            <div key={`bullet-line-${i}-${cleanItem.slice(0, 8)}`} style={{ paddingLeft: '4px', display: 'flex', gap: '6px', alignItems: 'flex-start' }}>
              <span style={{ color: '#10b981', fontWeight: 'bold' }}>•</span>
              <div>{itemParts}</div>
            </div>
          );
        }

        // Numbered list items (1. 2. 3.)
        const numMatch = trimmed.match(/^(\d+)\.\s*(.*)/);
        if (numMatch) {
          const num = numMatch[1];
          const rest = numMatch[2];
          const restParts = rest.split(/(\*\*.*?\*\*)/g).map((part, pIdx) => {
            if (part.startsWith('**') && part.endsWith('**')) {
              return <strong key={`num-bold-${pIdx}-${part.slice(2, 6)}`} style={{ color: '#0f172a', fontWeight: '700' }}>{part.slice(2, -2)}</strong>;
            }
            return part;
          });
          return (
            <div key={`num-line-${i}-${num}`} style={{ display: 'flex', gap: '6px', alignItems: 'flex-start', background: '#f8fafc', padding: '6px 10px', borderRadius: '6px', border: '1px solid #f1f5f9', marginTop: '2px' }}>
              <span style={{ color: '#059669', fontWeight: '800', fontSize: '11.5px', background: '#ecfdf5', padding: '1px 6px', borderRadius: '10px' }}>{num}</span>
              <div>{restParts}</div>
            </div>
          );
        }

        return <div key={`line-${i}-${trimmed.slice(0, 8)}`}>{formattedParts}</div>;
      })}
    </div>
  );
};
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

  // Simple local state routing: 'landing' | 'auth' | 'profile'
  const [currentRoute, setCurrentRoute] = useState('landing');

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
  const [showLogBurnModal, setShowLogBurnModal] = useState(false);
  const [showN8nPlanModal, setShowN8nPlanModal] = useState(false);
  const [n8nCustomNote, setN8nCustomNote] = useState('');
  const [n8nDaysCount, setN8nDaysCount] = useState(3);
  const [workoutTab, setWorkoutTab] = useState('plan'); // 'plan' | 'history'

  // Warm-up & Cool-down Guide Modal States
  const [showWarmupModal, setShowWarmupModal] = useState(false);
  const [warmupSelectedTab, setWarmupSelectedTab] = useState('warmup'); // 'warmup' | 'cooldown'
  const [warmupCategory, setWarmupCategory] = useState('UPPER_BODY'); // 'UPPER_BODY' | 'LOWER_BODY' | 'CORE_CARDIO'
  const [warmupModalTitle, setWarmupModalTitle] = useState('');
  const [completedWarmupIds, setCompletedWarmupIds] = useState(new Set());

  const handleOpenWarmupGuide = (title = '', description = '', defaultTab = 'warmup') => {
    const detectedCategory = detectWorkoutMuscleCategory(title, description);
    setWarmupCategory(detectedCategory);
    setWarmupModalTitle(title);
    setWarmupSelectedTab(defaultTab);
    setShowWarmupModal(true);
  };

  const handleToggleWarmupCheck = (exerciseId) => {
    setCompletedWarmupIds(prev => {
      const next = new Set(prev);
      if (next.has(exerciseId)) {
        next.delete(exerciseId);
      } else {
        next.add(exerciseId);
      }
      return next;
    });
  };

  const workoutPresets = [
    { id: 'running', title: 'วิ่งออกกำลังกาย', shortTitle: 'วิ่งออกกำลัง', icon: '🏃', burnRate: 8.5 },
    { id: 'brisk_walk', title: 'เดินเร็ว / คาร์ดิโอเบาๆ', shortTitle: 'เดินเร็ว', icon: '🚶', burnRate: 4.5 },
    { id: 'cycling', title: 'ปั่นจักรยาน', shortTitle: 'ปั่นจักรยาน', icon: '🚴', burnRate: 7.0 },
    { id: 'swimming', title: 'ว่ายน้ำ', shortTitle: 'ว่ายน้ำ', icon: '🏊', burnRate: 9.0 },
    { id: 'weight', title: 'เล่นเวท / ฟิตเนส', shortTitle: 'เล่นเวท', icon: '🏋️', burnRate: 6.0 },
    { id: 'yoga', title: 'โยคะ / ยืดเหยียด', shortTitle: 'โยคะ', icon: '🧘', burnRate: 4.0 },
    { id: 'racket', title: 'แบดมินตัน / เทนนิส', shortTitle: 'แบดมินตัน', icon: '🏸', burnRate: 7.5 },
    { id: 'football', title: 'ฟุตบอล / เล่นกีฬา', shortTitle: 'ฟุตบอล/กีฬา', icon: '⚽', burnRate: 8.0 },
    { id: 'hiit', title: 'HIIT / กระโดดเชือก', shortTitle: 'กระโดดเชือก/HIIT', icon: '🔥', burnRate: 10.0 },
    { id: 'boxing', title: 'ต่อยมวย / ศิลปะการต่อสู้', shortTitle: 'ต่อยมวย', icon: '🥊', burnRate: 9.5 },
    { id: 'other', title: 'กิจกรรมอื่นๆ (กำหนดเอง)', shortTitle: '✨ อื่นๆ (AI)', icon: '✨', burnRate: 6.0, isAiCustom: true },
  ];

  const getTodayDateString = () => new Date().toISOString().split('T')[0];
  const getCurrentTimeString = () => {
    const now = new Date();
    const h = String(now.getHours()).padStart(2, '0');
    const m = String(now.getMinutes()).padStart(2, '0');
    return `${h}:${m}`;
  };

  const calculateEndTimeString = (startTimeStr, durationMinutes) => {
    if (!startTimeStr) return '';
    const [h, m] = startTimeStr.split(':').map(Number);
    const date = new Date();
    date.setHours(h || 0, m || 0, 0, 0);
    date.setMinutes(date.getMinutes() + (parseInt(durationMinutes) || 0));
    return `${String(date.getHours()).padStart(2, '0')}:${String(date.getMinutes()).padStart(2, '0')}`;
  };

  const [burnForm, setBurnForm] = useState({
    title: 'วิ่งออกกำลังกาย',
    durationMinutes: 30,
    burnedCalories: 255,
    intensity: 'MODERATE', // 'LIGHT' | 'MODERATE' | 'INTENSE'
    scheduledDate: getTodayDateString(),
    scheduledTime: getCurrentTimeString(),
    description: '',
    selectedPresetId: 'running'
  });

  const [isSavingBurnLog, setIsSavingBurnLog] = useState(false);
  const [isCalculatingAiBurn, setIsCalculatingAiBurn] = useState(false);
  const [aiBurnExplanation, setAiBurnExplanation] = useState('');
  const [aiIntensityMap, setAiIntensityMap] = useState(null);

  const getIntensityMultiplier = (intensity) => {
    if (intensity === 'LIGHT') return 0.85;
    if (intensity === 'INTENSE') return 1.25;
    return 1.0;
  };

  const handleSelectPreset = (preset) => {
    const isOther = preset.id === 'other';
    const mins = parseInt(burnForm.durationMinutes) || 30;
    const multiplier = getIntensityMultiplier(burnForm.intensity);
    const estCal = isOther ? '' : Math.round(mins * preset.burnRate * multiplier);

    setBurnForm(prev => ({
      ...prev,
      title: isOther ? (prev.selectedPresetId === 'other' ? prev.title : '') : preset.title,
      selectedPresetId: preset.id,
      burnedCalories: estCal
    }));
    setAiBurnExplanation('');
    setAiIntensityMap(null);
  };

  const handleCalculateBurnWithN8N = async () => {
    const token = getSessionToken();
    if (!token) return;

    setIsCalculatingAiBurn(true);
    setAiBurnExplanation('');
    try {
      const response = await fetch(getApiUrl("/mentor/calculate-burn"), {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${token}`
        },
        body: JSON.stringify({
          title: burnForm.title || 'กิจกรรมออกกำลังกาย',
          durationMinutes: parseInt(burnForm.durationMinutes) || 30,
          description: burnForm.description || ''
        })
      });

      if (response.ok) {
        const data = await response.json();
        const lightCal = Math.round(data.light?.calories || 0);
        const moderateCal = Math.round(data.moderate?.calories || 0);
        const intenseCal = Math.round(data.intense?.calories || 0);

        const map = {
          LIGHT: { calories: lightCal, desc: data.light?.description || 'สบายๆ พูดคุยได้' },
          MODERATE: { calories: moderateCal, desc: data.moderate?.description || 'เหงื่อซึม หายใจเร็วขึ้น' },
          INTENSE: { calories: intenseCal, desc: data.intense?.description || 'เหนื่อยหอบ ท้าทาย' }
        };
        setAiIntensityMap(map);

        const currentLvl = burnForm.intensity || 'MODERATE';
        const activeCal = map[currentLvl]?.calories || moderateCal;

        setBurnForm(prev => ({
          ...prev,
          burnedCalories: activeCal
        }));
        setAiBurnExplanation(data.explanation || `n8n AI คำนวณพลังงานครบทั้ง 3 ระดับความเข้มข้นเรียบร้อยแล้ว`);
      } else {
        const err = await response.json();
        alert(err.error || "เกิดข้อผิดพลาดในการคำนวณด้วย n8n AI");
      }
    } catch (err) {
      console.error("Failed to calculate burn with n8n AI:", err);
      alert("ไม่สามารถเชื่อมต่อเซิร์ฟเวอร์ n8n เพื่อคำนวณแคลอรี่ได้");
    } finally {
      setIsCalculatingAiBurn(false);
    }
  };

  const handleBurnDurationChange = (newMinutes) => {
    const mins = parseInt(newMinutes) || 0;
    setAiIntensityMap(null);
    setAiBurnExplanation('');
    const currentPreset = workoutPresets.find(p => p.id === burnForm.selectedPresetId) || { burnRate: 6.0 };
    const isOther = currentPreset.id === 'other';
    const multiplier = getIntensityMultiplier(burnForm.intensity);
    const estCal = isOther ? (burnForm.burnedCalories && !aiIntensityMap ? burnForm.burnedCalories : '') : Math.round(mins * currentPreset.burnRate * multiplier);

    setBurnForm(prev => ({
      ...prev,
      durationMinutes: newMinutes,
      burnedCalories: estCal
    }));
  };

  const handleBurnIntensityChange = (newIntensity) => {
    if (aiIntensityMap && aiIntensityMap[newIntensity]) {
      setBurnForm(prev => ({
        ...prev,
        intensity: newIntensity,
        burnedCalories: aiIntensityMap[newIntensity].calories
      }));
      return;
    }

    const currentPreset = workoutPresets.find(p => p.id === burnForm.selectedPresetId) || { burnRate: 6.0 };
    const isOther = currentPreset.id === 'other';
    if (isOther && !burnForm.burnedCalories) {
      setBurnForm(prev => ({
        ...prev,
        intensity: newIntensity
      }));
      return;
    }

    const mins = parseInt(burnForm.durationMinutes) || 30;
    const multiplier = getIntensityMultiplier(newIntensity);
    const estCal = isOther ? burnForm.burnedCalories : Math.round(mins * currentPreset.burnRate * multiplier);
    setBurnForm(prev => ({
      ...prev,
      intensity: newIntensity,
      burnedCalories: estCal
    }));
  };

  const handleSaveBurnLog = async (e) => {
    e.preventDefault();
    const token = getSessionToken();
    if (!token) return;

    setIsSavingBurnLog(true);
    try {
      const response = await fetch(getApiUrl("/schedules/log-burn"), {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${token}`
        },
        body: JSON.stringify({
          title: burnForm.title,
          durationMinutes: parseInt(burnForm.durationMinutes) || 30,
          burnedCalories: parseFloat(burnForm.burnedCalories) || 0,
          scheduledDate: burnForm.scheduledDate || getTodayDateString(),
          scheduledTime: burnForm.scheduledTime || getCurrentTimeString(),
          targetIntensity: burnForm.intensity || 'MODERATE',
          description: burnForm.description || ''
        })
      });
      if (response.ok) {
        setShowLogBurnModal(false);
        const calMsg = isCalendarConnected ? " 📅 พร้อมทำนัดหมายลง Google Calendar ให้เรียบร้อยแล้ว!" : "";
        setSuccessMessage(`✨ บันทึกการออกกำลังกาย "${burnForm.title}" สำเร็จ!${calMsg} (+${Math.round(burnForm.burnedCalories)} kcal)`);
        setWorkoutTab('history'); // Switch to history tab so user sees their new entry
        await loadUserData();
        if (isCalendarConnected) {
          loadCalendarEvents(token);
        }
      } else {
        const err = await response.json();
        alert(err.error || "เกิดข้อผิดพลาดในการบันทึกกิจกรรม");
      }
    } catch (err) {
      console.error("Failed to log burn activity:", err);
      alert("ไม่สามารถเชื่อมต่อเซิร์ฟเวอร์เพื่อบันทึกกิจกรรมได้");
    } finally {
      setIsSavingBurnLog(false);
    }
  };

  // Water intake state in glasses & target (fetched from backend API)
  const [waterGlasses, setWaterGlasses] = useState(0);
  const [targetWaterGlasses, setTargetWaterGlasses] = useState(10);


  const handleWaterGlassesChange = async (newCount) => {
    const count = Math.max(0, newCount);
    setWaterGlasses(count);
    try {
      const updated = await authDataSource.updateTodayWaterLog(count);
      if (updated) {
        setWaterGlasses(updated.glasses);
        if (updated.targetGlasses) {
          setTargetWaterGlasses(updated.targetGlasses);
        }
      }
    } catch (err) {
      console.error("Failed to update water log via API:", err);
    }
  };

  // Check-in simulator states (for landing page demo)
  const [checkinStatus, setCheckinStatus] = useState(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [aiRecommendation, setAiRecommendation] = useState('');

  // Dashboard AI Chat real state
  const [chatMessage, setChatMessage] = useState('');
  const [isChatLoading, setIsChatLoading] = useState(false);
  const [isChatHistoryLoading, setIsChatHistoryLoading] = useState(false);
  const [chatLog, setChatLog] = useState([
    { sender: 'ai', text: 'สวัสดีครับ! ผมคือ yourPace AI Mentor ของคุณ วันนี้คุณอยากเน้นออกกำลังกายส่วนไหน หรือให้ผมช่วยวางแผนตารางการออกกำลังกายให้ดีครับ?', createdAt: new Date().toISOString() }
  ]);

  const chatEndRef = useRef(null);

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [chatLog, isChatLoading]);

  // Load chat history from backend
  const loadChatHistory = async (token) => {
    if (!token) return;
    setIsChatHistoryLoading(true);
    try {
      const messages = await mentorApiDataSource.getChatHistory(token);
      if (messages && messages.length > 0) {
        setChatLog(messages.map(m => ({
          id: m.id,
          sender: m.sender,
          text: m.message,
          createdAt: m.createdAt
        })));
      } else {
        setChatLog([
          { sender: 'ai', text: 'สวัสดีครับ! ผมคือ yourPace AI Mentor ของคุณ วันนี้คุณอยากเน้นออกกำลังกายส่วนไหน หรือให้ผมช่วยวางแผนตารางการออกกำลังกายให้ดีครับ?', createdAt: new Date().toISOString() }
        ]);
      }
    } catch (err) {
      console.error("Failed to load chat history:", err);
    } finally {
      setIsChatHistoryLoading(false);
    }
  };

  // Clear chat history
  const handleClearChatHistory = async () => {
    const token = getSessionToken();
    if (!token) return;

    if (!confirm("คุณต้องการล้างประวัติการสนทนากับ AI Mentor ทั้งหมดใช่หรือไม่?")) {
      return;
    }

    try {
      await mentorApiDataSource.clearChatHistory(token);
      setChatLog([
        { sender: 'ai', text: 'ประวัติการสนทนาถูกล้างเรียบร้อยแล้วครับ! มีอะไรให้ yourPace AI Mentor ช่วยดูแลสุขภาพวันนี้ไหมครับ? 💪✨', createdAt: new Date().toISOString() }
      ]);
    } catch (err) {
      console.error("Failed to clear chat history:", err);
      alert("เกิดข้อผิดพลาดในการล้างประวัติการสนทนา");
    }
  };

  // Daily Tasks Mock in Dashboard (fallback or minor tasks)
  const [_dailyTasks, _setDailyTasks] = useState([
    { id: 1, text: 'ดื่มน้ำให้ครบ 2.5 ลิตร', done: true },
    { id: 2, text: 'บันทึกปริมาณแคลอรี่ในมื้อเที่ยง', done: true },
  ]);

  // AI Chat Drawer Floating State
  const [isChatOpen, setIsChatOpen] = useState(false);

  // Main Dashboard View Mode: 'schedules' (แผนการซ้อม & ตารางงาน) | 'progress' (ความคืบหน้า & สถิติ)
  const [dashboardMainTab, setDashboardMainTab] = useState('schedules');


  // Health Progress & Trends Analytics States
  const [progressAnalytics, setProgressAnalytics] = useState(null);
  const [_analyticsLoading, setAnalyticsLoading] = useState(false);
  const [milestonesList, setMilestonesList] = useState([]);
  const [_weightHistory, setWeightHistory] = useState([]);
  const [weeklyRecapData, setWeeklyRecapData] = useState(null);
  const [isRecapLoading, setIsRecapLoading] = useState(false);

  // Weight Logging Modal States
  const [showLogWeightModal, setShowLogWeightModal] = useState(false);
  const [weightForm, setWeightForm] = useState({
    weight: '',
    bodyFatPercentage: '',
    logDate: new Date().toISOString().split('T')[0],
    notes: ''
  });
  const [isSavingWeight, setIsSavingWeight] = useState(false);

  // Meal & AI Nutrition Tracker States
  const [todayMealsSummary, setTodayMealsSummary] = useState(null);
  const [showLogMealModal, setShowLogMealModal] = useState(false);
  const [mealModalMode, setMealModalMode] = useState('text'); // 'text' | 'photo'
  const [photoPreview, setPhotoPreview] = useState(null);
  const [photoBase64, setPhotoBase64] = useState('');
  const [photoMimeType, setPhotoMimeType] = useState('image/jpeg');
  const [isAnalyzingPhoto, setIsAnalyzingPhoto] = useState(false);
  const [mealForm, setMealForm] = useState({
    mealType: 'LUNCH',
    mealDescription: '',
    calories: '',
    protein: '',
    carbs: '',
    fat: ''
  });
  const [mealAnalysisPreview, setMealAnalysisPreview] = useState(null);
  const [isAnalyzingMeal, setIsAnalyzingMeal] = useState(false);
  const [isSavingMeal, setIsSavingMeal] = useState(false);

  // New Nutrition Feature States
  const [nutritionSubTab, setNutritionSubTab] = useState('tracker'); // 'tracker' | 'energy' | 'hydration' | 'analytics' | 'coach'
  const [energyBalance, setEnergyBalance] = useState(null);
  const [weeklyNutrition, setWeeklyNutrition] = useState(null);
  const [coachFeedback, setCoachFeedback] = useState(null);
  const [_isLoadingNutritionExtra, _setIsLoadingNutritionExtra] = useState(false);

  // Google Calendar Integration States
  const [isCalendarConnected, setIsCalendarConnected] = useState(false);
  const [calendarEvents, setCalendarEvents] = useState([]);
  const [calendarLoading, setCalendarLoading] = useState(false);

  const getApiUrl = (path) => {
    const port = import.meta.env.VITE_BACKEND_PORT || (window.location.port === "8080" ? "8080" : "8081");
    return `http://${window.location.hostname}:${port}/api${path}`;
  };

  // Fetch Today Meals & Nutrition
  const loadTodayMeals = async (authToken) => {
    const activeTok = authToken || getSessionToken();
    if (!activeTok) return;
    try {
      const data = await mealDataSource.getTodayMeals(activeTok);
      setTodayMealsSummary(data);
      loadEnergyBalance(activeTok);
      loadWeeklyNutrition(activeTok);
      loadCoachFeedback(activeTok);
    } catch (err) {
      console.error("Failed to load today meals:", err);
    }
  };

  // Load Energy Balance
  const loadEnergyBalance = async (authToken) => {
    const activeTok = authToken || getSessionToken();
    if (!activeTok) return;
    try {
      const data = await mealDataSource.getEnergyBalance(activeTok);
      setEnergyBalance(data);
    } catch (err) {
      console.error("Failed to load energy balance:", err);
    }
  };

  // Load Weekly Nutrition
  const loadWeeklyNutrition = async (authToken) => {
    const activeTok = authToken || getSessionToken();
    if (!activeTok) return;
    try {
      const data = await mealDataSource.getWeeklyAnalytics(activeTok);
      setWeeklyNutrition(data);
    } catch (err) {
      console.error("Failed to load weekly nutrition:", err);
    }
  };

  // Load Coach Feedback
  const loadCoachFeedback = async (authToken) => {
    const activeTok = authToken || getSessionToken();
    if (!activeTok) return;
    try {
      const data = await mealDataSource.getDailyCoachFeedback(activeTok);
      setCoachFeedback(data);
    } catch (err) {
      console.error("Failed to load coach feedback:", err);
    }
  };

  // Handle Photo Selection
  const handlePhotoFileSelect = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setPhotoMimeType(file.type || 'image/jpeg');
    const reader = new FileReader();
    reader.onload = (event) => {
      const result = event.target.result;
      setPhotoPreview(result);
      setPhotoBase64(result);
    };
    reader.readAsDataURL(file);
  };

  // Analyze Photo with Gemini Vision AI
  const handleAnalyzePhoto = async () => {
    const token = getSessionToken();
    if (!photoBase64 || !token) {
      alert("กรุณาเลือกรูปภาพอาหารก่อนทำการวิเคราะห์");
      return;
    }
    setIsAnalyzingPhoto(true);
    try {
      const result = await mealDataSource.analyzeMealPhoto(photoBase64, photoMimeType, token);
      setMealAnalysisPreview(result);
      setMealForm(prev => ({
        ...prev,
        mealDescription: result.summary ? result.summary.split(' - ')[0] : 'อาหารที่ตรวจพบในภาพ',
        calories: result.calories !== undefined ? result.calories : '',
        protein: result.protein !== undefined ? result.protein : '',
        carbs: result.carbs !== undefined ? result.carbs : '',
        fat: result.fat !== undefined ? result.fat : ''
      }));
    } catch (err) {
      console.error("Analyze photo error:", err);
      alert("ไม่สามารถวิเคราะห์ภาพอาหารได้ในขณะนี้: " + (err.message || ""));
    } finally {
      setIsAnalyzingPhoto(false);
    }
  };

  // AI Meal Preview Analysis
  const handleAnalyzeMealPreview = async () => {
    const token = getSessionToken();
    if (!mealForm.mealDescription.trim() || !token) {
      if (!token) alert("ไม่พบข้อมูลการเข้าสู่ระบบ กรุณาเข้าสู่ระบบใหม่อีกครั้ง");
      return;
    }
    setIsAnalyzingMeal(true);
    try {
      const preview = await mealDataSource.previewMealAnalysis(mealForm.mealDescription, token);
      setMealAnalysisPreview(preview);
      setMealForm(prev => ({
        ...prev,
        calories: preview.calories !== undefined ? preview.calories : '',
        protein: preview.protein !== undefined ? preview.protein : '',
        carbs: preview.carbs !== undefined ? preview.carbs : '',
        fat: preview.fat !== undefined ? preview.fat : ''
      }));
    } catch (err) {
      console.error("Failed to preview meal analysis:", err);
      alert("ไม่สามารถวิเคราะห์อาหารได้ในขณะนี้: " + (err.message || ""));
    } finally {
      setIsAnalyzingMeal(false);
    }
  };

  // Save Meal to DB
  const handleSaveMeal = async (e) => {
    e.preventDefault();
    const token = getSessionToken();
    if (!mealForm.mealDescription.trim() || !token) {
      if (!token) alert("ไม่พบข้อมูลการเข้าสู่ระบบ กรุณาเข้าสู่ระบบใหม่อีกครั้ง");
      return;
    }
    setIsSavingMeal(true);
    try {
      const payload = {
        mealType: mealForm.mealType,
        mealDescription: mealForm.mealDescription,
        calories: mealForm.calories ? parseFloat(mealForm.calories) : undefined,
        protein: mealForm.protein ? parseFloat(mealForm.protein) : undefined,
        carbs: mealForm.carbs ? parseFloat(mealForm.carbs) : undefined,
        fat: mealForm.fat ? parseFloat(mealForm.fat) : undefined
      };
      await mealDataSource.logMeal(payload, token);
      setShowLogMealModal(false);
      setMealForm({ mealType: 'LUNCH', mealDescription: '', calories: '', protein: '', carbs: '', fat: '' });
      setMealAnalysisPreview(null);
      await loadTodayMeals(token);
    } catch (err) {
      console.error("Failed to log meal:", err);
      alert("เกิดข้อผิดพลาดในการบันทึกมื้ออาหาร: " + (err.message || ""));
    } finally {
      setIsSavingMeal(false);
    }
  };

  // Delete Meal
  const handleDeleteMeal = async (mealId) => {
    const token = getSessionToken();
    if (!token) return;
    if (!window.confirm("คุณต้องการลบรายการมื้ออาหารนี้ใช่หรือไม่?")) return;
    try {
      await mealDataSource.deleteMeal(mealId, token);
      await loadTodayMeals(token);
    } catch (err) {
      console.error("Failed to delete meal:", err);
      alert("ไม่สามารถลบมื้ออาหารได้: " + (err.message || ""));
    }
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

  // Fetch Weight History
  const loadWeightHistory = async (token) => {
    try {
      const response = await fetch(getApiUrl("/health/weight/history"), {
        headers: { "Authorization": `Bearer ${token}` }
      });
      if (response.ok) {
        const data = await response.json();
        setWeightHistory(data || []);
      }
    } catch (err) {
      console.error("Failed to load weight history:", err);
    }
  };

  // Fetch AI Weekly Health Recap
  const handleFetchWeeklyRecap = async () => {
    const token = getSessionToken();
    if (!token) return;

    setIsRecapLoading(true);
    try {
      const response = await fetch(getApiUrl("/mentor/weekly-recap"), {
        headers: { "Authorization": `Bearer ${token}` }
      });
      if (response.ok) {
        const data = await response.json();
        setWeeklyRecapData(data);
      } else {
        alert("ไม่สามารถขอสรุปผลรายสัปดาห์จาก AI ได้ในขณะนี้");
      }
    } catch (err) {
      console.error("Failed to fetch weekly recap:", err);
      alert("เกิดข้อผิดพลาดในการเชื่อมต่อ AI Mentor");
    } finally {
      setIsRecapLoading(false);
    }
  };

  // Save Weight Log
  const handleSaveWeight = async (e) => {
    e.preventDefault();
    const token = getSessionToken();
    if (!token) return;

    if (!weightForm.weight || parseFloat(weightForm.weight) <= 0) {
      alert("กรุณาระบุน้ำหนักที่ถูกต้อง (กก.)");
      return;
    }

    setIsSavingWeight(true);
    try {
      const response = await fetch(getApiUrl("/health/weight"), {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${token}`
        },
        body: JSON.stringify({
          weight: parseFloat(weightForm.weight),
          bodyFatPercentage: weightForm.bodyFatPercentage ? parseFloat(weightForm.bodyFatPercentage) : 0,
          logDate: weightForm.logDate,
          notes: weightForm.notes
        })
      });

      if (response.ok) {
        setShowLogWeightModal(false);
        setSuccessMessage(`⚖️ บันทึกน้ำหนัก ${weightForm.weight} kg เรียบร้อยแล้ว!`);
        await loadUserData();
        loadProgressAnalytics(token);
        loadWeightHistory(token);
        loadMilestones(token);
      } else {
        const err = await response.json();
        alert(err.error || "เกิดข้อผิดพลาดในการบันทึกน้ำหนัก");
      }
    } catch (err) {
      console.error("Failed to log weight:", err);
      alert("ไม่สามารถเชื่อมต่อเซิร์ฟเวอร์เพื่อบันทึกน้ำหนักได้");
    } finally {
      setIsSavingWeight(false);
    }
  };

  // Check Google Calendar connection status
  const loadCalendarStatus = async (token) => {
    try {
      const response = await fetch(getApiUrl("/calendar/status"), {
        headers: { "Authorization": `Bearer ${token}` }
      });
      if (response.ok) {
        const data = await response.json();
        setIsCalendarConnected(data.connected);
        return data.connected;
      }
    } catch (err) {
      console.error("Failed to load calendar status:", err);
    }
    return false;
  };

  // Fetch Google Calendar events
  const loadCalendarEvents = async (token) => {
    setCalendarLoading(true);
    try {
      const response = await fetch(getApiUrl("/calendar/events"), {
        headers: { "Authorization": `Bearer ${token}` }
      });
      if (response.ok) {
        const data = await response.json();
        setCalendarEvents(data.items || []);
      } else if (response.status === 403) {
        // Token expired or revoked — backend has already deleted it
        console.warn("Google Calendar token expired or revoked, marking as disconnected");
        setIsCalendarConnected(false);
        setCalendarEvents([]);
      }
    } catch (err) {
      console.error("Failed to load calendar events:", err);
    } finally {
      setCalendarLoading(false);
    }
  };

  const handleConnectCalendar = async () => {
    const token = getSessionToken();
    if (!token) return;

    try {
      const response = await fetch(getApiUrl("/calendar/auth-url"), {
        headers: { "Authorization": `Bearer ${token}` }
      });
      if (response.ok) {
        const data = await response.json();
        if (data.authUrl) {
          window.location.href = data.authUrl;
        }
      }
    } catch (err) {
      console.error("Failed to get google auth url:", err);
      alert("เกิดข้อผิดพลาดในการเชื่อมต่อ Google Calendar");
    }
  };

  const _handleDisconnectCalendar = async () => {
    const token = getSessionToken();
    if (!token) return;

    if (!confirm("คุณต้องการยกเลิกการเชื่อมต่อ Google Calendar ใช่หรือไม่?")) return;

    try {
      const response = await fetch(getApiUrl("/calendar"), {
        method: "DELETE",
        headers: { "Authorization": `Bearer ${token}` }
      });
      if (response.ok) {
        setIsCalendarConnected(false);
        setCalendarEvents([]);
        setSuccessMessage("ยกเลิกการเชื่อมต่อ Google Calendar สำเร็จแล้ว!");
      }
    } catch (err) {
      console.error("Failed to disconnect calendar:", err);
      alert("เกิดข้อผิดพลาดในการยกเลิกการเชื่อมต่อ");
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
  const handleSendChatMessage = async (e) => {
    e.preventDefault();
    if (!chatMessage.trim()) return;

    const token = getSessionToken();
    if (!token) return;

    const nowIso = new Date().toISOString();
    const userMsg = { sender: 'user', text: chatMessage, createdAt: nowIso };
    setChatLog(prev => [...prev, userMsg]);
    const currentMsg = chatMessage;
    setChatMessage('');
    setIsChatLoading(true);

    try {
      const aiReply = await mentorApiDataSource.chatWithMentor(currentMsg, token);
      setChatLog(prev => [...prev, { sender: 'ai', text: aiReply, createdAt: new Date().toISOString() }]);
    } catch (err) {
      console.error("Chat with mentor error:", err);
      setChatLog(prev => [...prev, {
        sender: 'ai',
        text: '❌ เกิดข้อผิดพลาดในการเชื่อมต่อกับ AI Mentor กรุณาตรวจสอบว่ากำหนด GEMINI_API_KEY ใน Backend .env เรียบร้อยแล้ว (หรือระบบจะตอบแบบจำลองแทนหาก API Key ไม่ถูกต้อง)',
        createdAt: new Date().toISOString()
      }]);
    } finally {
      setIsChatLoading(false);
    }
  };

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
            <div className="logo-container" onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}>
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
              <>
                {/* Overall Health Dashboard Visual Cards */}
                <div>
                  <h3 style={{ fontSize: '20px', marginBottom: '16px', color: 'var(--text-dark)', fontWeight: '700', textAlign: 'left' }}>
                    แดชบอร์ดสุขภาพองค์รวม (Overall Health)
                  </h3>

                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '20px' }}>

                    {/* Visual Card 1: Cardio Target */}
                    <div style={{ background: '#ffffff', border: '1px solid var(--border-color)', borderRadius: 'var(--radius-md)', padding: '20px', boxShadow: 'var(--shadow-sm)', textAlign: 'left', display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
                      <div>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                          <span style={{ fontSize: '12px', fontWeight: 'bold', color: 'var(--secondary)' }}>CARDIO TARGET</span>
                          {cardioSteps >= targetSteps ? (
                            <button
                              type="button"
                              onClick={handleToggleCardioTarget}
                              style={{
                                background: '#ecfdf5',
                                border: '1px solid #a7f3d0',
                                color: '#047857',
                                fontSize: '11px',
                                fontWeight: '700',
                                padding: '3px 10px',
                                borderRadius: '12px',
                                cursor: 'pointer',
                                display: 'flex',
                                alignItems: 'center',
                                gap: '4px',
                                transition: 'all 0.2s'
                              }}
                              title="คลิกเพื่อยกเลิกสถานะทำสำเร็จ"
                            >
                              <Check size={12} /> สำเร็จวันนี้แล้ว (คลิกเพื่อยกเลิก)
                            </button>
                          ) : (
                            <button
                              type="button"
                              onClick={handleToggleCardioTarget}
                              style={{
                                background: '#e8f0fe',
                                border: 'none',
                                color: '#1a73e8',
                                fontSize: '11px',
                                fontWeight: '700',
                                padding: '3px 10px',
                                borderRadius: '12px',
                                cursor: 'pointer',
                                display: 'flex',
                                alignItems: 'center',
                                gap: '4px',
                                transition: 'all 0.2s'
                              }}
                              title="บันทึกว่าทำสำเร็จตามเป้าหมายคาร์ดิโอรายวันแล้ว"
                            >
                              <Check size={12} /> ทำสำเร็จแล้ว
                            </button>
                          )}
                        </div>

                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', margin: '10px 0 6px' }}>
                          <div style={{ display: 'flex', alignItems: 'baseline', gap: '6px' }}>
                            <span style={{ fontSize: '32px', fontWeight: '800', color: 'var(--text-dark)' }}>
                              {cardioSteps > 0 ? cardioSteps.toLocaleString() : targetSteps.toLocaleString()}
                            </span>
                            <span style={{ fontSize: '14px', color: 'var(--text-muted)' }}>ก้าว</span>
                          </div>
                          <div style={{ fontSize: '12.5px', fontWeight: '700', color: '#0284c7', background: '#e0f2fe', padding: '4px 10px', borderRadius: '12px' }}>
                            📍 ~{targetDistanceKm} กม.
                          </div>
                        </div>

                        <div style={{ width: '100%', height: '6px', background: '#e2e8f0', borderRadius: '3px', overflow: 'hidden', marginTop: '6px' }}>
                          <div style={{
                            width: `${cardioSteps >= targetSteps ? 100 : Math.min(100, (cardioSteps / targetSteps) * 100)}%`,
                            height: '100%',
                            background: '#0284c7',
                            transition: 'width 0.5s ease-out'
                          }}></div>
                        </div>

                        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '11px', color: 'var(--text-muted)', marginTop: '6px' }}>
                          <span>เป้าหมายรายวัน: {targetSteps.toLocaleString()} ก้าว (~{targetDistanceKm} กม.)</span>
                          <span>{cardioSteps >= targetSteps ? '100%' : '0%'}</span>
                        </div>
                      </div>
                    </div>

                    {/* Visual Card 2: Burned */}
                    <div style={{ background: '#ffffff', border: '1px solid var(--border-color)', borderRadius: 'var(--radius-md)', padding: '20px', boxShadow: 'var(--shadow-sm)', textAlign: 'left', display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
                      <div>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                          <span style={{ fontSize: '12px', fontWeight: 'bold', color: 'var(--primary)' }}>CALORIES BURNED</span>
                          <button
                            type="button"
                            onClick={() => setShowLogBurnModal(true)}
                            style={{
                              background: 'rgba(16, 185, 129, 0.1)',
                              border: 'none',
                              color: 'var(--primary)',
                              fontSize: '11px',
                              fontWeight: '700',
                              padding: '3px 8px',
                              borderRadius: '4px',
                              cursor: 'pointer',
                              display: 'flex',
                              alignItems: 'center',
                              gap: '4px',
                              transition: 'all 0.2s'
                            }}
                            title="บันทึกกิจกรรมการเผาผลาญ"
                          >
                            <Plus size={12} /> บันทึกเพิ่ม
                          </button>
                        </div>
                        <div style={{ display: 'flex', alignItems: 'baseline', gap: '6px', margin: '12px 0 6px' }}>
                          <span style={{ fontSize: '32px', fontWeight: '800', color: 'var(--text-dark)' }}>{Math.round(totalBurned)}</span>
                          <span style={{ fontSize: '14px', color: 'var(--text-muted)' }}>kcal</span>
                        </div>
                        <div style={{ width: '100%', height: '6px', background: '#e2e8f0', borderRadius: '3px', overflow: 'hidden' }}>
                          <div style={{
                            width: `${Math.min(100, (totalBurned / 750) * 100)}%`,
                            height: '100%',
                            background: 'var(--primary)',
                            transition: 'width 0.5s ease-out'
                          }}></div>
                        </div>
                        <span style={{ fontSize: '11px', color: 'var(--text-muted)', display: 'block', marginTop: '6px' }}>เป้าหมายสัปดาห์: 750 kcal</span>
                      </div>
                    </div>

                    {/* Visual Card 3: Water Intake */}
                    <div style={{ background: '#ffffff', border: '1px solid var(--border-color)', borderRadius: 'var(--radius-md)', padding: '20px', boxShadow: 'var(--shadow-sm)', textAlign: 'left', display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
                      <div>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                          <span style={{ fontSize: '12px', fontWeight: 'bold', color: '#00b8d9' }}>WATER INTAKE</span>
                          {waterGlasses >= targetWaterGlasses && (
                            <span style={{ fontSize: '10px', background: '#e6fffa', color: '#00a389', padding: '2px 8px', borderRadius: '10px', fontWeight: 'bold' }}>✓ ครบแล้ว</span>
                          )}
                        </div>
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', margin: '10px 0 6px' }}>
                          <div style={{ display: 'flex', alignItems: 'baseline', gap: '4px' }}>
                            <span style={{ fontSize: '32px', fontWeight: '800', color: 'var(--text-dark)' }}>{waterGlasses}</span>
                            <span style={{ fontSize: '14px', color: 'var(--text-muted)' }}>/ {targetWaterGlasses} แก้ว</span>
                          </div>
                          {/* Interactive + / - buttons */}
                          <div style={{ display: 'flex', gap: '6px', alignItems: 'center' }}>
                            <button
                              type="button"
                              onClick={() => handleWaterGlassesChange(waterGlasses - 1)}
                              disabled={waterGlasses <= 0}
                              style={{
                                width: '28px',
                                height: '28px',
                                borderRadius: '50%',
                                border: '1px solid #cbd5e1',
                                background: '#f8fafc',
                                color: '#475569',
                                fontWeight: 'bold',
                                fontSize: '16px',
                                cursor: waterGlasses <= 0 ? 'not-allowed' : 'pointer',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                opacity: waterGlasses <= 0 ? 0.5 : 1,
                                transition: 'var(--transition)'
                              }}
                              title="ลด 1 แก้ว"
                            >
                              -
                            </button>
                            <button
                              type="button"
                              onClick={() => handleWaterGlassesChange(waterGlasses + 1)}
                              style={{
                                width: '28px',
                                height: '28px',
                                borderRadius: '50%',
                                border: 'none',
                                background: '#00b8d9',
                                color: 'white',
                                fontWeight: 'bold',
                                fontSize: '16px',
                                cursor: 'pointer',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                boxShadow: '0 2px 4px rgba(0, 184, 217, 0.3)',
                                transition: 'var(--transition)'
                              }}
                              title="เพิ่ม 1 แก้ว"
                            >
                              +
                            </button>
                          </div>
                        </div>
                        <div style={{ width: '100%', height: '6px', background: '#e2e8f0', borderRadius: '3px', overflow: 'hidden' }}>
                          <div style={{
                            width: `${Math.min(100, (waterGlasses / targetWaterGlasses) * 100)}%`,
                            height: '100%',
                            background: '#00b8d9',
                            transition: 'width 0.3s ease-out'
                          }}></div>
                        </div>
                        <span style={{ fontSize: '11px', color: 'var(--text-muted)', display: 'block', marginTop: '6px' }}>
                          เป้าหมายรายวัน: {targetWaterGlasses} แก้ว (~2.5 ลิตร)
                        </span>
                      </div>
                    </div>

                  </div>
                </div>

        {/* Workout & Calendar Schedule Grid */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '24px', alignItems: 'start' }}>

          {/* Workout Schedules Checklist & AI Planner */}
          <div style={{ background: '#ffffff', border: '1px solid var(--border-color)', borderRadius: 'var(--radius-md)', padding: '24px', boxShadow: 'var(--shadow-sm)', textAlign: 'left', minHeight: '380px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px', flexWrap: 'wrap', gap: '10px' }}>
              <h3 style={{ fontSize: '18px', fontWeight: '700', color: 'var(--text-dark)', display: 'flex', alignItems: 'center', gap: '8px', margin: 0 }}>
                <Calendar size={20} color="var(--primary)" /> แผนตารางและการบันทึกการออกกำลังกาย
              </h3>
                      <div style={{ display: 'flex', gap: '8px', alignItems: 'center', flexWrap: 'wrap' }}>
                        {/* Warm-up & Cool-down Guide Button */}
                        <button
                          onClick={() => handleOpenWarmupGuide('Full Body Routine', '', 'warmup')}
                          style={{
                            fontSize: '13px',
                            padding: '8px 16px',
                            borderRadius: '20px',
                            background: '#fffbeb',
                            color: '#b45309',
                            border: '1px solid #fde68a',
                            cursor: 'pointer',
                            fontWeight: '700',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '6px',
                            transition: 'all 0.2s'
                          }}
                          title="เปิดคู่มือแนะนำท่าวอร์มอัพ (Warm-up) และคูลดาวน์ (Cool-down)"
                        >
                          <Flame size={15} color="#f59e0b" />
                          <span>วอร์มอัพ & คูลดาวน์</span>
                        </button>

                        {/* Manual Workout Log Button */}
                        <button
                          onClick={() => setShowLogBurnModal(true)}
                          style={{
                            fontSize: '13px',
                            padding: '8px 16px',
                            borderRadius: '20px',
                            background: 'rgba(16, 185, 129, 0.1)',
                            color: 'var(--primary)',
                            border: '1px solid rgba(16, 185, 129, 0.3)',
                            cursor: 'pointer',
                            fontWeight: '700',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '6px',
                            transition: 'all 0.2s'
                          }}
                          title="บันทึกกิจกรรมการออกกำลังกายหรือการเผาผลาญด้วยตนเอง"
                        >
                          <Plus size={15} />
                          <span>บันทึกออกกำลังกายเอง</span>
                        </button>

                        {/* n8n AI Free Time Planner Button */}
                        <button
                          onClick={() => setShowN8nPlanModal(true)}
                          disabled={isN8nPlanning}
                          className="btn btn-primary"
                          style={{
                            padding: '8px 18px',
                            fontSize: '13px',
                            fontWeight: '700',
                            borderRadius: '20px',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '6px',
                            opacity: isN8nPlanning ? 0.7 : 1,
                            cursor: isN8nPlanning ? 'not-allowed' : 'pointer'
                          }}
                          title="นำตาราง Google Calendar ส่งให้ n8n AI วิเคราะห์ช่วงเวลาว่างและสร้างตารางซ้อมอัตโนมัติ"
                        >
                          {isN8nPlanning ? (
                            <>
                              <div className="spinner" style={{ width: '13px', height: '13px', border: '2px solid rgba(255,255,255,0.3)', borderTop: '2px solid white', borderRadius: '50%', animation: 'spin 1s linear infinite' }}></div>
                              <span>n8n กำลังจัดเวลา...</span>
                            </>
                          ) : (
                            <>
                              <Bot size={15} />
                              <span>จัดเวลาว่างด้วย n8n AI</span>
                            </>
                          )}
                        </button>

                        {/* Delete All Schedules Button */}
                        {workoutSchedules.length > 0 && (
                          <button
                            onClick={handleDeleteAllSchedules}
                            style={{
                              fontSize: '13px',
                              padding: '8px 14px',
                              borderRadius: '20px',
                              background: '#fef2f2',
                              color: '#ef4444',
                              border: '1px solid #fecaca',
                              cursor: 'pointer',
                              fontWeight: '700',
                              display: 'flex',
                              alignItems: 'center',
                              gap: '6px',
                              transition: 'all 0.2s'
                            }}
                            title="ลบตารางทั้งหมดที่เคยสร้างออก"
                          >
                            <Trash2 size={15} />
                            <span>ลบตาราง</span>
                          </button>
                        )}
                      </div>
                    </div>

                    {/* Tabs Switcher: แผนการฝึกซ้อม vs ประวัติกิจกรรมที่ทำแล้ว */}
                    <div style={{ display: 'flex', gap: '8px', borderBottom: '1px solid #e2e8f0', marginBottom: '18px' }}>
                      <button
                        onClick={() => setWorkoutTab('plan')}
                        style={{
                          padding: '8px 16px',
                          fontSize: '13.5px',
                          fontWeight: '700',
                          background: 'none',
                          border: 'none',
                          borderBottom: workoutTab === 'plan' ? '2.5px solid var(--primary)' : '2.5px solid transparent',
                          color: workoutTab === 'plan' ? 'var(--primary)' : '#64748b',
                          cursor: 'pointer',
                          display: 'flex',
                          alignItems: 'center',
                          gap: '6px'
                        }}
                      >
                        📋 แผนการซ้อม ({upcomingPlansCount})
                      </button>
                      <button
                        onClick={() => setWorkoutTab('history')}
                        style={{
                          padding: '8px 16px',
                          fontSize: '13.5px',
                          fontWeight: '700',
                          background: 'none',
                          border: 'none',
                          borderBottom: workoutTab === 'history' ? '2.5px solid var(--primary)' : '2.5px solid transparent',
                          color: workoutTab === 'history' ? 'var(--primary)' : '#64748b',
                          cursor: 'pointer',
                          display: 'flex',
                          alignItems: 'center',
                          gap: '6px'
                        }}
                      >
                        📜 ประวัติกิจกรรมทำแล้ว ({completedPlansCount})
                      </button>
                    </div>
                    {schedulesLoading ? (
                      <div style={{ display: 'flex', justifyItems: 'center', justifyContent: 'center', padding: '30px 0' }}>
                        <div className="spinner" style={{ width: '24px', height: '24px', border: '2.5px solid #e2e8f0', borderTop: '2.5px solid var(--primary)', borderRadius: '50%', animation: 'spin 1s linear infinite' }}></div>
                      </div>
                    ) : (totalPlansCount === 0) ? (
                      <div style={{
                        background: '#f8fafc',
                        border: '1px dashed #cbd5e1',
                        borderRadius: 'var(--radius-sm)',
                        padding: '40px 20px',
                        textAlign: 'center',
                        display: 'flex',
                        flexDirection: 'column',
                        alignItems: 'center',
                        gap: '16px'
                      }}>
                        <div style={{ width: '48px', height: '48px', borderRadius: '50%', backgroundColor: 'var(--primary-light)', color: 'var(--primary)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                          <Dumbbell size={24} />
                        </div>
                        <div>
                          <h4 style={{ fontSize: '16px', fontWeight: '700', color: 'var(--text-dark)', marginBottom: '6px' }}>ยังไม่มีตารางการออกกำลังกาย</h4>
                          <p style={{ fontSize: '13px', color: 'var(--text-muted)', maxWidth: '400px', margin: '0 auto' }}>
                            {isProfilePending
                              ? "กรุณาตั้งค่าข้อมูลสุขภาพของคุณก่อนเพื่อเปิดระบบการคำนวณและสร้างตารางออกกำลังกายอัจฉริยะ"
                              : "สามารถคลิกปุ่ม 'จัดเวลาว่างด้วย n8n AI' เพื่อนำตารางงานจาก Google Calendar มาวิเคราะห์ช่วงเวลาว่างและสร้างตารางซ้อมจริงได้ทันที"
                            }
                          </p>
                        </div>
                        <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap', justifyContent: 'center' }}>
                          <button
                            onClick={() => setShowLogBurnModal(true)}
                            style={{
                              padding: '10px 20px',
                              fontSize: '14px',
                              fontWeight: '700',
                              display: 'flex',
                              alignItems: 'center',
                              gap: '6px',
                              cursor: 'pointer',
                              borderRadius: '8px',
                              background: 'rgba(16, 185, 129, 0.1)',
                              color: 'var(--primary)',
                              border: '1.5px solid rgba(16, 185, 129, 0.3)',
                              transition: 'all 0.2s'
                            }}
                          >
                            <Plus size={16} />
                            <span>บันทึกออกกำลังกายเอง</span>
                          </button>

                          <button
                            onClick={() => setShowN8nPlanModal(true)}
                            disabled={isN8nPlanning}
                            className="btn btn-primary"
                            style={{
                              padding: '10px 24px',
                              fontSize: '14px',
                              fontWeight: '700',
                              display: 'flex',
                              alignItems: 'center',
                              gap: '8px',
                              opacity: isN8nPlanning ? 0.7 : 1,
                              cursor: isN8nPlanning ? 'not-allowed' : 'pointer'
                            }}
                          >
                            {isN8nPlanning ? (
                              <>
                                <div className="spinner" style={{ width: '15px', height: '15px', border: '2px solid rgba(255,255,255,0.3)', borderTop: '2px solid white', borderRadius: '50%', animation: 'spin 1s linear infinite' }}></div>
                                <span>กำลังจัดตารางด้วย n8n AI...</span>
                              </>
                            ) : (
                              <>
                                <Bot size={17} />
                                <span>จัดเวลาว่างด้วย n8n AI</span>
                              </>
                            )}
                          </button>
                        </div>
                      </div>
                    ) : (
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
                        {(() => {
                          const dbItems = workoutSchedules
                            .filter(schedule => {
                              if (workoutTab === 'history') {
                                return schedule.status === 'COMPLETED';
                              } else {
                                return schedule.status !== 'COMPLETED';
                              }
                            })
                            .filter(schedule => {
                              const titleClean = (schedule.title || '').toLowerCase().replace(/\s*\(yourpaceevent\)\s*/gi, '').trim();
                              const hasMatchingGCalEvent = calendarEvents.some(event => {
                                const sumClean = (event.summary || '').toLowerCase().replace(/\s*\(yourpaceevent\)\s*/gi, '').trim();
                                return sumClean.length > 0 && (sumClean.includes(titleClean) || titleClean.includes(sumClean));
                              });
                              return !hasMatchingGCalEvent;
                            })
                            .map(schedule => ({
                              type: 'db',
                              date: new Date(schedule.scheduledDate),
                              schedule: schedule,
                              key: `db-${getScheduleId(schedule) || schedule.title}`
                            }));

                          const gcalItems = calendarEvents
                            .filter(event => {
                              if (!event.summary || !event.summary.toLowerCase().includes('yourpaceevent')) return false;

                              const cleanSummary = (event.summary || '').toLowerCase().replace(/\s*\(yourpaceevent\)\s*/gi, '').trim();
                              const isCompleted = workoutSchedules.some(s => {
                                if (s.status !== 'COMPLETED') return false;
                                const cleanSTitle = (s.title || '').toLowerCase().replace(/\s*\(yourpaceevent\)\s*/gi, '').trim();
                                return cleanSTitle.length > 0 && (cleanSTitle.includes(cleanSummary) || cleanSummary.includes(cleanSTitle));
                              });

                              if (workoutTab === 'history') {
                                return isCompleted;
                              } else {
                                return !isCompleted;
                              }
                            })
                            .map((event, idx) => ({
                              type: 'gcal',
                              date: event.start.dateTime ? new Date(event.start.dateTime) : new Date(event.start.date),
                              event: event,
                              key: `gcal-${event.id || idx}`
                            }));

                          // รวมและเรียงลำดับตามวันที่
                          const unifiedList = [...dbItems, ...gcalItems].sort((a, b) => {
                            if (workoutTab === 'history') {
                              return b.date.getTime() - a.date.getTime(); // ล่าสุด -> อดีต
                            }
                            return a.date.getTime() - b.date.getTime(); // วันแรก -> วันถัดไป
                          });

                          return unifiedList.map(item => {
                            if (item.type === 'db') {
                              const schedule = item.schedule;
                              const isCompleted = schedule.status === 'COMPLETED';
                              const sDate = item.date;
                              const isToday = sDate.toDateString() === new Date().toDateString();
                              const formattedDate = sDate.toLocaleDateString('th-TH', { weekday: 'long', day: 'numeric', month: 'short' });

                              return (
                                <div
                                  key={item.key}
                                  style={{
                                    border: isToday ? (isCompleted ? '1.5px solid #86efac' : '2px solid #10b981') : '1px solid #e2e8f0',
                                    background: isToday
                                      ? (isCompleted ? '#f0fdf4' : 'linear-gradient(180deg, #ffffff 0%, #f0fdf4 100%)')
                                      : (isCompleted ? '#f8fafc' : '#ffffff'),
                                    borderRadius: '16px',
                                    padding: '22px',
                                    display: 'flex',
                                    flexDirection: 'column',
                                    gap: '14px',
                                    boxShadow: isToday ? '0 4px 18px rgba(16, 185, 129, 0.15)' : '0 2px 8px rgba(0,0,0,0.03)',
                                    opacity: isCompleted ? 0.88 : 1,
                                    transition: 'all 0.3s',
                                    position: 'relative'
                                  }}
                                >
                                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '8px' }}>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                      {isToday ? (
                                        <span style={{
                                          fontSize: '11.5px',
                                          fontWeight: '800',
                                          background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)',
                                          color: 'white',
                                          padding: '3px 10px',
                                          borderRadius: '12px',
                                          boxShadow: '0 2px 6px rgba(16, 185, 129, 0.35)',
                                          display: 'flex',
                                          alignItems: 'center',
                                          gap: '4px'
                                        }}>
                                          🌟 กิจกรรมวันนี้ (Today)
                                        </span>
                                      ) : (
                                        <span style={{ fontSize: '13.5px', fontWeight: '700', color: isCompleted ? 'var(--text-muted)' : '#64748b' }}>
                                          🗓️ {formattedDate}
                                        </span>
                                      )}
                                    </div>

                                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                      <span style={{
                                        fontSize: '11px',
                                        fontWeight: '800',
                                        padding: '4px 10px',
                                        borderRadius: '4px',
                                        background: isCompleted ? '#e6f4ea' : (isToday ? '#d1fae5' : '#f1f5f9'),
                                        color: isCompleted ? '#137333' : (isToday ? '#065f46' : '#475569')
                                      }}>
                                        {isCompleted ? 'COMPLETED' : schedule.targetIntensity || 'MODERATE'}
                                      </span>
                                      <button
                                        onClick={() => handleDeleteSchedule(getScheduleId(schedule))}
                                        style={{
                                          background: 'none',
                                          border: 'none',
                                          color: '#cbd5e1',
                                          cursor: 'pointer',
                                          padding: '2px',
                                          borderRadius: '4px',
                                          display: 'flex',
                                          alignItems: 'center'
                                        }}
                                        title="ลบรายการนี้"
                                      >
                                        <X size={16} />
                                      </button>
                                    </div>
                                  </div>

                                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                    <div>
                                      <h4 style={{
                                        fontSize: '18px',
                                        fontWeight: '700',
                                        color: isCompleted ? 'var(--text-muted)' : '#0f172a',
                                        marginBottom: '4px',
                                        textDecoration: isCompleted ? 'line-through' : 'none'
                                      }}>
                                        {schedule.title}
                                      </h4>
                                      <p style={{ fontSize: '13px', color: '#94a3b8', margin: 0 }}>
                                        ⏱️ ระยะเวลา: {schedule.durationMinutes} นาที | 🔥 เผาผลาญ: {schedule.burnedCalories ? Math.round(schedule.burnedCalories) : 0} kcal (เมื่อเสร็จ)
                                      </p>
                                    </div>

                                    <div style={{ display: 'flex', gap: '8px', alignItems: 'center', flexWrap: 'wrap' }}>
                                      <button
                                        type="button"
                                        onClick={() => handleOpenWarmupGuide(schedule.title, JSON.stringify(schedule.details || []), 'warmup')}
                                        style={{
                                          padding: '7px 14px',
                                          fontSize: '12.5px',
                                          fontWeight: '700',
                                          display: 'flex',
                                          alignItems: 'center',
                                          gap: '5px',
                                          background: 'rgba(245, 158, 11, 0.1)',
                                          color: '#b45309',
                                          border: '1px solid rgba(245, 158, 11, 0.25)',
                                          borderRadius: '20px',
                                          cursor: 'pointer',
                                          transition: 'all 0.2s'
                                        }}
                                        title="ดูคำแนะนำท่าวอร์มอัพก่อนซ้อม และท่าคูลดาวน์หลังซ้อมสำหรับกิจกรรมนี้"
                                      >
                                        <span>🧘 วอร์มอัพ/ยืดเหยียด</span>
                                      </button>

                                      <button
                                        onClick={() => handleToggleScheduleStatus(schedule)}
                                        style={{
                                          padding: isCompleted ? '8px 18px' : '8px 20px',
                                          fontSize: isCompleted ? '13px' : '14px',
                                          fontWeight: '700',
                                          display: 'flex',
                                          alignItems: 'center',
                                          gap: '6px',
                                          background: isCompleted ? '#e6f4ea' : '#48bb78',
                                          color: isCompleted ? '#137333' : 'white',
                                          border: isCompleted ? '1px solid #ceedd5' : 'none',
                                          borderRadius: '24px',
                                          cursor: 'pointer',
                                          boxShadow: isCompleted ? 'none' : '0 2px 8px rgba(72, 187, 120, 0.3)',
                                          transition: 'all 0.2s'
                                        }}
                                        title={isCompleted ? "คลิกเพื่อยกเลิกสถานะทำสำเร็จ" : "บันทึกว่าทำสำเร็จแล้ว"}
                                      >
                                        <Check size={16} /> {isCompleted ? 'สำเร็จแล้ว (คลิกเพื่อยกเลิก)' : 'ทำสำเร็จแล้ว'}
                                      </button>
                                    </div>
                                  </div>

                                  {/* Exercises list in schedule */}
                                  {schedule.details && schedule.details.length > 0 && (
                                    <div style={{
                                      borderTop: '1px dashed #e2e8f0',
                                      marginTop: '12px',
                                      paddingTop: '16px',
                                      display: 'flex',
                                      flexDirection: 'column',
                                      gap: '12px',
                                      textAlign: 'left'
                                    }}>
                                      <span style={{ fontSize: '13px', fontWeight: '700', color: '#94a3b8' }}>
                                        รายการท่าฝึกซ้อม:
                                      </span>
                                      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '12px' }}>
                                        {schedule.details.map((detail, idx) => (
                                          <div key={idx} style={{ background: '#f8fafc', padding: '16px 18px', borderRadius: '12px', border: '1px solid #f1f5f9', transition: 'all 0.2s' }}>
                                            <span style={{ fontSize: '15px', fontWeight: '700', display: 'block', color: '#334155', marginBottom: '4px' }}>
                                              {detail.exercise.name}
                                            </span>
                                            <span style={{ fontSize: '13px', color: '#10b981', fontWeight: '600' }}>
                                              {detail.sets} เซ็ต × {detail.reps} ครั้ง <span style={{ color: '#94a3b8', fontWeight: 'normal' }}>({detail.durationSeconds} วินาที)</span>
                                            </span>
                                          </div>
                                        ))}
                                      </div>
                                    </div>
                                  )}
                                </div>
                              );
                            } else {
                              const event = item.event;
                              const start = item.date;
                              const isAllDay = !event.start.dateTime;
                              const isToday = start.toDateString() === new Date().toDateString();
                              const formattedDate = start.toLocaleDateString('th-TH', { weekday: 'long', day: 'numeric', month: 'short' });
                              const startTime = isAllDay ? "ตลอดวัน" : start.toLocaleTimeString('th-TH', { hour: '2-digit', minute: '2-digit' });

                              const cleanSummary = (event.summary || '').toLowerCase().replace(/\s*\(yourpaceevent\)\s*/gi, '').trim();
                              const isCompleted = workoutSchedules.some(s => {
                                if (s.status !== 'COMPLETED') return false;
                                const cleanSTitle = (s.title || '').toLowerCase().replace(/\s*\(yourpaceevent\)\s*/gi, '').trim();
                                return cleanSTitle.length > 0 && (cleanSTitle.includes(cleanSummary) || cleanSummary.includes(cleanSTitle));
                              });

                              return (
                                <div
                                  key={item.key}
                                  style={{
                                    border: isToday ? (isCompleted ? '1.5px solid #86efac' : '2px solid #10b981') : '1px solid #e2e8f0',
                                    background: isToday
                                      ? (isCompleted ? '#f0fdf4' : 'linear-gradient(180deg, #ffffff 0%, #f0fdf4 100%)')
                                      : (isCompleted ? '#f8fafc' : '#ffffff'),
                                    borderRadius: 'var(--radius-md)',
                                    padding: '18px 20px',
                                    display: 'flex',
                                    flexDirection: 'column',
                                    gap: '12px',
                                    boxShadow: isToday ? '0 4px 18px rgba(16, 185, 129, 0.15)' : '0 2px 8px rgba(0,0,0,0.03)',
                                    opacity: isCompleted ? 0.88 : 1,
                                    transition: 'all 0.3s'
                                  }}
                                >
                                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '10px' }}>
                                    <div style={{ textAlign: 'left', flex: 1, minWidth: '200px' }}>
                                      <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '4px', flexWrap: 'wrap' }}>
                                        <span style={{ fontSize: '11px', fontWeight: '800', color: '#047857', background: '#ecfdf5', padding: '2px 8px', borderRadius: '4px' }}>
                                          Google Calendar Event
                                        </span>
                                        {isToday && (
                                          <span style={{
                                            fontSize: '11px',
                                            fontWeight: '800',
                                            background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)',
                                            color: 'white',
                                            padding: '2px 8px',
                                            borderRadius: '10px',
                                            boxShadow: '0 2px 6px rgba(16, 185, 129, 0.3)'
                                          }}>
                                            🌟 วันนี้ (Today)
                                          </span>
                                        )}
                                        {isCompleted && (
                                          <span style={{ fontSize: '11px', fontWeight: '800', color: '#15803d', background: '#dcfce7', padding: '2px 8px', borderRadius: '4px' }}>
                                            COMPLETED
                                          </span>
                                        )}
                                      </div>
                                      <h4 style={{
                                        fontSize: '16px',
                                        fontWeight: '700',
                                        margin: '4px 0 2px',
                                        color: isCompleted ? 'var(--text-muted)' : '#0f172a',
                                        textDecoration: isCompleted ? 'line-through' : 'none'
                                      }}>
                                        {event.summary ? event.summary.replace(/\s*\(YourPaceEvent\)\s*/gi, '').trim() : "(ไม่มีชื่อกิจกรรม)"}
                                      </h4>
                                      <span style={{ fontSize: '13px', color: isToday ? '#059669' : '#64748b', fontWeight: isToday ? '600' : 'normal' }}>
                                        🗓️ {formattedDate} • ⏰ {startTime}
                                      </span>
                                    </div>

                                    <div style={{ display: 'flex', gap: '8px', alignItems: 'center', flexWrap: 'wrap' }}>
                                      <button
                                        type="button"
                                        onClick={() => handleOpenWarmupGuide(event.summary || '', event.description || '', 'warmup')}
                                        style={{
                                          padding: '7px 14px',
                                          fontSize: '12.5px',
                                          fontWeight: '700',
                                          display: 'flex',
                                          alignItems: 'center',
                                          gap: '5px',
                                          background: 'rgba(245, 158, 11, 0.1)',
                                          color: '#b45309',
                                          border: '1px solid rgba(245, 158, 11, 0.25)',
                                          borderRadius: '20px',
                                          cursor: 'pointer',
                                          transition: 'all 0.2s'
                                        }}
                                        title="ดูคำแนะนำท่าวอร์มอัพก่อนซ้อม และท่าคูลดาวน์หลังซ้อมสำหรับกิจกรรมนี้"
                                      >
                                        <span>🧘 วอร์มอัพ/ยืดเหยียด</span>
                                      </button>

                                      <button
                                        type="button"
                                        onClick={() => handleToggleGCalEvent(event)}
                                        style={{
                                          display: 'flex',
                                          alignItems: 'center',
                                          gap: '6px',
                                          padding: isCompleted ? '8px 16px' : '8px 18px',
                                          fontSize: isCompleted ? '13px' : '13.5px',
                                          fontWeight: '700',
                                          borderRadius: '24px',
                                          cursor: 'pointer',
                                          transition: 'all 0.2s',
                                          background: isCompleted ? '#e6f4ea' : '#48bb78',
                                          color: isCompleted ? '#137333' : 'white',
                                          border: isCompleted ? '1px solid #ceedd5' : 'none',
                                          boxShadow: isCompleted ? 'none' : '0 2px 8px rgba(72, 187, 120, 0.3)',
                                          flexShrink: 0
                                        }}
                                        title={isCompleted ? "คลิกเพื่อยกเลิกสถานะทำสำเร็จ" : "บันทึกว่าทำสำเร็จแล้ว (Approve)"}
                                      >
                                        <Check size={16} />
                                        <span>{isCompleted ? 'สำเร็จแล้ว (ยกเลิก)' : 'ทำสำเร็จแล้ว'}</span>
                                      </button>
                                    </div>
                                  </div>

                                  {/* Event description / exercise details from Google Calendar */}
                                  {event.description && (() => {
                                    const lines = event.description.split('\n').map(l => l.trim()).filter(l => l.length > 0);
                                    const metaLines = lines.filter(l => /^(?:✅|⏱️|🔥|📝)/u.test(l));
                                    const exerciseLines = lines.filter(l => /^[-–•]/.test(l));
                                    const otherLines = lines.filter(l => !/^(?:✅|⏱️|🔥|📝)/u.test(l) && !/^[-–•]/.test(l));

                                    return (
                                      <div style={{
                                        borderTop: '1px dashed #e2e8f0',
                                        paddingTop: '14px',
                                        display: 'flex',
                                        flexDirection: 'column',
                                        gap: '10px',
                                        textAlign: 'left'
                                      }}>
                                        {metaLines.length > 0 && (
                                          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
                                            {metaLines.map((line, i) => (
                                              <span key={i} style={{
                                                fontSize: '12px',
                                                color: '#64748b',
                                                background: '#f8fafc',
                                                border: '1px solid #f1f5f9',
                                                borderRadius: '8px',
                                                padding: '3px 10px',
                                              }}>{line}</span>
                                            ))}
                                          </div>
                                        )}
                                        {exerciseLines.length > 0 && (
                                          <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                                            <span style={{ fontSize: '12px', fontWeight: '700', color: '#94a3b8' }}>🏋️ รายการท่าออกกำลังกาย:</span>
                                            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(190px, 1fr))', gap: '6px' }}>
                                              {exerciseLines.map((line, i) => (
                                                <div key={i} style={{
                                                  background: '#f0fdf4',
                                                  border: '1px solid #bbf7d0',
                                                  borderRadius: '8px',
                                                  padding: '6px 12px',
                                                  fontSize: '12.5px',
                                                  color: '#065f46',
                                                  fontWeight: '500'
                                                }}>
                                                  {line.replace(/^[-–•]\s*/, '')}
                                                </div>
                                              ))}
                                            </div>
                                          </div>
                                        )}
                                        {otherLines.length > 0 && exerciseLines.length === 0 && (
                                          <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                                            {otherLines.map((line, i) => (
                                              <span key={i} style={{ fontSize: '12.5px', color: '#64748b' }}>{line}</span>
                                            ))}
                                          </div>
                                        )}
                                      </div>
                                    );
                                  })()}
                                </div>
                              );
                            }
                          });
                        })()}
                      </div>
                    )}
                  </div>

                  {/* Right Column: Google Calendar Side Schedule */}
                  <div style={{
                    background: '#ffffff',
                    border: '1px solid var(--border-color)',
                    borderRadius: 'var(--radius-md)',
                    padding: '24px',
                    boxShadow: '0 4px 12px rgba(0,0,0,0.03)',
                    display: 'flex',
                    flexDirection: 'column'
                  }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
                      <h3 style={{ fontSize: '18px', fontWeight: '800', color: 'var(--text-dark)', margin: 0, display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <Calendar size={20} color="#4285F4" /> ตารางงานจาก Google Calendar
                      </h3>
                      {isCalendarConnected && (
                        <button
                          onClick={() => {
                            const token = getSessionToken();
                            if (token) loadCalendarEvents(token);
                          }}
                          disabled={calendarLoading}
                          style={{
                            background: 'transparent',
                            border: '1px solid #e2e8f0',
                            borderRadius: '8px',
                            padding: '4px 8px',
                            cursor: 'pointer',
                            color: '#64748b',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '4px',
                            fontSize: '12px'
                          }}
                          title="รีเฟรชตารางงาน"
                        >
                          <RefreshCw size={13} className={calendarLoading ? "animate-spin" : ""} />
                        </button>
                      )}
                    </div>

                    {!isCalendarConnected ? (
                      <div style={{
                        flex: 1,
                        background: '#f8fafc',
                        border: '1px dashed #cbd5e1',
                        borderRadius: 'var(--radius-sm)',
                        padding: '30px 16px',
                        textAlign: 'center',
                        display: 'flex',
                        flexDirection: 'column',
                        alignItems: 'center',
                        justifyContent: 'center',
                        gap: '16px'
                      }}>
                        <div style={{ width: '48px', height: '48px', borderRadius: '50%', backgroundColor: '#e8f0fe', color: '#4285F4', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                          <Calendar size={24} />
                        </div>
                        <div>
                          <h4 style={{ fontSize: '15px', fontWeight: '700', color: 'var(--text-dark)', marginBottom: '6px' }}>ยังไม่ได้เชื่อมต่อ Google Calendar</h4>
                          <p style={{ fontSize: '12px', color: 'var(--text-muted)', maxWidth: '300px', margin: '0 auto', lineHeight: '1.4' }}>
                            เชื่อมต่อปฏิทินงานของคุณเพื่อนำตารางกิจกรรมมาแสดงคู่กับตารางสุขภาพ และช่วยให้ AI ประเมินการซ้อมได้ดีขึ้น
                          </p>
                        </div>
                        <button
                          onClick={handleConnectCalendar}
                          style={{
                            background: '#4285F4',
                            color: 'white',
                            border: 'none',
                            padding: '10px 20px',
                            borderRadius: 'var(--radius-sm)',
                            fontSize: '13px',
                            fontWeight: '700',
                            cursor: 'pointer',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '8px',
                            boxShadow: '0 2px 4px rgba(66,133,244,0.2)'
                          }}
                        >
                          <span>Connect Google Calendar</span>
                        </button>
                      </div>
                    ) : calendarLoading ? (
                      <div style={{ display: 'flex', flex: 1, alignItems: 'center', justifyContent: 'center', padding: '40px 0' }}>
                        <div className="spinner" style={{ width: '24px', height: '24px', border: '2.5px solid #e2e8f0', borderTop: '2.5px solid #4285F4', borderRadius: '50%', animation: 'spin 1s linear infinite' }}></div>
                      </div>
                    ) : calendarEvents.length === 0 ? (
                      <div style={{
                        flex: 1,
                        background: '#f8fafc',
                        border: '1px dashed #cbd5e1',
                        borderRadius: 'var(--radius-sm)',
                        padding: '30px 16px',
                        textAlign: 'center',
                        display: 'flex',
                        flexDirection: 'column',
                        alignItems: 'center',
                        justifyContent: 'center',
                        gap: '10px'
                      }}>
                        <span style={{ fontSize: '32px' }}>⛱️</span>
                        <h4 style={{ fontSize: '14px', fontWeight: '700', color: 'var(--text-dark)', margin: 0 }}>ไม่มีกิจกรรมงานในสัปดาห์นี้</h4>
                        <p style={{ fontSize: '12px', color: 'var(--text-muted)', margin: 0 }}>วันสบายๆ หรือวันหยุดยาว เหมาะอย่างยิ่งสำหรับการฝึกซ้อมรักษาสุขภาพ!</p>
                      </div>
                    ) : (
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', overflowY: 'auto', maxHeight: '520px', paddingRight: '4px' }}>
                        {(() => {
                          const groupedEvents = {};
                          calendarEvents.forEach(event => {
                            const start = event.start.dateTime ? new Date(event.start.dateTime) : new Date(event.start.date);
                            const dateKey = start.getFullYear() + '-' + String(start.getMonth() + 1).padStart(2, '0') + '-' + String(start.getDate()).padStart(2, '0');
                            if (!groupedEvents[dateKey]) {
                              groupedEvents[dateKey] = {
                                dateObj: start,
                                items: []
                              };
                            }
                            groupedEvents[dateKey].items.push(event);
                          });

                          const sortedDates = Object.keys(groupedEvents).sort();
                          const todayStr = new Date().getFullYear() + '-' + String(new Date().getMonth() + 1).padStart(2, '0') + '-' + String(new Date().getDate()).padStart(2, '0');

                          return sortedDates.map((dateKey) => {
                            const group = groupedEvents[dateKey];
                            const isToday = dateKey === todayStr;
                            const formattedDateHeader = group.dateObj.toLocaleDateString('th-TH', { weekday: 'long', day: 'numeric', month: 'short' });

                            return (
                              <div key={dateKey} style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                                {/* Date Header Divider */}
                                <div style={{
                                  display: 'flex',
                                  alignItems: 'center',
                                  justifyContent: 'space-between',
                                  padding: '6px 12px',
                                  background: isToday ? '#e8f0fe' : '#f8fafc',
                                  borderRadius: '8px',
                                  borderLeft: isToday ? '4px solid #4285F4' : '4px solid #cbd5e1'
                                }}>
                                  <span style={{ fontSize: '13px', fontWeight: '700', color: isToday ? '#1a73e8' : '#475569' }}>
                                    🗓️ {formattedDateHeader} {isToday ? '(วันนี้)' : ''}
                                  </span>
                                  <span style={{ fontSize: '11px', fontWeight: '600', color: '#94a3b8' }}>
                                    {group.items.length} กิจกรรม
                                  </span>
                                </div>

                                {/* Event Items for this date */}
                                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                                  {group.items.map((event, idx) => {
                                    const start = event.start.dateTime ? new Date(event.start.dateTime) : new Date(event.start.date);
                                    const end = event.end.dateTime ? new Date(event.end.dateTime) : new Date(event.end.date);
                                    const isAllDay = !event.start.dateTime;
                                    const startTime = isAllDay ? "ตลอดวัน" : start.toLocaleTimeString('th-TH', { hour: '2-digit', minute: '2-digit' });
                                    const endTime = isAllDay ? "" : " - " + end.toLocaleTimeString('th-TH', { hour: '2-digit', minute: '2-digit' });
                                    const title = event.summary ? event.summary.replace(/\s*\(YourPaceEvent\)\s*/gi, '').trim() : "(ไม่มีชื่องาน)";
                                    const isYourPaceEvent = event.summary && event.summary.toLowerCase().includes('yourpaceevent');

                                    return (
                                      <div
                                        key={idx}
                                        style={{
                                          border: isToday ? '1px solid #93c5fd' : '1px solid #e2e8f0',
                                          background: '#ffffff',
                                          borderRadius: '12px',
                                          padding: '12px 14px',
                                          textAlign: 'left',
                                          display: 'flex',
                                          flexDirection: 'column',
                                          gap: '4px',
                                          boxShadow: '0 1px 3px rgba(0,0,0,0.02)'
                                        }}
                                      >
                                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                          <h4 style={{ fontSize: '14.5px', fontWeight: '700', color: '#0f172a', margin: 0 }}>
                                            {title}
                                          </h4>
                                          {isYourPaceEvent && (
                                            <span style={{ fontSize: '10px', fontWeight: '800', background: '#ecfdf5', color: '#047857', padding: '2px 8px', borderRadius: '10px' }}>
                                              YOURPACE
                                            </span>
                                          )}
                                        </div>
                                        <div style={{ fontSize: '12px', color: '#64748b', display: 'flex', alignItems: 'center', gap: '6px' }}>
                                          <span>⏰ {startTime}{endTime}</span>
                                          {event.location && <span>• 📍 {event.location}</span>}
                                        </div>
                                      </div>
                                    );
                                  })}
                                </div>
                              </div>
                            );
                          });
                        })()}
                      </div>
                    )}
                  </div>

                </div>
              </>
            ) : dashboardMainTab === 'nutrition' ? (
              /* VIEW 2: DEDICATED AI NUTRITION & ENERGY STUDIO */
              <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }} className="animate-fade-in">
                
                {/* 4 Nutrition Metric Cards */}
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '18px' }}>
                  {/* Card 1: Target Calories */}
                  <div style={{ background: '#ffffff', border: '1px solid var(--border-color)', borderRadius: 'var(--radius-md)', padding: '20px', boxShadow: 'var(--shadow-sm)', textAlign: 'left' }}>
                    <span style={{ fontSize: '12px', fontWeight: 'bold', color: 'var(--primary)' }}>TARGET CALORIES</span>
                    <div style={{ display: 'flex', alignItems: 'baseline', gap: '6px', margin: '10px 0 6px' }}>
                      <span style={{ fontSize: '30px', fontWeight: '800', color: 'var(--text-dark)' }}>
                        {userProfile?.targetCalories || 2000}
                      </span>
                      <span style={{ fontSize: '13px', color: 'var(--text-muted)' }}>kcal/วัน</span>
                    </div>
                    <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>พลังงานที่แนะนำตามเป้าหมาย</span>
                  </div>

                  {/* Card 2: Calories In */}
                  <div style={{ background: '#ffffff', border: '1px solid var(--border-color)', borderRadius: 'var(--radius-md)', padding: '20px', boxShadow: 'var(--shadow-sm)', textAlign: 'left' }}>
                    <span style={{ fontSize: '12px', fontWeight: 'bold', color: '#059669' }}>CALORIES IN (วันนี้)</span>
                    <div style={{ display: 'flex', alignItems: 'baseline', gap: '6px', margin: '10px 0 6px' }}>
                      <span style={{ fontSize: '30px', fontWeight: '800', color: '#059669' }}>
                        {Math.round(todayMealsSummary?.totalCalories || 0)}
                      </span>
                      <span style={{ fontSize: '13px', color: 'var(--text-muted)' }}>kcal</span>
                    </div>
                    <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>จาก {todayMealsSummary?.meals?.length || 0} มื้อที่บันทึก</span>
                  </div>

                  {/* Card 3: Burned Calories */}
                  <div style={{ background: '#ffffff', border: '1px solid var(--border-color)', borderRadius: 'var(--radius-md)', padding: '20px', boxShadow: 'var(--shadow-sm)', textAlign: 'left' }}>
                    <span style={{ fontSize: '12px', fontWeight: 'bold', color: '#ea580c' }}>WORKOUT BURNED</span>
                    <div style={{ display: 'flex', alignItems: 'baseline', gap: '6px', margin: '10px 0 6px' }}>
                      <span style={{ fontSize: '30px', fontWeight: '800', color: '#ea580c' }}>
                        {Math.round(totalBurned)}
                      </span>
                      <span style={{ fontSize: '13px', color: 'var(--text-muted)' }}>kcal</span>
                    </div>
                    <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>เผาผลาญจากการออกกำลังกาย</span>
                  </div>

                  {/* Card 4: Water Intake */}
                  <div style={{ background: '#ffffff', border: '1px solid var(--border-color)', borderRadius: 'var(--radius-md)', padding: '20px', boxShadow: 'var(--shadow-sm)', textAlign: 'left' }}>
                    <span style={{ fontSize: '12px', fontWeight: 'bold', color: '#00b8d9' }}>WATER INTAKE</span>
                    <div style={{ display: 'flex', alignItems: 'baseline', gap: '6px', margin: '10px 0 6px' }}>
                      <span style={{ fontSize: '30px', fontWeight: '800', color: '#00b8d9' }}>
                        {waterGlasses}
                      </span>
                      <span style={{ fontSize: '13px', color: 'var(--text-muted)' }}>/ {targetWaterGlasses} แก้ว</span>
                    </div>
                    <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>~{(waterGlasses * 250 / 1000).toFixed(1)} ลิตร</span>
                  </div>
                </div>

                {/* Section: AI Nutrition & Meal Tracker Main Studio Card */}
                <div style={{
                  background: '#ffffff',
                  border: '1px solid var(--border-color)',
                  borderRadius: 'var(--radius-md)',
                  padding: '24px 28px',
                  boxShadow: 'var(--shadow-sm)',
                  textAlign: 'left'
                }}>
                  {/* Header with Title and Action Button */}
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '18px', flexWrap: 'wrap', gap: '12px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                      <div style={{ width: '44px', height: '44px', borderRadius: '12px', background: '#ecfdf5', color: '#059669', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                        <Utensils size={24} />
                      </div>
                      <div>
                        <h3 style={{ fontSize: '20px', fontWeight: '800', color: '#0f172a', margin: 0, display: 'flex', alignItems: 'center', gap: '8px' }}>
                          <span>โภชนาการและพลังงานอัจฉริยะ (AI Smart Nutrition Studio)</span>
                          <span style={{ fontSize: '11px', fontWeight: '700', background: '#e0f2fe', color: '#0369a1', padding: '2px 8px', borderRadius: '10px' }}>
                            Multimodal AI
                          </span>
                        </h3>
                        <span style={{ fontSize: '13px', color: '#64748b' }}>
                          วิเคราะห์ภาพถ่ายอาหาร สมดุลพลังงาน In vs Out ดื่มน้ำ และแนวโน้มรายสัปดาห์
                        </span>
                      </div>
                    </div>

                    <button
                      type="button"
                      onClick={() => {
                        setMealForm({ mealType: 'LUNCH', mealDescription: '', calories: '', protein: '', carbs: '', fat: '' });
                        setMealAnalysisPreview(null);
                        setPhotoPreview(null);
                        setPhotoBase64('');
                        setMealModalMode('photo');
                        setShowLogMealModal(true);
                      }}
                      style={{
                        background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)',
                        border: 'none',
                        color: 'white',
                        padding: '10px 20px',
                        borderRadius: '8px',
                        fontWeight: '700',
                        fontSize: '13.5px',
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '6px',
                        boxShadow: '0 2px 6px rgba(16, 185, 129, 0.3)',
                        transition: 'all 0.2s'
                      }}
                    >
                      <Camera size={16} /> 📸 ถ่ายรูป/บันทึกมื้ออาหาร (AI Scan)
                    </button>
                  </div>

                  {/* 5 Feature Navigation Sub-tabs */}
                  <div style={{
                    display: 'flex',
                    gap: '8px',
                    borderBottom: '1px solid #e2e8f0',
                    paddingBottom: '14px',
                    marginBottom: '20px',
                    overflowX: 'auto'
                  }}>
                    {[
                      { id: 'tracker', label: '🥗 สารอาหารวันนี้ (Macros)', icon: Salad },
                      { id: 'energy', label: '⚖️ สมดุลพลังงาน (In vs Out)', icon: Activity },
                      { id: 'hydration', label: '💧 ดื่มน้ำ (Hydration)', icon: Droplets },
                      { id: 'analytics', label: '📊 สถิติ 7 วัน & ทำนายน้ำหนัก', icon: BarChart3 },
                      { id: 'coach', label: '🤖 คำแนะนำโค้ช AI (Feedback)', icon: Bot }
                    ].map(tab => {
                      const isSelected = nutritionSubTab === tab.id;
                      const Icon = tab.icon;
                      return (
                        <button
                          key={tab.id}
                          type="button"
                          onClick={() => {
                            setNutritionSubTab(tab.id);
                            const tok = getSessionToken();
                            if (tok) {
                              if (tab.id === 'energy') loadEnergyBalance(tok);
                              if (tab.id === 'analytics') loadWeeklyNutrition(tok);
                              if (tab.id === 'coach') loadCoachFeedback(tok);
                            }
                          }}
                          style={{
                            padding: '9px 16px',
                            borderRadius: '8px',
                            border: isSelected ? '1.5px solid #10b981' : '1px solid #e2e8f0',
                            background: isSelected ? '#ecfdf5' : '#f8fafc',
                            color: isSelected ? '#065f46' : '#475569',
                            fontWeight: isSelected ? '700' : '600',
                            fontSize: '13px',
                            cursor: 'pointer',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '6px',
                            whiteSpace: 'nowrap',
                            transition: 'all 0.15s'
                          }}
                        >
                          <Icon size={16} color={isSelected ? '#059669' : '#64748b'} />
                          <span>{tab.label}</span>
                        </button>
                      );
                    })}
                  </div>

                  {/* TAB 1: TODAY'S MACROS & MEALS */}
                  {nutritionSubTab === 'tracker' && (
                    <div className="animate-fade-in">
                      {/* Macros & Calorie Summary Grid */}
                      <div style={{
                        display: 'grid',
                        gridTemplateColumns: '1.4fr repeat(3, 1fr)',
                        gap: '14px',
                        background: '#f8fafc',
                        border: '1px solid #e2e8f0',
                        borderRadius: '12px',
                        padding: '18px 20px',
                        alignItems: 'center'
                      }}>
                        {/* Calories Ring / Progress */}
                        <div>
                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: '4px' }}>
                            <span style={{ fontSize: '12px', fontWeight: '700', color: '#64748b' }}>⚡ พลังงานสะสมวันนี้</span>
                            <span style={{ fontSize: '13.5px', fontWeight: '800', color: '#0f172a' }}>
                              {Math.round(todayMealsSummary?.totalCalories || 0)} <span style={{ fontSize: '11px', color: '#64748b', fontWeight: 'normal' }}>/ {todayMealsSummary?.targetCalories || 2000} kcal</span>
                            </span>
                          </div>
                          <div style={{ width: '100%', height: '8px', background: '#e2e8f0', borderRadius: '4px', overflow: 'hidden' }}>
                            <div style={{
                              width: `${Math.min(100, ((todayMealsSummary?.totalCalories || 0) / (todayMealsSummary?.targetCalories || 2000)) * 100)}%`,
                              height: '100%',
                              background: ((todayMealsSummary?.totalCalories || 0) > (todayMealsSummary?.targetCalories || 2000)) ? '#ef4444' : 'linear-gradient(90deg, #10b981, #059669)',
                              transition: 'width 0.4s ease-out'
                            }}></div>
                          </div>
                          <div style={{ fontSize: '11px', color: '#64748b', marginTop: '4px', display: 'flex', justifyContent: 'space-between' }}>
                            <span>เหลืออีก {Math.max(0, (todayMealsSummary?.targetCalories || 2000) - Math.round(todayMealsSummary?.totalCalories || 0))} kcal</span>
                            <span>{Math.round(((todayMealsSummary?.totalCalories || 0) / (todayMealsSummary?.targetCalories || 2000)) * 100)}%</span>
                          </div>
                        </div>

                        {/* Protein */}
                        <div style={{ background: '#ffffff', border: '1px solid #e2e8f0', borderRadius: '10px', padding: '12px 14px' }}>
                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                            <span style={{ fontSize: '11px', fontWeight: '700', color: '#3b82f6', display: 'flex', alignItems: 'center', gap: '4px' }}>
                              🥩 โปรตีน (Protein)
                            </span>
                            <span style={{ fontSize: '10px', color: '#64748b', fontWeight: '600' }}>
                              เป้า: {Math.round(todayMealsSummary?.targetProtein || 120)}g
                            </span>
                          </div>
                          <div style={{ fontSize: '18px', fontWeight: '800', color: '#1e3a8a', marginTop: '4px' }}>
                            {(todayMealsSummary?.totalProtein || 0).toFixed(1)} <span style={{ fontSize: '11px', fontWeight: 'normal', color: '#64748b' }}>/ {Math.round(todayMealsSummary?.targetProtein || 120)} g</span>
                          </div>
                          <div style={{ width: '100%', height: '5px', background: '#e2e8f0', borderRadius: '3px', overflow: 'hidden', margin: '6px 0 4px' }}>
                            <div style={{
                              width: `${Math.min(100, ((todayMealsSummary?.totalProtein || 0) / (todayMealsSummary?.targetProtein || 120)) * 100)}%`,
                              height: '100%',
                              background: '#3b82f6',
                              transition: 'width 0.3s ease-out'
                            }}></div>
                          </div>
                          <div style={{ fontSize: '10px', color: '#64748b', display: 'flex', justifyContent: 'space-between' }}>
                            <span>
                              {(todayMealsSummary?.totalProtein || 0) >= (todayMealsSummary?.targetProtein || 120)
                                ? '✓ ครบตามเป้า'
                                : `ขาดอีก ${(Math.max(0, (todayMealsSummary?.targetProtein || 120) - (todayMealsSummary?.totalProtein || 0))).toFixed(1)} g`
                              }
                            </span>
                            <span>{Math.round(((todayMealsSummary?.totalProtein || 0) / (todayMealsSummary?.targetProtein || 120)) * 100)}%</span>
                          </div>
                        </div>

                        {/* Carbs */}
                        <div style={{ background: '#ffffff', border: '1px solid #e2e8f0', borderRadius: '10px', padding: '12px 14px' }}>
                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                            <span style={{ fontSize: '11px', fontWeight: '700', color: '#d97706', display: 'flex', alignItems: 'center', gap: '4px' }}>
                              🍚 คาร์โบไฮเดรต (Carbs)
                            </span>
                            <span style={{ fontSize: '10px', color: '#64748b', fontWeight: '600' }}>
                              เป้า: {Math.round(todayMealsSummary?.targetCarbs || 200)}g
                            </span>
                          </div>
                          <div style={{ fontSize: '18px', fontWeight: '800', color: '#78350f', marginTop: '4px' }}>
                            {(todayMealsSummary?.totalCarbs || 0).toFixed(1)} <span style={{ fontSize: '11px', fontWeight: 'normal', color: '#64748b' }}>/ {Math.round(todayMealsSummary?.targetCarbs || 200)} g</span>
                          </div>
                          <div style={{ width: '100%', height: '5px', background: '#e2e8f0', borderRadius: '3px', overflow: 'hidden', margin: '6px 0 4px' }}>
                            <div style={{
                              width: `${Math.min(100, ((todayMealsSummary?.totalCarbs || 0) / (todayMealsSummary?.targetCarbs || 200)) * 100)}%`,
                              height: '100%',
                              background: '#d97706',
                              transition: 'width 0.3s ease-out'
                            }}></div>
                          </div>
                          <div style={{ fontSize: '10px', color: '#64748b', display: 'flex', justifyContent: 'space-between' }}>
                            <span>
                              {(todayMealsSummary?.totalCarbs || 0) >= (todayMealsSummary?.targetCarbs || 200)
                                ? '✓ ครบตามเป้า'
                                : `ขาดอีก ${(Math.max(0, (todayMealsSummary?.targetCarbs || 200) - (todayMealsSummary?.totalCarbs || 0))).toFixed(1)} g`
                              }
                            </span>
                            <span>{Math.round(((todayMealsSummary?.totalCarbs || 0) / (todayMealsSummary?.targetCarbs || 200)) * 100)}%</span>
                          </div>
                        </div>

                        {/* Fat */}
                        <div style={{ background: '#ffffff', border: '1px solid #e2e8f0', borderRadius: '10px', padding: '12px 14px' }}>
                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                            <span style={{ fontSize: '11px', fontWeight: '700', color: '#eab308', display: 'flex', alignItems: 'center', gap: '4px' }}>
                              🥑 ไขมันดี (Fat)
                            </span>
                            <span style={{ fontSize: '10px', color: '#64748b', fontWeight: '600' }}>
                              เป้า: {Math.round(todayMealsSummary?.targetFat || 55)}g
                            </span>
                          </div>
                          <div style={{ fontSize: '18px', fontWeight: '800', color: '#713f12', marginTop: '4px' }}>
                            {(todayMealsSummary?.totalFat || 0).toFixed(1)} <span style={{ fontSize: '11px', fontWeight: 'normal', color: '#64748b' }}>/ {Math.round(todayMealsSummary?.targetFat || 55)} g</span>
                          </div>
                          <div style={{ width: '100%', height: '5px', background: '#e2e8f0', borderRadius: '3px', overflow: 'hidden', margin: '6px 0 4px' }}>
                            <div style={{
                              width: `${Math.min(100, ((todayMealsSummary?.totalFat || 0) / (todayMealsSummary?.targetFat || 55)) * 100)}%`,
                              height: '100%',
                              background: '#eab308',
                              transition: 'width 0.3s ease-out'
                            }}></div>
                          </div>
                          <div style={{ fontSize: '10px', color: '#64748b', display: 'flex', justifyContent: 'space-between' }}>
                            <span>
                              {(todayMealsSummary?.totalFat || 0) >= (todayMealsSummary?.targetFat || 55)
                                ? '✓ ครบตามเป้า'
                                : `ขาดอีก ${(Math.max(0, (todayMealsSummary?.targetFat || 55) - (todayMealsSummary?.totalFat || 0))).toFixed(1)} g`
                              }
                            </span>
                            <span>{Math.round(((todayMealsSummary?.totalFat || 0) / (todayMealsSummary?.targetFat || 55)) * 100)}%</span>
                          </div>
                        </div>
                      </div>

                      {/* Today's Meals Timeline / List */}
                      <div style={{ marginTop: '20px' }}>
                        <div style={{ fontSize: '14px', fontWeight: '700', color: '#334155', marginBottom: '12px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                          <span>📋 มื้ออาหารที่บันทึกแล้ววันนี้ ({todayMealsSummary?.meals?.length || 0} มื้อ)</span>
                        </div>

                        {todayMealsSummary?.meals && todayMealsSummary.meals.length > 0 ? (
                          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: '14px' }}>
                            {todayMealsSummary.meals.map(meal => {
                              const mealBadgeColors = {
                                BREAKFAST: { bg: '#fef3c7', text: '#92400e', icon: '🍳', label: 'มื้อเช้า' },
                                LUNCH: { bg: '#e0f2fe', text: '#0369a1', icon: '🍱', label: 'มื้อกลางวัน' },
                                DINNER: { bg: '#fae8ff', text: '#86198f', icon: '🍲', label: 'มื้อเย็น' },
                                SNACK: { bg: '#f1f5f9', text: '#475569', icon: '🍎', label: 'ของว่าง' }
                              };
                              const badge = mealBadgeColors[meal.mealType] || mealBadgeColors.LUNCH;

                              return (
                                <div
                                  key={meal.mealId}
                                  style={{
                                    background: '#ffffff',
                                    border: '1px solid #e2e8f0',
                                    borderRadius: '12px',
                                    padding: '14px 16px',
                                    display: 'flex',
                                    flexDirection: 'column',
                                    justifyContent: 'space-between',
                                    boxShadow: '0 2px 6px rgba(0,0,0,0.02)'
                                  }}
                                >
                                  <div>
                                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                                      <span style={{ fontSize: '11px', fontWeight: '700', background: badge.bg, color: badge.text, padding: '2px 8px', borderRadius: '6px', display: 'flex', alignItems: 'center', gap: '4px' }}>
                                        <span>{badge.icon}</span> {badge.label}
                                      </span>
                                      <button
                                        type="button"
                                        onClick={() => handleDeleteMeal(meal.mealId)}
                                        style={{ background: 'transparent', border: 'none', color: '#94a3b8', cursor: 'pointer', padding: '2px' }}
                                        title="ลบรายการมื้อนี้"
                                      >
                                        <Trash2 size={14} />
                                      </button>
                                    </div>

                                    <div style={{ fontSize: '14.5px', fontWeight: '700', color: '#0f172a', marginBottom: '6px' }}>
                                      {meal.mealDescription}
                                    </div>

                                    {meal.aiSummary && (
                                      <div style={{ fontSize: '12px', color: '#64748b', lineHeight: '1.4', marginBottom: '10px', background: '#f8fafc', padding: '8px 10px', borderRadius: '6px' }}>
                                        {meal.aiSummary}
                                      </div>
                                    )}
                                  </div>

                                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderTop: '1px solid #f1f5f9', paddingTop: '8px', fontSize: '12px' }}>
                                    <strong style={{ color: '#059669', fontSize: '13.5px' }}>🔥 {Math.round(meal.calories || 0)} kcal</strong>
                                    <div style={{ display: 'flex', gap: '8px', color: '#64748b', fontSize: '11.5px' }}>
                                      <span>P: {Math.round(meal.protein || 0)}g</span>
                                      <span>C: {Math.round(meal.carbs || 0)}g</span>
                                      <span>F: {Math.round(meal.fat || 0)}g</span>
                                    </div>
                                  </div>
                                </div>
                              );
                            })}
                          </div>
                        ) : (
                          <div style={{
                            background: '#f8fafc',
                            border: '1px dashed #cbd5e1',
                            borderRadius: '12px',
                            padding: '36px',
                            textAlign: 'center',
                            color: '#64748b'
                          }}>
                            <Apple size={36} color="#94a3b8" style={{ margin: '0 auto 10px', display: 'block' }} />
                            <div style={{ fontSize: '14px', fontWeight: '600', color: '#334155' }}>ยังไม่มีบันทึกมื้ออาหารสำหรับวันนี้</div>
                            <div style={{ fontSize: '12.5px', marginTop: '4px' }}>คลิกปุ่ม <strong>"📸 ถ่ายรูป/บันทึกมื้ออาหาร"</strong> ด้านบนเพื่อให้ AI ช่วยคำนวณแคลอรี่และโภชนาการได้ทันที</div>
                          </div>
                        )}
                      </div>
                    </div>
                  )}

                  {/* TAB 2: DYNAMIC ENERGY BALANCE (IN VS OUT) */}
                  {nutritionSubTab === 'energy' && (
                    <div className="animate-fade-in" style={{ display: 'flex', flexDirection: 'column', gap: '18px' }}>
                      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '16px' }}>
                        <div style={{ background: '#f0fdf4', border: '1.5px solid #bbf7d0', borderRadius: '14px', padding: '18px', textAlign: 'center' }}>
                          <div style={{ fontSize: '12.5px', fontWeight: '700', color: '#166534', marginBottom: '6px' }}>📥 พลังงานที่กิน (Calories In)</div>
                          <div style={{ fontSize: '28px', fontWeight: '800', color: '#15803d' }}>
                            {Math.round(energyBalance?.caloriesIn || todayMealsSummary?.totalCalories || 0)} <span style={{ fontSize: '14px', fontWeight: '600' }}>kcal</span>
                          </div>
                          <span style={{ fontSize: '11.5px', color: '#16a34a' }}>จากอาหาร {energyBalance?.mealCount || todayMealsSummary?.meals?.length || 0} มื้อวันนี้</span>
                        </div>

                        <div style={{ background: '#fff7ed', border: '1.5px solid #fed7aa', borderRadius: '14px', padding: '18px', textAlign: 'center' }}>
                          <div style={{ fontSize: '12.5px', fontWeight: '700', color: '#9a3412', marginBottom: '6px' }}>🔥 เผาผลาญจากการออกกำลัง (Burned)</div>
                          <div style={{ fontSize: '28px', fontWeight: '800', color: '#c2410c' }}>
                            {Math.round(energyBalance?.caloriesBurned || totalBurned || 0)} <span style={{ fontSize: '14px', fontWeight: '600' }}>kcal</span>
                          </div>
                          <span style={{ fontSize: '11.5px', color: '#ea580c' }}>จากกิจกรรมที่ทำสำเร็จ</span>
                        </div>

                        <div style={{ background: '#f8fafc', border: '1.5px solid #cbd5e1', borderRadius: '14px', padding: '18px', textAlign: 'center' }}>
                          <div style={{ fontSize: '12.5px', fontWeight: '700', color: '#334155', marginBottom: '6px' }}>🎯 พลังงานสุทธิ (Net Calories)</div>
                          <div style={{ fontSize: '28px', fontWeight: '800', color: '#0f172a' }}>
                            {Math.round(energyBalance?.netCalories !== undefined ? energyBalance.netCalories : ((todayMealsSummary?.totalCalories || 0) - totalBurned))} <span style={{ fontSize: '14px', fontWeight: '600' }}>kcal</span>
                          </div>
                          <span style={{ fontSize: '11.5px', color: '#64748b' }}>เป้าหมายประจำวัน: {Math.round(energyBalance?.targetCalories || todayMealsSummary?.targetCalories || 2000)} kcal</span>
                        </div>
                      </div>

                      {/* Deficit Banner */}
                      <div style={{
                        background: 'linear-gradient(135deg, #eff6ff 0%, #ecfdf5 100%)',
                        border: '1px solid #93c5fd',
                        borderRadius: '14px',
                        padding: '18px 24px',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        flexWrap: 'wrap',
                        gap: '12px'
                      }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                          <div style={{ width: '46px', height: '46px', borderRadius: '50%', background: '#dbeafe', color: '#2563eb', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                            <Activity size={24} />
                          </div>
                          <div>
                            <strong style={{ fontSize: '15px', color: '#1e40af', display: 'block' }}>
                              สถานะพลังงานปัจจุบัน: {energyBalance?.statusMessage || 'อยู่ในเกณฑ์สมดุลตามแผน'}
                            </strong>
                            <span style={{ fontSize: '12.5px', color: '#475569' }}>
                              {energyBalance?.isDeficitSuccess
                                ? '🎉 คุณกำลังสร้าง Calorie Deficit ได้อย่างมีประสิทธิภาพ ไขมันสะสมกำลังถูกดึงมาใช้!'
                                : '💡 ควบคุมปริมาณพลังงานในมื้อถัดไป หรือออกกำลังกายเพิ่มเพื่อคงสภาวะ Deficit'}
                            </span>
                          </div>
                        </div>
                        <div style={{ background: '#ffffff', padding: '10px 18px', borderRadius: '10px', border: '1px solid #bfdbfe', textAlign: 'right' }}>
                          <span style={{ fontSize: '11px', color: '#64748b', display: 'block' }}>ค่า TDEE พื้นฐาน</span>
                          <strong style={{ fontSize: '16px', color: '#1d4ed8' }}>~{Math.round(energyBalance?.tdee || 2400)} kcal/วัน</strong>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* TAB 3: SMART HYDRATION TRACKER */}
                  {nutritionSubTab === 'hydration' && (
                    <div className="animate-fade-in" style={{ display: 'grid', gridTemplateColumns: '1fr 1.2fr', gap: '24px', alignItems: 'center' }}>
                      {/* Hydration Animation Visual Card */}
                      <div style={{
                        background: 'linear-gradient(180deg, #ecfeff 0%, #cffafe 100%)',
                        border: '1.5px solid #a5f3fc',
                        borderRadius: '16px',
                        padding: '28px',
                        textAlign: 'center',
                        position: 'relative',
                        overflow: 'hidden'
                      }}>
                        <div style={{ width: '70px', height: '70px', borderRadius: '50%', background: '#ffffff', color: '#0891b2', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 14px', boxShadow: '0 4px 12px rgba(6,182,212,0.2)' }} className="water-pulse-glow">
                          <Droplets size={36} />
                        </div>
                        <div style={{ fontSize: '36px', fontWeight: '900', color: '#155e75', margin: '4px 0' }}>
                          {(waterGlasses * 250).toLocaleString()} <span style={{ fontSize: '18px', fontWeight: '600' }}>ml</span>
                        </div>
                        <div style={{ fontSize: '14px', fontWeight: '700', color: '#0e7490' }}>
                          {waterGlasses} / {targetWaterGlasses} แก้ว ({Math.min(100, Math.round((waterGlasses / targetWaterGlasses) * 100))}%)
                        </div>
                        <div style={{ width: '80%', height: '10px', background: '#ffffff', borderRadius: '5px', overflow: 'hidden', margin: '14px auto 8px' }}>
                          <div style={{
                            width: `${Math.min(100, (waterGlasses / targetWaterGlasses) * 100)}%`,
                            height: '100%',
                            background: 'linear-gradient(90deg, #06b6d4, #0891b2)',
                            transition: 'width 0.3s ease'
                          }}></div>
                        </div>
                        <span style={{ fontSize: '11.5px', color: '#0e7490' }}>เป้าหมาย: {(targetWaterGlasses * 250 / 1000).toFixed(1)} ลิตรต่อวัน</span>
                      </div>

                      {/* Quick Tap Buttons */}
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                        <h5 style={{ fontSize: '15px', fontWeight: '800', color: '#0f172a', margin: '0 0 2px' }}>⚡ บันทึกการดื่มน้ำด่วน:</h5>
                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                          <button
                            type="button"
                            onClick={() => handleWaterGlassesChange(waterGlasses + 1)}
                            style={{ padding: '14px', borderRadius: '10px', background: '#f0fdfa', border: '1.5px solid #99f6e4', color: '#0f766e', fontWeight: '700', fontSize: '13.5px', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px' }}
                          >
                            <Plus size={16} /> <span>+1 แก้ว (250 ml)</span>
                          </button>
                          <button
                            type="button"
                            onClick={() => handleWaterGlassesChange(waterGlasses + 2)}
                            style={{ padding: '14px', borderRadius: '10px', background: '#ecfeff', border: '1.5px solid #a5f3fc', color: '#0e7490', fontWeight: '700', fontSize: '13.5px', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px' }}
                          >
                            <Plus size={16} /> <span>+1 ขวด (500 ml)</span>
                          </button>
                        </div>
                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                          <button
                            type="button"
                            onClick={() => handleWaterGlassesChange(Math.max(0, waterGlasses - 1))}
                            style={{ padding: '10px', borderRadius: '8px', background: '#f8fafc', border: '1px solid #cbd5e1', color: '#64748b', fontWeight: '600', fontSize: '12px', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '4px' }}
                          >
                            <Minus size={14} /> <span>-1 แก้ว (250 ml)</span>
                          </button>
                          <button
                            type="button"
                            onClick={() => handleWaterGlassesChange(0)}
                            style={{ padding: '10px', borderRadius: '8px', background: '#f8fafc', border: '1px solid #cbd5e1', color: '#ef4444', fontWeight: '600', fontSize: '12px', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '4px' }}
                          >
                            <RefreshCw size={14} /> <span>รีเซ็ตวันนี้</span>
                          </button>
                        </div>
                        <div style={{ background: '#f8fafc', padding: '12px 14px', borderRadius: '8px', border: '1px solid #e2e8f0', fontSize: '12px', color: '#64748b', lineHeight: '1.5' }}>
                          💡 <strong>เกร็ดความรู้:</strong> การดื่มน้ำอย่างสม่ำเสมอช่วยเพิ่มอัตราการเผาผลาญ (BMR) และลดความอยากอาหารระหว่างมื้อได้ถึง 15-20%
                        </div>
                      </div>
                    </div>
                  )}

                  {/* TAB 4: WEEKLY NUTRITION & WEIGHT PROJECTION */}
                  {nutritionSubTab === 'analytics' && (
                    <div className="animate-fade-in" style={{ display: 'flex', flexDirection: 'column', gap: '18px' }}>
                      <div style={{ display: 'grid', gridTemplateColumns: '1.6fr 1fr', gap: '18px' }}>
                        {/* 7 Days Bar Chart Visual */}
                        <div style={{ background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '12px', padding: '18px' }}>
                          <div style={{ fontSize: '13.5px', fontWeight: '700', color: '#334155', marginBottom: '14px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                            <span>📊 ปริมาณพลังงาน 7 วันย้อนหลัง (kcal)</span>
                            <span style={{ fontSize: '11.5px', color: '#059669', fontWeight: '700' }}>
                              เฉลี่ย: {Math.round(weeklyNutrition?.avgDailyCalories || todayMealsSummary?.totalCalories || 0)} kcal/วัน
                            </span>
                          </div>
                          <div style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', height: '130px', padding: '0 8px', borderBottom: '1px solid #cbd5e1' }}>
                            {(weeklyNutrition?.dailyPoints || [
                              { dayName: 'จ.', calories: 1850 },
                              { dayName: 'อ.', calories: 1920 },
                              { dayName: 'พ.', calories: 1780 },
                              { dayName: 'พฤ.', calories: 2050 },
                              { dayName: 'ศ.', calories: 1890 },
                              { dayName: 'ส.', calories: 2100 },
                              { dayName: 'อา.', calories: Math.round(todayMealsSummary?.totalCalories || 1950) }
                            ]).map((pt, idx) => {
                              const maxCal = 2500;
                              const heightPct = Math.min(100, Math.max(15, (pt.calories / maxCal) * 100));
                              return (
                                <div key={idx} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '4px', width: '36px' }}>
                                  <span style={{ fontSize: '10px', color: '#64748b', fontWeight: '700' }}>{pt.calories > 0 ? pt.calories : '-'}</span>
                                  <div style={{
                                    width: '20px',
                                    height: `${heightPct}%`,
                                    background: pt.calories > 2200 ? '#f97316' : 'linear-gradient(180deg, #10b981 0%, #059669 100%)',
                                    borderRadius: '4px 4px 0 0',
                                    transition: 'height 0.4s ease'
                                  }}></div>
                                  <span style={{ fontSize: '11.5px', fontWeight: '700', color: '#475569' }}>{pt.dayName}</span>
                                </div>
                              );
                            })}
                          </div>
                        </div>

                        {/* Macro Distribution Donut Breakdown */}
                        <div style={{ background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '12px', padding: '18px' }}>
                          <div style={{ fontSize: '13.5px', fontWeight: '700', color: '#334155', marginBottom: '12px' }}>
                            🍰 สัดส่วนสารอาหารหลัก (%)
                          </div>
                          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12.5px' }}>
                              <span style={{ color: '#2563eb', fontWeight: '700' }}>🥩 โปรตีน</span>
                              <strong>{Math.round(weeklyNutrition?.macroDistribution?.proteinPct || 30)}%</strong>
                            </div>
                            <div style={{ width: '100%', height: '7px', background: '#e2e8f0', borderRadius: '4px', overflow: 'hidden' }}>
                              <div style={{ width: `${weeklyNutrition?.macroDistribution?.proteinPct || 30}%`, height: '100%', background: '#3b82f6' }}></div>
                            </div>

                            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12.5px' }}>
                              <span style={{ color: '#d97706', fontWeight: '700' }}>🍚 คาร์โบไฮเดรต</span>
                              <strong>{Math.round(weeklyNutrition?.macroDistribution?.carbsPct || 45)}%</strong>
                            </div>
                            <div style={{ width: '100%', height: '7px', background: '#e2e8f0', borderRadius: '4px', overflow: 'hidden' }}>
                              <div style={{ width: `${weeklyNutrition?.macroDistribution?.carbsPct || 45}%`, height: '100%', background: '#f59e0b' }}></div>
                            </div>

                            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12.5px' }}>
                              <span style={{ color: '#ca8a04', fontWeight: '700' }}>🥑 ไขมันดี</span>
                              <strong>{Math.round(weeklyNutrition?.macroDistribution?.fatPct || 25)}%</strong>
                            </div>
                            <div style={{ width: '100%', height: '7px', background: '#e2e8f0', borderRadius: '4px', overflow: 'hidden' }}>
                              <div style={{ width: `${weeklyNutrition?.macroDistribution?.fatPct || 25}%`, height: '100%', background: '#eab308' }}></div>
                            </div>
                          </div>
                        </div>
                      </div>

                      {/* Weight Loss Projection Card */}
                      <div style={{
                        background: 'linear-gradient(135deg, #f0fdf4 0%, #e0f2fe 100%)',
                        border: '1.5px solid #86efac',
                        borderRadius: '14px',
                        padding: '18px 24px',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        flexWrap: 'wrap',
                        gap: '12px'
                      }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                          <div style={{ width: '46px', height: '46px', borderRadius: '50%', background: '#dcfce7', color: '#16a34a', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                            <TrendingDown size={24} />
                          </div>
                          <div>
                            <strong style={{ fontSize: '15px', color: '#15803d', display: 'block' }}>
                              พยากรณ์ผลลัพธ์น้ำหนักตัว (AI Weight Loss Curve)
                            </strong>
                            <span style={{ fontSize: '12.5px', color: '#475569' }}>
                              ด้วยอัตราการกินและออกกำลังกายปัจจุบัน คาดการณ์การลดน้ำหนักได้ประมาณ <strong>~{(weeklyNutrition?.projectedWeightLossKg || 0.45).toFixed(2)} กก./สัปดาห์</strong>
                            </span>
                          </div>
                        </div>
                        <span style={{ fontSize: '12.5px', fontWeight: '800', background: '#16a34a', color: 'white', padding: '6px 16px', borderRadius: '20px' }}>
                          🎯 อยู่ในเกณฑ์ปลอดภัย & ยั่งยืน
                        </span>
                      </div>
                    </div>
                  )}

                  {/* TAB 5: AI DAILY NUTRITION COACH FEEDBACK */}
                  {nutritionSubTab === 'coach' && (
                    <div className="animate-fade-in" style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                      {/* Score Card */}
                      <div style={{
                        background: 'linear-gradient(135deg, #faf5ff 0%, #f3e8ff 100%)',
                        border: '1.5px solid #d8b4fe',
                        borderRadius: '14px',
                        padding: '20px 24px',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        flexWrap: 'wrap',
                        gap: '12px'
                      }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
                          <div style={{ width: '52px', height: '52px', borderRadius: '50%', background: '#9333ea', color: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: '900', fontSize: '20px' }}>
                            {coachFeedback?.dietScore || 8.5}
                          </div>
                          <div>
                            <h5 style={{ fontSize: '17px', fontWeight: '800', color: '#581c87', margin: '0 0 4px' }}>
                              {coachFeedback?.title || 'คุณภาพโภชนาการวันนี้อยู่ในเกณฑ์ยอดเยี่ยม! 🌟'}
                            </h5>
                            <span style={{ fontSize: '12.5px', color: '#7e22ce' }}>ประเมินโดย yourPace AI Nutrition Coach</span>
                          </div>
                        </div>
                        <span style={{ fontSize: '13px', fontWeight: '700', background: '#ede9fe', color: '#6b21a8', padding: '8px 16px', borderRadius: '20px' }}>
                          Diet Score: {coachFeedback?.dietScore || 8.5} / 10
                        </span>
                      </div>

                      {/* Highlights & Suggestions Grid */}
                      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px' }}>
                        <div style={{ background: '#f0fdf4', border: '1px solid #bbf7d0', borderRadius: '12px', padding: '16px' }}>
                          <div style={{ fontSize: '13px', fontWeight: '700', color: '#166534', marginBottom: '6px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                            <CheckCircle size={16} color="#16a34a" /> จุดเด่นของอาหารวันนี้:
                          </div>
                          <p style={{ fontSize: '12.5px', color: '#15803d', margin: 0, lineHeight: '1.5' }}>
                            {coachFeedback?.highlights || 'สัดส่วนโปรตีนอยู่ในเกณฑ์ที่ดีมาก ช่วยรักษามวลกล้ามเนื้อและทำให้รู้สึกอิ่มนานตลอดวัน'}
                          </p>
                        </div>

                        <div style={{ background: '#fffbeb', border: '1px solid #fde68a', borderRadius: '12px', padding: '16px' }}>
                          <div style={{ fontSize: '13px', fontWeight: '700', color: '#92400e', marginBottom: '6px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                            <Lightbulb size={16} color="#d97706" /> ข้อแนะนำสำหรับวันพรุ่งนี้:
                          </div>
                          <p style={{ fontSize: '12.5px', color: '#b45309', margin: 0, lineHeight: '1.5' }}>
                            {coachFeedback?.suggestions || 'เพิ่มผักใบเขียวหรือผลไม้น้ำตาลต่ำในมื้อเย็น เพื่อเสริมวิตามินและกากใยอาหาร (Fiber)'}
                          </p>
                        </div>
                      </div>

                      {/* Coach Note */}
                      {coachFeedback?.coachNote && (
                        <div style={{ background: '#ffffff', border: '1px solid #e2e8f0', borderRadius: '12px', padding: '14px 18px', fontSize: '12.5px', color: '#475569', lineHeight: '1.5' }}>
                          💬 <strong>ข้อความจากโค้ช:</strong> {coachFeedback.coachNote}
                        </div>
                      )}
                    </div>
                  )}
                </div>
              </div>
            ) : (
              /* VIEW 2: Health Progress, Trends & Gamification Studio */
              <div style={{ display: 'flex', flexDirection: 'column', gap: '28px' }} className="animate-fade-in">
                
                {/* Row 1: 4 Visual Metric Cards */}
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '18px' }}>
                  
                  {/* Card 1: Level & EXP */}
                  <div style={{ background: '#ffffff', border: '1px solid #e2e8f0', borderRadius: '16px', padding: '20px', textAlign: 'left', boxShadow: '0 2px 8px rgba(0,0,0,0.03)' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                      <span style={{ fontSize: '11.5px', fontWeight: '800', color: '#7c3aed', textTransform: 'uppercase' }}>HEALTH LEVEL</span>
                      <span style={{ fontSize: '12px', background: '#f5f3ff', color: '#7c3aed', padding: '2px 8px', borderRadius: '8px', fontWeight: '800' }}>
                        {progressAnalytics?.levelInfo?.levelCode || 'R1'}
                      </span>
                    </div>
                    <div style={{ fontSize: '20px', fontWeight: '800', color: '#1e1b4b', marginBottom: '4px' }}>
                      {progressAnalytics?.levelInfo?.currentExp || 0} <span style={{ fontSize: '13px', color: '#64748b', fontWeight: 'normal' }}>EXP</span>
                    </div>
                    <div style={{ width: '100%', height: '6px', background: '#f1f5f9', borderRadius: '3px', overflow: 'hidden', margin: '8px 0 6px' }}>
                      <div style={{ width: `${Math.min(100, Math.max(0, progressAnalytics?.levelInfo?.progressPercentage ?? 0))}%`, height: '100%', background: '#8b5cf6', borderRadius: '3px' }}></div>
                    </div>
                    <span style={{ fontSize: '11px', color: '#64748b' }}>
                      อีก {Math.max(0, (progressAnalytics?.levelInfo?.nextLevelExp || 500) - (progressAnalytics?.levelInfo?.currentExp || 0))} EXP สู่ระดับถัดไป
                    </span>
                  </div>

                  {/* Card 2: Streak Continuity */}
                  <div style={{ background: '#ffffff', border: '1px solid #e2e8f0', borderRadius: '16px', padding: '20px', textAlign: 'left', boxShadow: '0 2px 8px rgba(0,0,0,0.03)' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                      <span style={{ fontSize: '11.5px', fontWeight: '800', color: '#ea580c', textTransform: 'uppercase' }}>ACTIVE STREAK</span>
                      <Flame size={16} color="#f97316" />
                    </div>
                    <div style={{ fontSize: '20px', fontWeight: '800', color: '#431407', marginBottom: '4px', display: 'flex', alignItems: 'baseline', gap: '4px' }}>
                      {progressAnalytics?.currentStreakDays || 0} <span style={{ fontSize: '14px', color: '#9a3412', fontWeight: 'bold' }}>วันติดกัน 🔥</span>
                    </div>
                    <div style={{ fontSize: '11.5px', color: '#059669', fontWeight: '600', marginTop: '10px', display: 'flex', alignItems: 'center', gap: '4px' }}>
                      <Zap size={13} /> สถิติต่อเนื่องสูงสุด: {progressAnalytics?.bestStreakDays || 0} วัน
                    </div>
                  </div>

                  {/* Card 3: Weekly Calorie Comparison */}
                  <div style={{ background: '#ffffff', border: '1px solid #e2e8f0', borderRadius: '16px', padding: '20px', textAlign: 'left', boxShadow: '0 2px 8px rgba(0,0,0,0.03)' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                      <span style={{ fontSize: '11.5px', fontWeight: '800', color: '#059669', textTransform: 'uppercase' }}>THIS WEEK BURNED</span>
                      <Activity size={16} color="#10b981" />
                    </div>
                    <div style={{ fontSize: '20px', fontWeight: '800', color: '#064e3b', marginBottom: '4px' }}>
                      {Math.round(progressAnalytics?.thisWeekCalories || 0)} <span style={{ fontSize: '13px', color: '#64748b', fontWeight: 'normal' }}>kcal</span>
                    </div>
                    <div style={{ fontSize: '11.5px', color: '#64748b', marginTop: '10px' }}>
                      {progressAnalytics?.lastWeekCalories && progressAnalytics.lastWeekCalories > 0 ? (
                        <span>
                          สัปดาห์ก่อน: {Math.round(progressAnalytics.lastWeekCalories)} kcal 
                          <strong style={{ color: progressAnalytics.thisWeekCalories >= progressAnalytics.lastWeekCalories ? '#059669' : '#d97706', marginLeft: '4px' }}>
                            ({progressAnalytics.thisWeekCalories >= progressAnalytics.lastWeekCalories ? '▲ +' : '▼ -'}
                            {Math.abs(Math.round(((progressAnalytics.thisWeekCalories - progressAnalytics.lastWeekCalories) / progressAnalytics.lastWeekCalories) * 100))}%)
                          </strong>
                        </span>
                      ) : (
                        <span>⏱️ รวมเวลา: {progressAnalytics?.thisWeekDurationMins || 0} นาทีในสัปดาห์นี้</span>
                      )}
                    </div>
                  </div>

                  {/* Card 4: Weight & Target Progress */}
                  <div style={{ background: '#ffffff', border: '1px solid #e2e8f0', borderRadius: '16px', padding: '20px', textAlign: 'left', boxShadow: '0 2px 8px rgba(0,0,0,0.03)', display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
                    <div>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                        <span style={{ fontSize: '11.5px', fontWeight: '800', color: '#0284c7', textTransform: 'uppercase' }}>WEIGHT & BMI</span>
                        <button
                          type="button"
                          onClick={() => {
                            setWeightForm({
                              weight: progressAnalytics?.weightProgress?.currentWeight || currentUser?.weight || '',
                              bodyFatPercentage: '',
                              logDate: new Date().toISOString().split('T')[0],
                              notes: ''
                            });
                            setShowLogWeightModal(true);
                          }}
                          style={{
                            background: '#e0f2fe',
                            border: 'none',
                            color: '#0369a1',
                            fontSize: '11px',
                            fontWeight: '700',
                            padding: '3px 8px',
                            borderRadius: '6px',
                            cursor: 'pointer',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '3px'
                          }}
                          title="บันทึกน้ำหนักล่าสุดวันนี้"
                        >
                          <Plus size={12} /> บันทึกน้ำหนัก
                        </button>
                      </div>
                      <div style={{ fontSize: '20px', fontWeight: '800', color: '#0c4a6e', marginBottom: '2px' }}>
                        {progressAnalytics?.weightProgress?.currentWeight || currentUser?.weight || '--'} <span style={{ fontSize: '13px', color: '#64748b', fontWeight: 'normal' }}>kg</span>
                      </div>
                      <div style={{ fontSize: '11.5px', color: '#0284c7', fontWeight: '600' }}>
                        BMI: {progressAnalytics?.weightProgress?.bmi || '--'} ({progressAnalytics?.weightProgress?.bmiCategory || 'ปกติ'})
                      </div>
                    </div>
                    <div style={{ fontSize: '11.5px', color: '#64748b', marginTop: '6px', borderTop: '1px dashed #e2e8f0', paddingTop: '6px' }}>
                      <div>
                        🎯 เป้าหมาย: <strong style={{ color: '#0f172a' }}>{progressAnalytics?.weightProgress?.targetWeight || currentUser?.targetWeight || '--'} kg</strong>
                        {progressAnalytics?.weightProgress?.remainingToTarget > 0 && (
                          <span style={{ color: '#059669', fontWeight: '700', marginLeft: '4px' }}>
                            (เหลืออีก {progressAnalytics.weightProgress.remainingToTarget} kg)
                          </span>
                        )}
                      </div>
                      {(progressAnalytics?.weightProgress?.targetDate || currentUser?.targetDate) && (
                        <div style={{ fontSize: '11px', color: '#0284c7', marginTop: '3px', fontWeight: '600', display: 'flex', alignItems: 'center', gap: '3px' }}>
                          <span>📅 ภายใน {new Date(progressAnalytics?.weightProgress?.targetDate || currentUser?.targetDate).toLocaleDateString('th-TH', { day: 'numeric', month: 'short', year: 'numeric' })}</span>
                          {progressAnalytics?.weightProgress?.daysRemaining > 0 && (
                            <span style={{ color: '#0369a1', fontWeight: '700' }}>
                              (อีก {progressAnalytics.weightProgress.daysRemaining} วัน)
                            </span>
                          )}
                        </div>
                      )}
                    </div>
                  </div>

                </div>

                {/* Row 2: Interactive Charts & Heatmap Grid */}
                <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 1fr', gap: '24px', alignItems: 'start' }}>
                  
                  {/* Left Column: Weekly Calorie Chart + 30-Day Activity Heatmap */}
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
                    
                    {/* Weekly Calorie & Active Minutes Bar Chart */}
                    <div style={{ background: '#ffffff', border: '1px solid #e2e8f0', borderRadius: '16px', padding: '24px', boxShadow: '0 2px 8px rgba(0,0,0,0.03)', textAlign: 'left' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
                        <div>
                          <h4 style={{ fontSize: '16.5px', fontWeight: '800', color: '#0f172a', margin: '0 0 4px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                            <BarChart3 size={18} color="#10b981" /> กราฟพลังงานที่เผาผลาญประจำสัปดาห์ (Mon - Sun)
                          </h4>
                          <span style={{ fontSize: '12px', color: '#64748b' }}>แท่งกราฟแสดงแคลอรี่ (kcal) และเวลาออกกำลังกายในแต่ละวัน</span>
                        </div>
                        <span style={{ fontSize: '12px', fontWeight: '700', background: '#ecfdf5', color: '#047857', padding: '4px 10px', borderRadius: '12px' }}>
                          สัปดาห์นี้: {Math.round(progressAnalytics?.thisWeekCalories || 0)} kcal
                        </span>
                      </div>

                      {/* Interactive CSS Bar Chart */}
                      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: '12px', alignItems: 'end', height: '170px', padding: '10px 0 20px', borderBottom: '1px solid #f1f5f9' }}>
                        {(() => {
                          const stats = progressAnalytics?.weeklyStats || [
                            { dayName: 'จ.', caloriesBurned: 0, durationMinutes: 0 },
                            { dayName: 'อ.', caloriesBurned: 0, durationMinutes: 0 },
                            { dayName: 'พ.', caloriesBurned: 0, durationMinutes: 0 },
                            { dayName: 'พฤ.', caloriesBurned: 0, durationMinutes: 0 },
                            { dayName: 'ศ.', caloriesBurned: 0, durationMinutes: 0 },
                            { dayName: 'ส.', caloriesBurned: 0, durationMinutes: 0 },
                            { dayName: 'อา.', caloriesBurned: 0, durationMinutes: 0 },
                          ];

                          const maxCal = Math.max(...stats.map(s => s.caloriesBurned || 0), 400);

                          return stats.map((day, idx) => {
                            const cal = Math.round(day.caloriesBurned || 0);
                            const heightPct = cal > 0 ? Math.max(15, Math.min(100, (cal / maxCal) * 100)) : 6;
                            const todayStr = new Date().toISOString().split('T')[0];
                            const isToday = day.dateStr === todayStr;

                            return (
                              <div key={idx} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', height: '100%', justifyContent: 'flex-end', gap: '6px' }}>
                                <span style={{ fontSize: '10.5px', fontWeight: '700', color: cal > 0 ? '#ea580c' : '#cbd5e1' }}>
                                  {cal > 0 ? `${cal}` : '-'}
                                </span>
                                <div
                                  style={{
                                    width: '100%',
                                    maxWidth: '36px',
                                    height: `${heightPct}%`,
                                    background: isToday 
                                      ? 'linear-gradient(180deg, #10b981 0%, #059669 100%)' 
                                      : (cal > 0 ? 'linear-gradient(180deg, #34d399 0%, #10b981 100%)' : '#f1f5f9'),
                                    borderRadius: '6px 6px 2px 2px',
                                    border: isToday ? '1.5px solid #047857' : 'none',
                                    boxShadow: cal > 0 ? '0 2px 6px rgba(16, 185, 129, 0.2)' : 'none',
                                    transition: 'all 0.3s ease-out',
                                    cursor: 'pointer'
                                  }}
                                  title={`${day.dayName} (${day.dateStr}): เผาผลาญ ${cal} kcal (${day.durationMinutes || 0} นาที)`}
                                ></div>
                                <span style={{ fontSize: '12px', fontWeight: isToday ? '800' : '600', color: isToday ? '#10b981' : '#64748b' }}>
                                  {day.dayName} {isToday ? '•' : ''}
                                </span>
                              </div>
                            );
                          });
                        })()}
                      </div>
                    </div>

                    {/* 30-Day Activity Consistency Heatmap */}
                    <div style={{ background: '#ffffff', border: '1px solid #e2e8f0', borderRadius: '16px', padding: '24px', boxShadow: '0 2px 8px rgba(0,0,0,0.03)', textAlign: 'left' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px' }}>
                        <div>
                          <h4 style={{ fontSize: '16px', fontWeight: '800', color: '#0f172a', margin: '0 0 2px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                            <Flame size={17} color="#f97316" /> ปฏิทินความสม่ำเสมอ 30 วัน (Activity Heatmap)
                          </h4>
                          <span style={{ fontSize: '11.5px', color: '#64748b' }}>จุดสีเขียวแสดงวันที่คุณออกกำลังกายสำเร็จ</span>
                        </div>
                        <span style={{ fontSize: '11px', color: '#059669', fontWeight: '700' }}>
                          สำเร็จ {progressAnalytics?.activityHeatmap?.filter(h => h.active)?.length || 0} / 30 วัน
                        </span>
                      </div>

                      {/* 30 Heatmap Squares Grid */}
                      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(10, 1fr)', gap: '8px' }}>
                        {(progressAnalytics?.activityHeatmap || Array.from({ length: 30 })).map((hDay, idx) => {
                          const isActive = hDay?.active;
                          const cal = Math.round(hDay?.calories || 0);
                          const dateObj = hDay?.dateStr ? new Date(hDay.dateStr) : null;
                          const dateLabel = dateObj ? dateObj.toLocaleDateString('th-TH', { day: 'numeric', month: 'short' }) : `Day ${idx + 1}`;

                          return (
                            <div
                              key={idx}
                              style={{
                                aspectRatio: '1',
                                borderRadius: '6px',
                                background: isActive ? '#10b981' : '#f1f5f9',
                                border: isActive ? '1px solid #059669' : '1px solid #e2e8f0',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                cursor: 'pointer',
                                transition: 'all 0.2s',
                                position: 'relative'
                              }}
                              title={`${dateLabel}: ${isActive ? `เผาผลาญ ${cal} kcal (${hDay.workoutCount} ครั้ง)` : 'ไม่ได้บันทึกกิจกรรม'}`}
                            >
                              {isActive && <Check size={11} color="white" />}
                            </div>
                          );
                        })}
                      </div>
                      <div style={{ display: 'flex', justifyContent: 'flex-end', alignItems: 'center', gap: '6px', marginTop: '10px', fontSize: '10.5px', color: '#94a3b8' }}>
                        <span>พักผ่อน</span>
                        <div style={{ width: '10px', height: '10px', background: '#f1f5f9', borderRadius: '2px', border: '1px solid #e2e8f0' }}></div>
                        <div style={{ width: '10px', height: '10px', background: '#10b981', borderRadius: '2px' }}></div>
                        <span>ออกกำลังกายสำเร็จ</span>
                      </div>
                    </div>

                  </div>

                  {/* Right Column: AI Weekly Recap + Achievement Badges */}
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
                    
                    {/* AI Weekly Coach Health Recap Card */}
                    <div style={{
                      background: 'linear-gradient(135deg, #f5f3ff 0%, #ede9fe 100%)',
                      border: '1px solid #ddd6fe',
                      borderRadius: '16px',
                      padding: '24px',
                      textAlign: 'left',
                      boxShadow: '0 2px 8px rgba(124, 58, 237, 0.06)'
                    }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px' }}>
                        <h4 style={{ fontSize: '16px', fontWeight: '800', color: '#5b21b6', margin: 0, display: 'flex', alignItems: 'center', gap: '6px' }}>
                          <Bot size={18} color="#7c3aed" /> AI Weekly Coach Recap
                        </h4>
                        <button
                          type="button"
                          onClick={handleFetchWeeklyRecap}
                          disabled={isRecapLoading}
                          style={{
                            background: '#7c3aed',
                            color: 'white',
                            border: 'none',
                            borderRadius: '20px',
                            padding: '5px 12px',
                            fontSize: '11.5px',
                            fontWeight: '700',
                            cursor: isRecapLoading ? 'not-allowed' : 'pointer',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '4px',
                            boxShadow: '0 2px 6px rgba(124, 58, 237, 0.25)',
                            transition: 'all 0.2s'
                          }}
                        >
                          {isRecapLoading ? (
                            <>
                              <div className="spinner" style={{ width: '11px', height: '11px', border: '2px solid rgba(255,255,255,0.3)', borderTop: '2px solid white', borderRadius: '50%', animation: 'spin 1s linear infinite' }}></div>
                              <span>AI กำลังวิเคราะห์...</span>
                            </>
                          ) : (
                            <>
                              <Sparkles size={12} />
                              <span>{weeklyRecapData ? 'สรุปใหม่' : 'ขอสรุปจาก AI'}</span>
                            </>
                          )}
                        </button>
                      </div>

                      {weeklyRecapData ? (
                        <div style={{
                          background: 'rgba(255,255,255,0.85)',
                          borderRadius: '12px',
                          padding: '16px',
                          fontSize: '13px',
                          color: '#334155',
                          lineHeight: '1.6',
                          border: '1px solid rgba(139, 92, 246, 0.2)',
                          whiteSpace: 'pre-line'
                        }}>
                          {weeklyRecapData.weeklyRecap}
                        </div>
                      ) : (
                        <div style={{
                          background: 'rgba(255,255,255,0.6)',
                          borderRadius: '12px',
                          padding: '20px 16px',
                          textAlign: 'center',
                          fontSize: '12.5px',
                          color: '#6d28d9'
                        }}>
                          <Sparkles size={24} color="#8b5cf6" style={{ margin: '0 auto 8px', display: 'block' }} />
                          <p style={{ margin: '0 0 10px', fontWeight: '600' }}>
                            คลิกปุ่ม "ขอสรุปจาก AI" เพื่อให้ AI Mentor วิเคราะห์พัฒนาการ สรุปผลความคืบหน้า และมอบข้อคิดประจำสัปดาห์
                          </p>
                        </div>
                      )}
                    </div>

                    {/* Achievement Badges Showcase */}
                    <div style={{ background: '#ffffff', border: '1px solid #e2e8f0', borderRadius: '16px', padding: '24px', boxShadow: '0 2px 8px rgba(0,0,0,0.03)', textAlign: 'left' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
                        <h4 style={{ fontSize: '16px', fontWeight: '800', color: '#0f172a', margin: 0, display: 'flex', alignItems: 'center', gap: '6px' }}>
                          <Medal size={18} color="#f59e0b" /> เหรียญรางวัลความสำเร็จ (Achievement Badges)
                        </h4>
                        <span style={{ fontSize: '11px', background: '#fef3c7', color: '#b45309', padding: '2px 8px', borderRadius: '8px', fontWeight: '800' }}>
                          {milestonesList.length} / 7 ปลดล็อกแล้ว
                        </span>
                      </div>

                      <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: '10px' }}>
                        {[
                          { key: 'FIRST_WORKOUT', icon: '🏅', title: 'First Step Completed!', desc: 'ออกกำลังกายครั้งแรกสำเร็จ' },
                          { key: 'STREAK_3', icon: '🔥', title: 'Consistency Starter', desc: 'ฟิตต่อเนื่อง 3 กิจกรรม' },
                          { key: 'WORKOUT_5', icon: '⚡', title: 'Active Warrior', desc: 'สะสมการออกกำลังกาย 5 ครั้ง' },
                          { key: 'WORKOUT_10', icon: '👑', title: 'Discipline Master', desc: 'สะสมการออกกำลังกายครบ 10 ครั้ง' },
                          { key: 'BURN_1000', icon: '💥', title: 'Calorie Crusher 1K', desc: 'เผาผลาญสะสมทะลุ 1,000 kcal' },
                          { key: 'BURN_5000', icon: '🚀', title: 'Calorie Legend 5K', desc: 'เผาผลาญสะสมทะลุ 5,000 kcal' },
                          { key: 'WEIGHT_TRACKED', icon: '⚖️', title: 'Self-Awareness', desc: 'บันทึกน้ำหนักติดตามสุขภาพ' },
                        ].map((badge) => {
                          const achieved = milestonesList.find(m => m.milestoneType === badge.key);
                          const dateAchievedStr = achieved ? new Date(achieved.dateAchieved).toLocaleDateString('th-TH', { day: 'numeric', month: 'short' }) : null;

                          return (
                            <div
                              key={badge.key}
                              style={{
                                display: 'flex',
                                alignItems: 'center',
                                gap: '12px',
                                padding: '10px 14px',
                                borderRadius: '12px',
                                border: achieved ? '1.5px solid #fef08a' : '1px solid #f1f5f9',
                                background: achieved ? 'linear-gradient(135deg, #fffbeb 0%, #fefce8 100%)' : '#f8fafc',
                                opacity: achieved ? 1 : 0.6,
                                transition: 'all 0.2s'
                              }}
                            >
                              <div style={{
                                width: '38px',
                                height: '38px',
                                borderRadius: '50%',
                                background: achieved ? '#fef3c7' : '#e2e8f0',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                fontSize: '18px',
                                flexShrink: 0
                              }}>
                                {badge.icon}
                              </div>
                              <div style={{ flex: 1, minWidth: 0 }}>
                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                  <strong style={{ fontSize: '13px', color: achieved ? '#78350f' : '#64748b' }}>
                                    {badge.title}
                                  </strong>
                                  {achieved && (
                                    <span style={{ fontSize: '10.5px', color: '#16a34a', fontWeight: '700', display: 'flex', alignItems: 'center', gap: '2px' }}>
                                      <Check size={11} /> {dateAchievedStr}
                                    </span>
                                  )}
                                </div>
                                <span style={{ fontSize: '11.5px', color: achieved ? '#92400e' : '#94a3b8', display: 'block' }}>
                                  {badge.desc}
                                </span>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>

                  </div>

                </div>

              </div>
            )}

          </div>

          </div> {/* Close Dashboard Grid Layout */}
        </div> {/* Close .app-container */}

        {/* Modal: n8n AI Workout Free-Time Planning with Custom Notes */}
        {showN8nPlanModal && (
          <div style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            width: '100vw',
            height: '100vh',
            backgroundColor: 'rgba(15, 23, 42, 0.72)',
            backdropFilter: 'blur(8px)',
            zIndex: 999999,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '16px',
            overflowY: 'auto'
          }}>
            <div style={{
              background: '#ffffff',
              borderRadius: '20px',
              maxWidth: '560px',
              width: '100%',
              padding: '28px',
              boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)',
              textAlign: 'left',
              maxHeight: '90vh',
              overflowY: 'auto',
              position: 'relative'
            }}>
              {/* Header */}
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '18px' }}>
                <div>
                  <h3 style={{ fontSize: '20px', fontWeight: '800', color: 'var(--text-dark)', margin: 0, display: 'flex', alignItems: 'center', gap: '10px' }}>
                    <Bot size={24} color="#10b981" /> จัดเวลาว่างด้วย n8n AI
                  </h3>
                  <p style={{ fontSize: '13px', color: 'var(--text-muted)', margin: '4px 0 0 0' }}>
                    วิเคราะห์เวลาว่างจาก Google Calendar และปรับแต่งเงื่อนไขตามใจคุณ
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => setShowN8nPlanModal(false)}
                  style={{
                    background: '#f1f5f9',
                    border: 'none',
                    fontSize: '14px',
                    width: '32px',
                    height: '32px',
                    borderRadius: '50%',
                    cursor: 'pointer',
                    color: 'var(--text-muted)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center'
                  }}
                >
                  ✕
                </button>
              </div>

              {/* Google Calendar Status Badge */}
              <div style={{
                background: isCalendarConnected ? '#ecfdf5' : '#f8fafc',
                border: isCalendarConnected ? '1px solid #a7f3d0' : '1px dashed #cbd5e1',
                borderRadius: '12px',
                padding: '12px 16px',
                display: 'flex',
                alignItems: 'center',
                gap: '10px',
                marginBottom: '18px'
              }}>
                <Calendar size={18} color={isCalendarConnected ? '#059669' : '#64748b'} />
                <div style={{ fontSize: '12.5px', flex: 1 }}>
                  {isCalendarConnected ? (
                    <span style={{ color: '#065f46', fontWeight: '600' }}>
                      เชื่อมต่อ Google Calendar แล้ว (พบ {calendarEvents.length} กิจกรรมในสัปดาห์นี้)
                    </span>
                  ) : (
                    <span style={{ color: '#64748b' }}>
                      ยังไม่ได้เชื่อมต่อ Google Calendar (AI จะวิเคราะห์และจัดสรรเวลาว่างมาตรฐานให้อัตโนมัติ)
                    </span>
                  )}
                </div>
              </div>

              {/* Number of workout days selector */}
              <div style={{ marginBottom: '18px' }}>
                <label style={{ fontSize: '13.5px', fontWeight: '700', color: '#334155', display: 'block', marginBottom: '8px' }}>
                  🎯 ต้องการให้จัดตารางออกกำลังกายกี่วันในสัปดาห์นี้?
                </label>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '8px' }}>
                  {[2, 3, 4, 5].map(days => (
                    <button
                      key={days}
                      type="button"
                      onClick={() => setN8nDaysCount(days)}
                      style={{
                        padding: '10px 8px',
                        borderRadius: '10px',
                        border: n8nDaysCount === days ? '2px solid #10b981' : '1px solid #e2e8f0',
                        background: n8nDaysCount === days ? '#ecfdf5' : '#f8fafc',
                        color: n8nDaysCount === days ? '#059669' : '#475569',
                        fontWeight: '700',
                        fontSize: '13.5px',
                        cursor: 'pointer',
                        transition: 'all 0.2s',
                        textAlign: 'center'
                      }}
                    >
                      {days} วัน {days === 3 && <span style={{ fontSize: '10px', display: 'block', fontWeight: 'normal', color: '#10b981' }}>(แนะนำ)</span>}
                    </button>
                  ))}
                </div>
              </div>

              {/* Custom Notes / Constraints textarea */}
              <div style={{ marginBottom: '18px' }}>
                <label style={{ fontSize: '13.5px', fontWeight: '700', color: '#334155', display: 'block', marginBottom: '6px' }}>
                  📝 แนบเงื่อนไขหรือคำขอพิเศษเพิ่มเติมให้ AI (Optional)
                </label>
                <p style={{ fontSize: '12px', color: '#64748b', margin: '0 0 8px 0' }}>
                  ระบุวันที่ติดธุระ วันที่ต้องการงด หรือช่วงเวลาที่ต้องการเน้น เช่น วันเสาร์ไม่สะดวก, ขอเน้นช่วงเช้า
                </p>
                <textarea
                  value={n8nCustomNote}
                  onChange={(e) => setN8nCustomNote(e.target.value)}
                  placeholder="เช่น: วันเสาร์ติดงานทั้งวันไม่สะดวกออกกำลังกาย, ขอเน้นช่วงเช้าก่อน 08:00 เท่านั้น, วันพุธขอแบบเบาๆ ฯลฯ"
                  rows={3}
                  style={{
                    width: '100%',
                    padding: '12px 14px',
                    borderRadius: '10px',
                    border: '1.5px solid #cbd5e1',
                    fontSize: '13.5px',
                    fontFamily: 'inherit',
                    lineHeight: '1.5',
                    resize: 'vertical',
                    outline: 'none',
                    boxSizing: 'border-box'
                  }}
                />

                {/* Quick Presets */}
                <div style={{ marginTop: '10px' }}>
                  <span style={{ fontSize: '11.5px', fontWeight: '700', color: '#64748b', display: 'block', marginBottom: '6px' }}>
                    ⚡ เงื่อนไขด่วนที่พบบ่อย (คลิกเพื่อเพิ่ม):
                  </span>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
                    {[
                      { label: '🚫 วันเสาร์ติดงาน (งดวันเสาร์)', text: 'วันเสาร์ติดงานทั้งวัน งดจัดกิจกรรมวันเสาร์' },
                      { label: '🚫 งดวันเสาร์-อาทิตย์', text: 'เสาร์และอาทิตย์ไม่สะดวก ขอจัดเฉพาะวันธรรมดา' },
                      { label: '🌅 เน้นช่วงเช้า (06:30 - 08:00)', text: 'ขอเน้นจัดช่วงเช้าเวลา 06:30 - 08:00 น.' },
                      { label: '🌇 เน้นช่วงเย็น (17:30 - 19:00)', text: 'ขอเน้นจัดช่วงเย็นหลังเลิกงาน 17:30 - 19:00 น.' },
                      { label: '🧘 ขอแบบ Low Impact (ไม่กระโดด)', text: 'ขอท่าออกกำลังกายแบบ Low Impact ไม่กระโดด ไม่กระทบเข่า' },
                      { label: '💪 บอดี้เวท 30 นาที', text: 'เน้นบอดี้เวทใช้เวลาประมาณ 30 นาที' }
                    ].map((preset, idx) => (
                      <button
                        key={idx}
                        type="button"
                        onClick={() => {
                          if (n8nCustomNote.includes(preset.text)) return;
                          setN8nCustomNote(prev => prev ? `${prev}, ${preset.text}` : preset.text);
                        }}
                        style={{
                          fontSize: '11.5px',
                          padding: '4px 10px',
                          borderRadius: '16px',
                          background: '#f1f5f9',
                          color: '#334155',
                          border: '1px solid #e2e8f0',
                          cursor: 'pointer',
                          fontWeight: '600',
                          transition: 'all 0.15s'
                        }}
                      >
                        {preset.label}
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              {/* Action Buttons */}
              <div style={{ display: 'flex', gap: '10px', justifyContent: 'flex-end', marginTop: '22px' }}>
                <button
                  type="button"
                  onClick={() => setShowN8nPlanModal(false)}
                  disabled={isN8nPlanning}
                  style={{
                    padding: '10px 18px',
                    borderRadius: '10px',
                    border: '1px solid #cbd5e1',
                    background: '#ffffff',
                    color: '#475569',
                    fontSize: '13.5px',
                    fontWeight: '700',
                    cursor: 'pointer'
                  }}
                >
                  ยกเลิก
                </button>
                <button
                  type="button"
                  onClick={(e) => handlePlanFreeTimeWithN8N(e, n8nCustomNote, n8nDaysCount)}
                  disabled={isN8nPlanning}
                  className="btn btn-primary"
                  style={{
                    padding: '10px 24px',
                    borderRadius: '10px',
                    fontSize: '13.5px',
                    fontWeight: '700',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '8px',
                    cursor: isN8nPlanning ? 'not-allowed' : 'pointer',
                    opacity: isN8nPlanning ? 0.7 : 1
                  }}
                >
                  {isN8nPlanning ? (
                    <>
                      <div className="spinner" style={{ width: '15px', height: '15px', border: '2px solid rgba(255,255,255,0.3)', borderTop: '2px solid white', borderRadius: '50%', animation: 'spin 1s linear infinite' }}></div>
                      <span>กำลังส่ง Prompt ให้ AI วางแผน...</span>
                    </>
                  ) : (
                    <>
                      <Sparkles size={16} />
                      <span>✨ ให้ AI จัดตารางเวลาว่างทันที</span>
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Log Calories Burned Modal (Manual Workout Logging) - Fullscreen Overlay */}
        {showLogBurnModal && (
          <div style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            width: '100vw',
            height: '100vh',
            backgroundColor: 'rgba(15, 23, 42, 0.72)',
            backdropFilter: 'blur(8px)',
            zIndex: 999999,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '16px',
            overflowY: 'auto'
          }}>
            <div style={{
              background: '#ffffff',
              borderRadius: '16px',
              maxWidth: '520px',
              width: '100%',
              padding: '24px',
              boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)',
              textAlign: 'left',
              maxHeight: '90vh',
              overflowY: 'auto'
            }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
                <div>
                  <h3 style={{ fontSize: '19px', fontWeight: '800', color: 'var(--text-dark)', margin: 0, display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <Flame size={22} color="#f97316" /> บันทึกการออกกำลังกาย
                  </h3>
                  <p style={{ fontSize: '12.5px', color: 'var(--text-muted)', margin: '4px 0 0 0' }}>
                    บันทึกกิจกรรมการซ้อม หรือการเผาผลาญแคลอรี่นอกตาราง
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => setShowLogBurnModal(false)}
                  style={{
                    background: '#f1f5f9',
                    border: 'none',
                    fontSize: '14px',
                    width: '32px',
                    height: '32px',
                    borderRadius: '50%',
                    cursor: 'pointer',
                    color: 'var(--text-muted)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center'
                  }}
                >
                  ✕
                </button>
              </div>

              {/* Quick Activity Presets */}
              <div style={{ marginBottom: '14px' }}>
                <label style={{ display: 'block', fontSize: '11.5px', fontWeight: '700', color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: '6px' }}>
                  ⚡ เลือกกิจกรรมยอดนิยม หรือตัวเลือกอื่นๆ
                </label>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(78px, 1fr))', gap: '6px' }}>
                  {workoutPresets.map((preset) => {
                    const isSelected = burnForm.selectedPresetId === preset.id;
                    const isAi = preset.isAiCustom;
                    return (
                      <button
                        key={preset.id}
                        type="button"
                        onClick={() => handleSelectPreset(preset)}
                        style={{
                          padding: '6px 4px',
                          borderRadius: '8px',
                          border: isSelected 
                            ? (isAi ? '1.5px solid #8b5cf6' : '1.5px solid var(--primary)') 
                            : (isAi ? '1px solid #ddd6fe' : '1px solid #e2e8f0'),
                          background: isSelected 
                            ? (isAi ? 'rgba(139, 92, 246, 0.12)' : 'rgba(16, 185, 129, 0.1)') 
                            : (isAi ? '#f5f3ff' : '#f8fafc'),
                          color: isSelected 
                            ? (isAi ? '#7c3aed' : 'var(--primary)') 
                            : (isAi ? '#6d28d9' : 'var(--text-dark)'),
                          fontSize: '11px',
                          fontWeight: isSelected ? '700' : '500',
                          cursor: 'pointer',
                          display: 'flex',
                          flexDirection: 'column',
                          alignItems: 'center',
                          gap: '3px',
                          textAlign: 'center',
                          transition: 'all 0.15s'
                        }}
                      >
                        <span style={{ fontSize: '18px' }}>{preset.icon}</span>
                        <span style={{ whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', width: '100%', fontSize: '10px' }}>
                          {preset.shortTitle}
                        </span>
                      </button>
                    );
                  })}
                </div>
              </div>

              <form onSubmit={handleSaveBurnLog} style={{ display: 'flex', flexDirection: 'column', gap: '13px' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '13px', fontWeight: '600', color: 'var(--text-dark)', marginBottom: '5px' }}>
                    ชื่อกิจกรรม / ชนิดการออกกำลังกาย <span style={{ color: '#ef4444' }}>*</span>
                  </label>
                  <input
                    type="text"
                    value={burnForm.title}
                    onChange={(e) => setBurnForm({ ...burnForm, title: e.target.value })}
                    placeholder="เช่น เล่นสเก็ตบอร์ด, ปีนหน้าผา, เดินป่า, กระโดดแทรมโพลีน, แบดมินตัน"
                    required
                    style={{
                      width: '100%',
                      padding: '9px 12px',
                      borderRadius: '8px',
                      border: '1px solid #cbd5e1',
                      fontSize: '13.5px'
                    }}
                  />
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 1fr 1fr', gap: '8px' }}>
                  <div>
                    <label style={{ display: 'block', fontSize: '12.5px', fontWeight: '600', color: 'var(--text-dark)', marginBottom: '5px' }}>
                      วันที่ออกกำลังกาย
                    </label>
                    <input
                      type="date"
                      value={burnForm.scheduledDate}
                      onChange={(e) => setBurnForm({ ...burnForm, scheduledDate: e.target.value })}
                      required
                      style={{
                        width: '100%',
                        padding: '9px 10px',
                        borderRadius: '8px',
                        border: '1px solid #cbd5e1',
                        fontSize: '13px'
                      }}
                    />
                  </div>
                  <div>
                    <label style={{ display: 'block', fontSize: '12.5px', fontWeight: '600', color: 'var(--text-dark)', marginBottom: '5px' }}>
                      เวลาที่เริ่ม
                    </label>
                    <input
                      type="time"
                      value={burnForm.scheduledTime}
                      onChange={(e) => setBurnForm({ ...burnForm, scheduledTime: e.target.value })}
                      required
                      style={{
                        width: '100%',
                        padding: '9px 10px',
                        borderRadius: '8px',
                        border: '1px solid #cbd5e1',
                        fontSize: '13px'
                      }}
                    />
                  </div>
                  <div>
                    <label style={{ display: 'block', fontSize: '12.5px', fontWeight: '600', color: 'var(--text-dark)', marginBottom: '5px' }}>
                      ระยะเวลา (นาที) <span style={{ color: '#ef4444' }}>*</span>
                    </label>
                    <input
                      type="number"
                      min="1"
                      max="1440"
                      value={burnForm.durationMinutes}
                      onChange={(e) => handleBurnDurationChange(e.target.value)}
                      required
                      style={{
                        width: '100%',
                        padding: '9px 10px',
                        borderRadius: '8px',
                        border: '1px solid #cbd5e1',
                        fontSize: '13px'
                      }}
                    />
                  </div>
                </div>

                {/* Intensity Level Selection */}
                <div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
                    <label style={{ fontSize: '13px', fontWeight: '600', color: 'var(--text-dark)' }}>
                      ระดับความเหนื่อย / ความเข้มข้น (Intensity)
                    </label>
                    {aiIntensityMap && (
                      <span style={{ fontSize: '11px', color: '#7c3aed', fontWeight: '700', display: 'flex', alignItems: 'center', gap: '3px' }}>
                        <Sparkles size={12} /> ผลลัพธ์ AI 3 ระดับ
                      </span>
                    )}
                  </div>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '8px' }}>
                    {[
                      { key: 'LIGHT', label: '🟢 เบาๆ (Light)', defaultDesc: 'สบายๆ พูดคุยได้' },
                      { key: 'MODERATE', label: '🟡 ปานกลาง (Moderate)', defaultDesc: 'เหงื่อซึม หายใจเร็วขึ้น' },
                      { key: 'INTENSE', label: '🔴 หนักหน่วง (Intense)', defaultDesc: 'เหนื่อยหอบ ท้าทาย' },
                    ].map((lvl) => {
                      const isSelected = burnForm.intensity === lvl.key;
                      const aiCal = aiIntensityMap ? aiIntensityMap[lvl.key]?.calories : null;
                      const aiDesc = aiIntensityMap ? aiIntensityMap[lvl.key]?.desc : null;
                      return (
                        <button
                          key={lvl.key}
                          type="button"
                          title={aiDesc || lvl.defaultDesc}
                          onClick={() => handleBurnIntensityChange(lvl.key)}
                          style={{
                            padding: '8px 6px',
                            borderRadius: '8px',
                            border: isSelected 
                              ? (aiIntensityMap ? '1.5px solid #8b5cf6' : '1.5px solid var(--primary)') 
                              : '1px solid #e2e8f0',
                            background: isSelected 
                              ? (aiIntensityMap ? 'rgba(139, 92, 246, 0.1)' : 'rgba(16, 185, 129, 0.1)') 
                              : '#f8fafc',
                            color: isSelected 
                              ? (aiIntensityMap ? '#7c3aed' : 'var(--primary)') 
                              : 'var(--text-dark)',
                            cursor: 'pointer',
                            textAlign: 'center',
                            transition: 'all 0.15s'
                          }}
                        >
                          <div style={{ fontSize: '11.5px', fontWeight: isSelected ? '700' : '600' }}>{lvl.label}</div>
                          {aiCal ? (
                            <div style={{ 
                              fontSize: '11.5px', 
                              fontWeight: '800', 
                              color: isSelected ? '#ea580c' : '#f97316', 
                              marginTop: '3px',
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              gap: '2px'
                            }}>
                              <Flame size={12} /> ~{aiCal} kcal
                            </div>
                          ) : (
                            <div style={{ fontSize: '9.5px', color: 'var(--text-muted)', marginTop: '2px' }}>{lvl.defaultDesc}</div>
                          )}
                        </button>
                      );
                    })}
                  </div>
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: '13px', fontWeight: '600', color: 'var(--text-dark)', marginBottom: '5px' }}>
                    บันทึกรายละเอียดเพิ่มเติม (ตัวเลือก)
                  </label>
                  <textarea
                    rows="2"
                    value={burnForm.description}
                    onChange={(e) => setBurnForm({ ...burnForm, description: e.target.value })}
                    placeholder="เช่น เล่นเกมแข่งขันกับเพื่อน มีวิ่งสปรินต์และชู้ตบาส, รู้สึกสดชื่นมาก"
                    style={{
                      width: '100%',
                      padding: '8px 12px',
                      borderRadius: '8px',
                      border: '1px solid #cbd5e1',
                      fontSize: '13px',
                      resize: 'vertical'
                    }}
                  />
                </div>

                {/* n8n AI Calorie Calculation Trigger Button */}
                <div style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  background: 'linear-gradient(135deg, #f5f3ff 0%, #ede9fe 100%)',
                  padding: '8px 12px',
                  borderRadius: '8px',
                  border: '1px solid #ddd6fe'
                }}>
                  <div style={{ textAlign: 'left' }}>
                    <span style={{ fontSize: '12px', fontWeight: '700', color: '#5b21b6', display: 'flex', alignItems: 'center', gap: '4px' }}>
                      <Sparkles size={14} color="#7c3aed" /> n8n AI Calorie Estimator
                    </span>
                    <span style={{ fontSize: '10.5px', color: '#6d28d9' }}>
                      กดคำนวณครั้งเดียว ได้ผลลัพธ์ครบทั้ง 3 ระดับ
                    </span>
                  </div>
                  <button
                    type="button"
                    onClick={handleCalculateBurnWithN8N}
                    disabled={isCalculatingAiBurn || !burnForm.title.trim()}
                    style={{
                      background: 'linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%)',
                      color: 'white',
                      border: 'none',
                      borderRadius: '7px',
                      padding: '6px 12px',
                      fontSize: '11.5px',
                      fontWeight: '700',
                      cursor: (isCalculatingAiBurn || !burnForm.title.trim()) ? 'not-allowed' : 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '5px',
                      boxShadow: '0 2px 6px rgba(99, 102, 241, 0.25)',
                      transition: 'all 0.2s',
                      opacity: !burnForm.title.trim() ? 0.6 : 1
                    }}
                  >
                    {isCalculatingAiBurn ? (
                      <>
                        <div className="spinner" style={{ width: '11px', height: '11px', border: '2px solid rgba(255,255,255,0.3)', borderTop: '2px solid white', borderRadius: '50%', animation: 'spin 1s linear infinite' }}></div>
                        <span>กำลังคำนวณ 3 ระดับ...</span>
                      </>
                    ) : (
                      <>
                        <Bot size={13} />
                        <span>คำนวณด้วย n8n AI</span>
                      </>
                    )}
                  </button>
                </div>

                {/* AI Explanation Callout if available */}
                {aiBurnExplanation && (
                  <div style={{
                    background: 'linear-gradient(135deg, #f0fdf4 0%, #eff6ff 100%)',
                    border: '1px solid #86efac',
                    borderRadius: '8px',
                    padding: '8px 12px',
                    fontSize: '11.5px',
                    color: '#166534',
                    display: 'flex',
                    alignItems: 'flex-start',
                    gap: '7px',
                    lineHeight: '1.4'
                  }}>
                    <Sparkles size={15} color="#16a34a" style={{ flexShrink: 0, marginTop: '2px' }} />
                    <div>
                      <strong style={{ color: '#15803d', display: 'block', marginBottom: '1px' }}>ผลวิเคราะห์จาก n8n AI:</strong>
                      <span>{aiBurnExplanation}</span>
                    </div>
                  </div>
                )}

                <div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '5px' }}>
                    <label style={{ fontSize: '13px', fontWeight: '600', color: 'var(--text-dark)' }}>
                      พลังงานที่เผาผลาญ (kcal)
                    </label>
                    <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>
                      {burnForm.selectedPresetId === 'other' && !burnForm.burnedCalories 
                        ? '(กดปุ่ม n8n AI ด้านบน หรือระบุตัวเลข)' 
                        : '(สามารถปรับแต่งตัวเลขได้ตามต้องการ)'}
                    </span>
                  </div>
                  <div style={{ position: 'relative' }}>
                    <input
                      type="number"
                      min="1"
                      value={burnForm.burnedCalories}
                      onChange={(e) => setBurnForm({ ...burnForm, burnedCalories: e.target.value })}
                      placeholder={burnForm.selectedPresetId === 'other' ? "กดปุ่ม 'คำนวณด้วย n8n AI' ด้านบน หรือกรอกตัวเลข" : "0"}
                      required
                      style={{
                        width: '100%',
                        padding: '9px 40px 9px 12px',
                        borderRadius: '8px',
                        border: '1px solid #cbd5e1',
                        fontSize: '15px',
                        fontWeight: '700',
                        color: '#f97316'
                      }}
                    />
                    <span style={{ position: 'absolute', right: '12px', top: '50%', transform: 'translateY(-50%)', fontSize: '12.5px', color: 'var(--text-muted)', fontWeight: '600' }}>
                      kcal
                    </span>
                  </div>
                </div>

                {/* Quick Summary Pill */}
                <div style={{
                  background: 'linear-gradient(135deg, rgba(16, 185, 129, 0.08), rgba(249, 115, 22, 0.08))',
                  borderRadius: '8px',
                  padding: '10px 14px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  fontSize: '12.5px',
                  border: '1px solid rgba(16, 185, 129, 0.2)'
                }}>
                  <span style={{ color: 'var(--text-dark)', fontWeight: '500' }}>
                    🕒 ช่วงเวลา: <strong>{burnForm.scheduledTime || 'ตอนนี้'} - {calculateEndTimeString(burnForm.scheduledTime, burnForm.durationMinutes)}</strong> ({burnForm.durationMinutes || 0} นาที)
                  </span>
                  <span style={{ color: '#ea580c', fontWeight: '700', display: 'flex', alignItems: 'center', gap: '4px' }}>
                    <Flame size={15} /> 
                    {burnForm.burnedCalories !== '' && burnForm.burnedCalories !== undefined && Number(burnForm.burnedCalories) > 0
                      ? `+${Math.round(burnForm.burnedCalories)} kcal`
                      : (burnForm.selectedPresetId === 'other' ? 'รอ n8n AI คำนวณ' : '+0 kcal')
                    }
                  </span>
                </div>

                {isCalendarConnected && (
                  <div style={{
                    fontSize: '11.5px',
                    color: '#0369a1',
                    background: '#f0f9ff',
                    border: '1px solid #bae6fd',
                    borderRadius: '6px',
                    padding: '6px 10px',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '6px'
                  }}>
                    <Calendar size={13} color="#0284c7" />
                    <span>เชื่อมต่อ Google Calendar แล้ว: ระบบจะเพิ่มนัดหมายลงปฏิทินของคุณให้อัตโนมัติ</span>
                  </div>
                )}

                <div style={{ display: 'flex', gap: '10px', marginTop: '6px', justifyContent: 'flex-end' }}>
                  <button
                    type="button"
                    onClick={() => setShowLogBurnModal(false)}
                    disabled={isSavingBurnLog}
                    style={{
                      padding: '9px 16px',
                      borderRadius: '8px',
                      border: '1px solid #cbd5e1',
                      background: '#f8fafc',
                      color: 'var(--text-dark)',
                      fontWeight: '600',
                      fontSize: '13px',
                      cursor: 'pointer'
                    }}
                  >
                    ยกเลิก
                  </button>
                  <button
                    type="submit"
                    disabled={isSavingBurnLog}
                    className="btn btn-primary"
                    style={{
                      padding: '9px 20px',
                      borderRadius: '8px',
                      fontWeight: '700',
                      fontSize: '13.5px',
                      cursor: isSavingBurnLog ? 'not-allowed' : 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '6px'
                    }}
                  >
                    {isSavingBurnLog ? (
                      <>
                        <div className="spinner" style={{ width: '12px', height: '12px', border: '2px solid rgba(255,255,255,0.3)', borderTop: '2px solid white', borderRadius: '50%', animation: 'spin 1s linear infinite' }}></div>
                        <span>กำลังบันทึก...</span>
                      </>
                    ) : (
                      <>
                        <Check size={16} />
                        <span>บันทึกการออกกำลังกาย</span>
                      </>
                    )}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* Modal: Log Body Weight Modal */}
        {showLogWeightModal && (
          <div style={{
            position: 'fixed',
            top: 0,
            left: 0,
            width: '100vw',
            height: '100vh',
            background: 'rgba(15, 23, 42, 0.65)',
            backdropFilter: 'blur(6px)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 999999,
            padding: '16px',
            margin: 0,
            boxSizing: 'border-box'
          }}>
            <div style={{
              background: '#ffffff',
              borderRadius: '16px',
              width: '100%',
              maxWidth: '440px',
              padding: '24px',
              boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)',
              border: '1px solid #e2e8f0',
              textAlign: 'left'
            }} className="animate-scale-up">
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px', borderBottom: '1px solid #f1f5f9', paddingBottom: '12px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <div style={{ width: '34px', height: '34px', borderRadius: '8px', background: '#e0f2fe', color: '#0284c7', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <Scale size={18} />
                  </div>
                  <div>
                    <h3 style={{ fontSize: '17px', fontWeight: '800', color: '#0f172a', margin: 0 }}>
                      บันทึกน้ำหนักตัว (Log Body Weight)
                    </h3>
                    <span style={{ fontSize: '12px', color: '#64748b' }}>ติดตามพัฒนาการสู่เป้าหมายสุขภาพ</span>
                  </div>
                </div>
                <button
                  onClick={() => setShowLogWeightModal(false)}
                  style={{
                    background: '#f1f5f9',
                    border: 'none',
                    borderRadius: '50%',
                    width: '28px',
                    height: '28px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    cursor: 'pointer',
                    color: '#64748b'
                  }}
                >
                  <X size={15} />
                </button>
              </div>

              <form onSubmit={handleSaveWeight} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '13px', fontWeight: '700', color: '#0f172a', marginBottom: '5px' }}>
                    น้ำหนักปัจจุบัน (กก.) <span style={{ color: '#ef4444' }}>*</span>
                  </label>
                  <div style={{ position: 'relative' }}>
                    <input
                      type="number"
                      step="0.1"
                      min="20"
                      max="300"
                      value={weightForm.weight}
                      onChange={(e) => setWeightForm({ ...weightForm, weight: e.target.value })}
                      placeholder="เช่น 65.5"
                      required
                      style={{
                        width: '100%',
                        padding: '10px 45px 10px 14px',
                        borderRadius: '8px',
                        border: '1.5px solid #cbd5e1',
                        fontSize: '16px',
                        fontWeight: '700',
                        color: '#0284c7'
                      }}
                    />
                    <span style={{ position: 'absolute', right: '14px', top: '50%', transform: 'translateY(-50%)', fontSize: '13px', color: '#64748b', fontWeight: '700' }}>
                      kg
                    </span>
                  </div>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                  <div>
                    <label style={{ display: 'block', fontSize: '12.5px', fontWeight: '600', color: '#334155', marginBottom: '5px' }}>
                      เปอร์เซ็นต์ไขมัน (%) <span style={{ fontSize: '11px', color: '#94a3b8' }}>(ตัวเลือก)</span>
                    </label>
                    <input
                      type="number"
                      step="0.1"
                      min="1"
                      max="70"
                      value={weightForm.bodyFatPercentage}
                      onChange={(e) => setWeightForm({ ...weightForm, bodyFatPercentage: e.target.value })}
                      placeholder="เช่น 18.5"
                      style={{
                        width: '100%',
                        padding: '9px 12px',
                        borderRadius: '8px',
                        border: '1px solid #cbd5e1',
                        fontSize: '13px'
                      }}
                    />
                  </div>
                  <div>
                    <label style={{ display: 'block', fontSize: '12.5px', fontWeight: '600', color: '#334155', marginBottom: '5px' }}>
                      วันที่ชั่งน้ำหนัก
                    </label>
                    <input
                      type="date"
                      value={weightForm.logDate}
                      onChange={(e) => setWeightForm({ ...weightForm, logDate: e.target.value })}
                      required
                      style={{
                        width: '100%',
                        padding: '9px 12px',
                        borderRadius: '8px',
                        border: '1px solid #cbd5e1',
                        fontSize: '13px'
                      }}
                    />
                  </div>
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: '12.5px', fontWeight: '600', color: '#334155', marginBottom: '5px' }}>
                    บันทึกความรู้สึก / โน้ตเพิ่มเติม
                  </label>
                  <textarea
                    rows="2"
                    value={weightForm.notes}
                    onChange={(e) => setWeightForm({ ...weightForm, notes: e.target.value })}
                    placeholder="เช่น ชั่งตอนเช้าหลังตื่นนอน, รู้สึกตัวเบาขึ้น"
                    style={{
                      width: '100%',
                      padding: '8px 12px',
                      borderRadius: '8px',
                      border: '1px solid #cbd5e1',
                      fontSize: '13px',
                      resize: 'vertical'
                    }}
                  />
                </div>

                <div style={{ display: 'flex', gap: '10px', marginTop: '6px', justifyContent: 'flex-end' }}>
                  <button
                    type="button"
                    onClick={() => setShowLogWeightModal(false)}
                    disabled={isSavingWeight}
                    style={{
                      padding: '9px 16px',
                      borderRadius: '8px',
                      border: '1px solid #cbd5e1',
                      background: '#f8fafc',
                      color: 'var(--text-dark)',
                      fontWeight: '600',
                      fontSize: '13px',
                      cursor: 'pointer'
                    }}
                  >
                    ยกเลิก
                  </button>
                  <button
                    type="submit"
                    disabled={isSavingWeight}
                    className="btn btn-primary"
                    style={{
                      background: '#0284c7',
                      padding: '9px 20px',
                      borderRadius: '8px',
                      fontWeight: '700',
                      fontSize: '13.5px',
                      cursor: isSavingWeight ? 'not-allowed' : 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '6px'
                    }}
                  >
                    {isSavingWeight ? (
                      <>
                        <div className="spinner" style={{ width: '12px', height: '12px', border: '2px solid rgba(255,255,255,0.3)', borderTop: '2px solid white', borderRadius: '50%', animation: 'spin 1s linear infinite' }}></div>
                        <span>กำลังบันทึก...</span>
                      </>
                    ) : (
                      <>
                        <Check size={16} />
                        <span>บันทึกน้ำหนัก</span>
                      </>
                    )}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* AI Meal & Nutrition Logging Modal */}
        {showLogMealModal && (
          <div style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(15, 23, 42, 0.65)',
            backdropFilter: 'blur(4px)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 9999,
            padding: '20px'
          }}>
            <div style={{
              background: '#ffffff',
              borderRadius: '16px',
              width: '100%',
              maxWidth: '580px',
              padding: '26px',
              boxShadow: '0 20px 25px -5px rgba(0,0,0,0.1), 0 10px 10px -5px rgba(0,0,0,0.04)',
              textAlign: 'left',
              maxHeight: '90vh',
              overflowY: 'auto'
            }} className="animate-slide-up">
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px', borderBottom: '1px solid #f1f5f9', paddingBottom: '12px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                  <div style={{ width: '40px', height: '40px', borderRadius: '10px', background: '#ecfdf5', color: '#059669', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <Utensils size={22} />
                  </div>
                  <div>
                    <h3 style={{ fontSize: '18px', fontWeight: '800', color: '#0f172a', margin: 0 }}>
                      บันทึกมื้ออาหาร & วิเคราะห์ด้วย AI
                    </h3>
                    <span style={{ fontSize: '12px', color: '#64748b' }}>AI จะคำนวณแคลอรี่ โปรตีน คาร์บ และไขมันให้อัตโนมัติ</span>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setShowLogMealModal(false)}
                  style={{ background: 'transparent', border: 'none', color: '#94a3b8', cursor: 'pointer', padding: '4px' }}
                >
                  <X size={20} />
                </button>
              </div>

              {/* Mode Toggle Tabs: Text vs. Photo Scanner */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px', marginBottom: '18px', background: '#f1f5f9', padding: '4px', borderRadius: '10px' }}>
                <button
                  type="button"
                  onClick={() => setMealModalMode('text')}
                  style={{
                    padding: '9px',
                    borderRadius: '8px',
                    border: 'none',
                    background: mealModalMode === 'text' ? '#ffffff' : 'transparent',
                    color: mealModalMode === 'text' ? '#0f172a' : '#64748b',
                    fontWeight: '700',
                    fontSize: '13px',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '6px',
                    boxShadow: mealModalMode === 'text' ? '0 2px 4px rgba(0,0,0,0.06)' : 'none',
                    transition: 'all 0.2s'
                  }}
                >
                  <ChefHat size={16} color={mealModalMode === 'text' ? '#10b981' : '#64748b'} />
                  <span>พิมพ์ชื่ออาหาร (Text)</span>
                </button>
                <button
                  type="button"
                  onClick={() => setMealModalMode('photo')}
                  style={{
                    padding: '9px',
                    borderRadius: '8px',
                    border: 'none',
                    background: mealModalMode === 'photo' ? '#ffffff' : 'transparent',
                    color: mealModalMode === 'photo' ? '#0f172a' : '#64748b',
                    fontWeight: '700',
                    fontSize: '13px',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '6px',
                    boxShadow: mealModalMode === 'photo' ? '0 2px 4px rgba(0,0,0,0.06)' : 'none',
                    transition: 'all 0.2s'
                  }}
                >
                  <Camera size={16} color={mealModalMode === 'photo' ? '#3b82f6' : '#64748b'} />
                  <span>📸 ถ่ายรูป/สแกนภาพ (AI Vision)</span>
                </button>
              </div>

              <form onSubmit={handleSaveMeal} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                {/* Meal Type Selector */}
                <div>
                  <label style={{ display: 'block', fontSize: '12px', fontWeight: '700', color: '#334155', marginBottom: '6px' }}>
                    ประเภทมื้ออาหาร
                  </label>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '8px' }}>
                    {[
                      { id: 'BREAKFAST', label: 'มื้อเช้า', icon: '🍳' },
                      { id: 'LUNCH', label: 'มื้อกลางวัน', icon: '🍱' },
                      { id: 'DINNER', label: 'มื้อเย็น', icon: '🍲' },
                      { id: 'SNACK', label: 'ของว่าง', icon: '🍎' }
                    ].map(type => {
                      const isSelected = mealForm.mealType === type.id;
                      return (
                        <button
                          key={type.id}
                          type="button"
                          onClick={() => setMealForm({ ...mealForm, mealType: type.id })}
                          style={{
                            padding: '8px 4px',
                            borderRadius: '8px',
                            border: `2px solid ${isSelected ? '#10b981' : '#e2e8f0'}`,
                            background: isSelected ? '#ecfdf5' : '#ffffff',
                            color: isSelected ? '#065f46' : '#475569',
                            fontWeight: '700',
                            fontSize: '12px',
                            cursor: 'pointer',
                            display: 'flex',
                            flexDirection: 'column',
                            alignItems: 'center',
                            gap: '3px',
                            transition: 'all 0.15s'
                          }}
                        >
                          <span style={{ fontSize: '16px' }}>{type.icon}</span>
                          <span>{type.label}</span>
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* MODE 1: PHOTO SCANNER */}
                {mealModalMode === 'photo' && (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                    <label style={{ display: 'block', fontSize: '12.5px', fontWeight: '700', color: '#334155' }}>
                      อัปโหลดหรือถ่ายภาพจานอาหาร
                    </label>

                    {!photoPreview ? (
                      <label style={{
                        border: '2px dashed #93c5fd',
                        background: '#eff6ff',
                        borderRadius: '12px',
                        padding: '30px 20px',
                        textAlign: 'center',
                        cursor: 'pointer',
                        display: 'flex',
                        flexDirection: 'column',
                        alignItems: 'center',
                        gap: '8px',
                        transition: 'all 0.2s'
                      }}>
                        <input
                          type="file"
                          accept="image/*"
                          onChange={handlePhotoFileSelect}
                          style={{ display: 'none' }}
                        />
                        <div style={{ width: '48px', height: '48px', borderRadius: '50%', background: '#dbeafe', color: '#2563eb', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                          <Camera size={24} />
                        </div>
                        <div>
                          <strong style={{ fontSize: '14px', color: '#1e40af', display: 'block' }}>คลิกเพื่อเลือกภาพ หรือถ่ายภาพอาหาร</strong>
                          <span style={{ fontSize: '11.5px', color: '#64748b' }}>รองรับไฟล์ JPG, PNG, WebP (AI จะตรวจจับวัตถุดิบและสัดส่วนให้)</span>
                        </div>
                      </label>
                    ) : (
                      <div style={{ position: 'relative', borderRadius: '12px', overflow: 'hidden', border: '2px solid #3b82f6', background: '#0f172a' }}>
                        {isAnalyzingPhoto && <div className="scanner-laser"></div>}
                        <img
                          src={photoPreview}
                          alt="Meal Preview"
                          style={{ width: '100%', maxHeight: '240px', objectFit: 'cover', display: 'block', opacity: isAnalyzingPhoto ? 0.7 : 1 }}
                        />
                        <button
                          type="button"
                          onClick={() => { setPhotoPreview(null); setPhotoBase64(''); }}
                          style={{
                            position: 'absolute',
                            top: '10px',
                            right: '10px',
                            background: 'rgba(15, 23, 42, 0.75)',
                            color: 'white',
                            border: 'none',
                            borderRadius: '50%',
                            width: '28px',
                            height: '28px',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            cursor: 'pointer'
                          }}
                        >
                          <X size={16} />
                        </button>
                        <div style={{ position: 'absolute', bottom: '8px', left: '10px', background: 'rgba(0,0,0,0.65)', color: '#38bdf8', padding: '3px 8px', borderRadius: '6px', fontSize: '11px', fontWeight: '700', display: 'flex', alignItems: 'center', gap: '4px' }}>
                          <Sparkles size={12} /> Gemini 1.5 Vision Ready
                        </div>
                      </div>
                    )}

                    {photoPreview && (
                      <button
                        type="button"
                        onClick={handleAnalyzePhoto}
                        disabled={isAnalyzingPhoto}
                        style={{
                          width: '100%',
                          padding: '12px',
                          borderRadius: '10px',
                          background: 'linear-gradient(135deg, #2563eb 0%, #1d4ed8 100%)',
                          border: 'none',
                          color: 'white',
                          fontWeight: '700',
                          fontSize: '13.5px',
                          cursor: isAnalyzingPhoto ? 'not-allowed' : 'pointer',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          gap: '8px',
                          boxShadow: '0 2px 8px rgba(37, 99, 235, 0.3)'
                        }}
                      >
                        {isAnalyzingPhoto ? (
                          <>
                            <div className="spinner" style={{ width: '15px', height: '15px', border: '2px solid rgba(255,255,255,0.3)', borderTop: '2px solid white', borderRadius: '50%', animation: 'spin 0.8s linear infinite' }}></div>
                            <span>Gemini Vision กำลังสแกนอาหารในภาพ...</span>
                          </>
                        ) : (
                          <>
                            <Sparkles size={16} />
                            <span>🔍 สแกนและวิเคราะห์คุณค่าอาหารจากภาพ (AI Vision)</span>
                          </>
                        )}
                      </button>
                    )}
                  </div>
                )}

                {/* MODE 2: TEXT INPUT */}
                {mealModalMode === 'text' && (
                  <div>
                    <label style={{ display: 'block', fontSize: '12.5px', fontWeight: '700', color: '#334155', marginBottom: '6px' }}>
                      ชื่ออาหาร / เมนูที่รับประทาน <span style={{ color: '#ef4444' }}>*</span>
                    </label>
                    <textarea
                      rows="2"
                      required
                      value={mealForm.mealDescription}
                      onChange={(e) => setMealForm({ ...mealForm, mealDescription: e.target.value })}
                      placeholder="เช่น ข้าวกะเพราอกไก่ไข่ดาวไม่น้ำมัน, สลัดทูน่า + ขนมปังโฮลวีท 2 แผ่น"
                      style={{
                        width: '100%',
                        padding: '10px 14px',
                        borderRadius: '8px',
                        border: '1.5px solid #cbd5e1',
                        fontSize: '14px',
                        outline: 'none',
                        resize: 'vertical'
                      }}
                    />

                    {/* Quick Preset Buttons */}
                    <div style={{ marginTop: '8px' }}>
                      <span style={{ fontSize: '11px', color: '#64748b', display: 'block', marginBottom: '4px' }}>
                        ⚡ เมนูตัวอย่างคลิกได้ทันที:
                      </span>
                      <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
                        {[
                          'อกไก่ย่าง 200g + ข้าวกล้อง 1 ทัพพี',
                          'สเต็กแซลมอน + สลัดผักน้ำใส',
                          'ไข่ต้ม 2 ฟอง + กล้วยหอม 1 ลูก',
                          'ข้าวกะเพราอกไก่ไข่ดาว',
                          'เวย์โปรตีน 1 สกู๊ป + นมข้าวโอ๊ต'
                        ].map(preset => (
                          <button
                            key={preset}
                            type="button"
                            onClick={() => setMealForm({ ...mealForm, mealDescription: preset })}
                            style={{
                              padding: '4px 10px',
                              fontSize: '11px',
                              background: '#f1f5f9',
                              color: '#334155',
                              border: '1px solid #e2e8f0',
                              borderRadius: '6px',
                              cursor: 'pointer',
                              transition: 'all 0.15s'
                            }}
                          >
                            {preset}
                          </button>
                        ))}
                      </div>
                    </div>

                    <button
                      type="button"
                      onClick={handleAnalyzeMealPreview}
                      disabled={isAnalyzingMeal || !mealForm.mealDescription.trim()}
                      style={{
                        width: '100%',
                        padding: '11px',
                        borderRadius: '8px',
                        background: 'linear-gradient(135deg, #3b82f6 0%, #2563eb 100%)',
                        border: 'none',
                        color: 'white',
                        fontWeight: '700',
                        fontSize: '13px',
                        cursor: (isAnalyzingMeal || !mealForm.mealDescription.trim()) ? 'not-allowed' : 'pointer',
                        opacity: (!mealForm.mealDescription.trim() && !isAnalyzingMeal) ? 0.6 : 1,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        gap: '6px',
                        marginTop: '12px',
                        boxShadow: '0 2px 6px rgba(37, 99, 235, 0.2)'
                      }}
                    >
                      {isAnalyzingMeal ? (
                        <>
                          <div className="spinner" style={{ width: '13px', height: '13px', border: '2px solid rgba(255,255,255,0.3)', borderTop: '2px solid white', borderRadius: '50%', animation: 'spin 0.8s linear infinite' }}></div>
                          <span>Gemini AI กำลังวิเคราะห์โภชนาการ...</span>
                        </>
                      ) : (
                        <>
                          <Sparkles size={15} />
                          <span>🤖 ให้ AI คำนวณแคลอรี่และสารอาหาร (Analyze with Gemini)</span>
                        </>
                      )}
                    </button>
                  </div>
                )}

                {/* AI Processing Animation Banner when Loading */}
                {isAnalyzingMeal && (
                  <div className="animate-pulse-glow" style={{
                    background: 'linear-gradient(135deg, #eff6ff 0%, #f0fdf4 100%)',
                    border: '1.5px solid #60a5fa',
                    borderRadius: '12px',
                    padding: '18px',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '10px',
                    textAlign: 'center'
                  }}>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}>
                      <Bot size={22} color="#2563eb" style={{ animation: 'spin 3s linear infinite' }} />
                      <strong style={{ fontSize: '14px', color: '#1e40af' }}>Gemini AI กำลังประมวลผลเมนูอาหารของคุณ...</strong>
                    </div>

                    <p style={{ fontSize: '12px', color: '#475569', margin: 0 }}>
                      กำลังสืบค้นฐานข้อมูลโภชนาการ คำนวณพลังงาน (kcal) และสัดส่วนโปรตีน คาร์บ ไขมัน
                    </p>

                    {/* Animated Typing Dots */}
                    <div style={{ display: 'flex', justifyContent: 'center', gap: '6px', marginTop: '4px' }}>
                      <div className="typing-dot-1" style={{ width: '8px', height: '8px', borderRadius: '50%', background: '#3b82f6' }}></div>
                      <div className="typing-dot-2" style={{ width: '8px', height: '8px', borderRadius: '50%', background: '#10b981' }}></div>
                      <div className="typing-dot-3" style={{ width: '8px', height: '8px', borderRadius: '50%', background: '#3b82f6' }}></div>
                    </div>
                  </div>
                )}

                {/* AI Analysis Preview Result Card */}
                {mealAnalysisPreview && !isAnalyzingMeal && (
                  <div className="animate-slide-up" style={{
                    background: '#f0fdf4',
                    border: '1.5px solid #a7f3d0',
                    borderRadius: '12px',
                    padding: '16px',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '10px'
                  }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <div style={{ fontSize: '13px', fontWeight: '800', color: '#065f46', display: 'flex', alignItems: 'center', gap: '6px' }}>
                        <CheckCircle size={16} color="#059669" /> ผลการวิเคราะห์จาก AI เรียบร้อยแล้ว
                      </div>
                      <span style={{ fontSize: '11px', fontWeight: '700', background: '#dcfce7', color: '#15803d', padding: '2px 8px', borderRadius: '10px' }}>
                        คะแนนสุขภาพ: {mealAnalysisPreview.healthScore || 80}/100
                      </span>
                    </div>

                    {mealAnalysisPreview.summary && (
                      <p style={{ fontSize: '12.5px', color: '#166534', margin: 0, lineHeight: '1.4' }}>
                        {mealAnalysisPreview.summary}
                      </p>
                    )}

                    {mealAnalysisPreview.tips && (
                      <div style={{ fontSize: '11.5px', color: '#047857', background: '#ffffff', padding: '8px 10px', borderRadius: '6px', border: '1px solid #bbf7d0' }}>
                        💡 <strong>คำแนะนำ:</strong> {mealAnalysisPreview.tips}
                      </div>
                    )}
                  </div>
                )}

                {/* Nutrition Numerical Fields (Editable or Shimmering while Loading) */}
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '10px' }}>
                  <div>
                    <label style={{ display: 'block', fontSize: '11.5px', fontWeight: '700', color: '#334155', marginBottom: '4px' }}>
                      🔥 แคลอรี่ (kcal)
                    </label>
                    <input
                      type="number"
                      step="1"
                      min="0"
                      className={isAnalyzingMeal ? 'skeleton-shimmer' : ''}
                      value={mealForm.calories}
                      onChange={(e) => setMealForm({ ...mealForm, calories: e.target.value })}
                      placeholder={isAnalyzingMeal ? 'กำลังคำนวณ...' : 'เช่น 450'}
                      style={{ width: '100%', padding: '8px 10px', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '13px', fontWeight: '700', color: '#059669' }}
                    />
                  </div>
                  <div>
                    <label style={{ display: 'block', fontSize: '11.5px', fontWeight: '700', color: '#334155', marginBottom: '4px' }}>
                      🥩 โปรตีน (g)
                    </label>
                    <input
                      type="number"
                      step="0.1"
                      min="0"
                      className={isAnalyzingMeal ? 'skeleton-shimmer' : ''}
                      value={mealForm.protein}
                      onChange={(e) => setMealForm({ ...mealForm, protein: e.target.value })}
                      placeholder={isAnalyzingMeal ? '...' : 'เช่น 30'}
                      style={{ width: '100%', padding: '8px 10px', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '13px', fontWeight: '600' }}
                    />
                  </div>
                  <div>
                    <label style={{ display: 'block', fontSize: '11.5px', fontWeight: '700', color: '#334155', marginBottom: '4px' }}>
                      🍚 คาร์บ (g)
                    </label>
                    <input
                      type="number"
                      step="0.1"
                      min="0"
                      className={isAnalyzingMeal ? 'skeleton-shimmer' : ''}
                      value={mealForm.carbs}
                      onChange={(e) => setMealForm({ ...mealForm, carbs: e.target.value })}
                      placeholder={isAnalyzingMeal ? '...' : 'เช่น 45'}
                      style={{ width: '100%', padding: '8px 10px', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '13px', fontWeight: '600' }}
                    />
                  </div>
                  <div>
                    <label style={{ display: 'block', fontSize: '11.5px', fontWeight: '700', color: '#334155', marginBottom: '4px' }}>
                      🥑 ไขมัน (g)
                    </label>
                    <input
                      type="number"
                      step="0.1"
                      min="0"
                      className={isAnalyzingMeal ? 'skeleton-shimmer' : ''}
                      value={mealForm.fat}
                      onChange={(e) => setMealForm({ ...mealForm, fat: e.target.value })}
                      placeholder={isAnalyzingMeal ? '...' : 'เช่น 12'}
                      style={{ width: '100%', padding: '8px 10px', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '13px', fontWeight: '600' }}
                    />
                  </div>
                </div>

                {/* Form Action Buttons */}
                <div style={{ display: 'flex', gap: '10px', marginTop: '10px', justifyContent: 'flex-end' }}>
                  <button
                    type="button"
                    onClick={() => setShowLogMealModal(false)}
                    disabled={isSavingMeal}
                    style={{
                      padding: '10px 18px',
                      borderRadius: '8px',
                      border: '1px solid #cbd5e1',
                      background: '#f8fafc',
                      color: 'var(--text-dark)',
                      fontWeight: '600',
                      fontSize: '13px',
                      cursor: 'pointer'
                    }}
                  >
                    ยกเลิก
                  </button>
                  <button
                    type="submit"
                    disabled={isSavingMeal || !mealForm.mealDescription.trim()}
                    style={{
                      background: '#10b981',
                      border: 'none',
                      color: 'white',
                      padding: '10px 22px',
                      borderRadius: '8px',
                      fontWeight: '700',
                      fontSize: '13.5px',
                      cursor: (isSavingMeal || !mealForm.mealDescription.trim()) ? 'not-allowed' : 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '6px',
                      boxShadow: '0 2px 6px rgba(16, 185, 129, 0.3)'
                    }}
                  >
                    {isSavingMeal ? (
                      <>
                        <div className="spinner" style={{ width: '12px', height: '12px', border: '2px solid rgba(255,255,255,0.3)', borderTop: '2px solid white', borderRadius: '50%', animation: 'spin 1s linear infinite' }}></div>
                        <span>กำลังบันทึก...</span>
                      </>
                    ) : (
                      <>
                        <Check size={16} />
                        <span>บันทึกมื้ออาหาร</span>
                      </>
                    )}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* Modal: Warm-up & Cool-down Routine Guide */}
        {showWarmupModal && (() => {
          const currentGuide = WARMUP_COOLDOWN_DATA[warmupCategory] || WARMUP_COOLDOWN_DATA.CORE_CARDIO;
          const exercises = warmupSelectedTab === 'warmup' ? currentGuide.warmupExercises : currentGuide.cooldownExercises;
          const completedInThisTab = exercises.filter(ex => completedWarmupIds.has(ex.id)).length;
          const progressPercent = exercises.length > 0 ? Math.round((completedInThisTab / exercises.length) * 100) : 0;

          return (
            <div
              style={{
                position: 'fixed',
                top: 0,
                left: 0,
                right: 0,
                bottom: 0,
                backgroundColor: 'rgba(15, 23, 42, 0.65)',
                backdropFilter: 'blur(6px)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                zIndex: 99999,
                padding: '16px'
              }}
              onClick={() => setShowWarmupModal(false)}
            >
              <div
                style={{
                  background: '#ffffff',
                  borderRadius: '20px',
                  maxWidth: '750px',
                  width: '100%',
                  maxHeight: '90vh',
                  display: 'flex',
                  flexDirection: 'column',
                  boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)',
                  overflow: 'hidden',
                  textAlign: 'left',
                  animation: 'modalSlideUp 0.3s cubic-bezier(0.16, 1, 0.3, 1)'
                }}
                onClick={(e) => e.stopPropagation()}
              >
                {/* Modal Header */}
                <div style={{
                  padding: '20px 24px',
                  borderBottom: '1px solid #f1f5f9',
                  background: warmupSelectedTab === 'warmup'
                    ? 'linear-gradient(135deg, #fffbeb 0%, #fef3c7 100%)'
                    : 'linear-gradient(135deg, #eff6ff 0%, #dbeafe 100%)',
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center'
                }}>
                  <div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
                      <span style={{
                        fontSize: '20px',
                        background: 'white',
                        padding: '4px 8px',
                        borderRadius: '10px',
                        boxShadow: '0 2px 4px rgba(0,0,0,0.05)'
                      }}>
                        {warmupSelectedTab === 'warmup' ? '🔥' : '❄️'}
                      </span>
                      <h3 style={{ fontSize: '18px', fontWeight: '800', color: '#0f172a', margin: 0 }}>
                        {warmupSelectedTab === 'warmup' ? 'คู่มือวอร์มอัพก่อนออกกำลังกาย (Warm-up)' : 'คู่มือคูลดาวน์และยืดเหยียด (Cool-down)'}
                      </h3>
                    </div>
                    <p style={{ fontSize: '12.5px', color: '#64748b', margin: 0 }}>
                      {warmupModalTitle ? `สำหรับโปรแกรม: ${warmupModalTitle}` : 'เตรียมร่างกายและป้องกันการบาดเจ็บตามหลักวิทยาศาสตร์การกีฬา'}
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => setShowWarmupModal(false)}
                    style={{
                      background: 'white',
                      border: '1px solid #e2e8f0',
                      borderRadius: '50%',
                      width: '34px',
                      height: '34px',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      cursor: 'pointer',
                      color: '#64748b',
                      boxShadow: '0 2px 4px rgba(0,0,0,0.05)'
                    }}
                  >
                    <X size={18} />
                  </button>
                </div>

                {/* Sub-Header: Phase Tabs & Category Selector */}
                <div style={{ padding: '14px 24px 10px', borderBottom: '1px solid #f1f5f9', background: '#f8fafc' }}>
                  {/* Phase Tabs: Warm-up vs Cool-down */}
                  <div style={{
                    display: 'flex',
                    background: '#e2e8f0',
                    borderRadius: '12px',
                    padding: '4px',
                    gap: '4px',
                    marginBottom: '12px'
                  }}>
                    <button
                      type="button"
                      onClick={() => setWarmupSelectedTab('warmup')}
                      style={{
                        flex: 1,
                        padding: '9px 16px',
                        borderRadius: '9px',
                        border: 'none',
                        background: warmupSelectedTab === 'warmup' ? '#ffffff' : 'transparent',
                        color: warmupSelectedTab === 'warmup' ? '#b45309' : '#64748b',
                        fontWeight: '700',
                        fontSize: '13.5px',
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        gap: '6px',
                        boxShadow: warmupSelectedTab === 'warmup' ? '0 2px 6px rgba(0,0,0,0.08)' : 'none',
                        transition: 'all 0.2s'
                      }}
                    >
                      <Flame size={16} color={warmupSelectedTab === 'warmup' ? '#f59e0b' : '#64748b'} />
                      <span>1. Warm-up ก่อนซ้อม (5-7 นาที)</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => setWarmupSelectedTab('cooldown')}
                      style={{
                        flex: 1,
                        padding: '9px 16px',
                        borderRadius: '9px',
                        border: 'none',
                        background: warmupSelectedTab === 'cooldown' ? '#ffffff' : 'transparent',
                        color: warmupSelectedTab === 'cooldown' ? '#1d4ed8' : '#64748b',
                        fontWeight: '700',
                        fontSize: '13.5px',
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        gap: '6px',
                        boxShadow: warmupSelectedTab === 'cooldown' ? '0 2px 6px rgba(0,0,0,0.08)' : 'none',
                        transition: 'all 0.2s'
                      }}
                    >
                      <Droplets size={16} color={warmupSelectedTab === 'cooldown' ? '#3b82f6' : '#64748b'} />
                      <span>2. Cool-down & ยืดเหยียด (5-7 นาที)</span>
                    </button>
                  </div>

                  {/* Muscle Group Switcher */}
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                    <span style={{ fontSize: '12px', fontWeight: '700', color: '#64748b' }}>กลุ่มเป้าหมาย:</span>
                    {[
                      { key: 'UPPER_BODY', label: '💪 ท่อนบน (Upper Body)' },
                      { key: 'LOWER_BODY', label: '🦵 ท่อนล่าง (Lower Body)' },
                      { key: 'CORE_CARDIO', label: '⚡ แกนกลาง & คาร์ดิโอ (Core/Cardio)' }
                    ].map(cat => (
                      <button
                        key={cat.key}
                        type="button"
                        onClick={() => setWarmupCategory(cat.key)}
                        style={{
                          fontSize: '12px',
                          padding: '4px 12px',
                          borderRadius: '16px',
                          border: warmupCategory === cat.key ? '1px solid #10b981' : '1px solid #e2e8f0',
                          background: warmupCategory === cat.key ? '#ecfdf5' : '#ffffff',
                          color: warmupCategory === cat.key ? '#047857' : '#64748b',
                          fontWeight: warmupCategory === cat.key ? '700' : '500',
                          cursor: 'pointer',
                          transition: 'all 0.2s'
                        }}
                      >
                        {cat.label}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Modal Body: Exercises List */}
                <div style={{ padding: '20px 24px', overflowY: 'auto', flex: 1, display: 'flex', flexDirection: 'column', gap: '16px' }}>
                  {/* Expert Advice Tip Box */}
                  <div style={{
                    background: warmupSelectedTab === 'warmup' ? '#fffbeb' : '#f0f9ff',
                    border: warmupSelectedTab === 'warmup' ? '1px solid #fef3c7' : '1px solid #e0f2fe',
                    borderRadius: '12px',
                    padding: '12px 16px',
                    display: 'flex',
                    alignItems: 'flex-start',
                    gap: '10px'
                  }}>
                    <Lightbulb size={20} color={warmupSelectedTab === 'warmup' ? '#d97706' : '#0284c7'} style={{ flexShrink: 0, marginTop: '2px' }} />
                    <div>
                      <span style={{ fontSize: '13px', fontWeight: '700', color: warmupSelectedTab === 'warmup' ? '#92400e' : '#0369a1', display: 'block', marginBottom: '2px' }}>
                        💡 คำแนะนำจากผู้เชี่ยวชาญ:
                      </span>
                      <p style={{ fontSize: '12.5px', color: warmupSelectedTab === 'warmup' ? '#78350f' : '#0c4a6e', margin: 0, lineHeight: 1.5 }}>
                        {warmupSelectedTab === 'warmup' ? currentGuide.warmupTip : currentGuide.cooldownTip}
                      </p>
                    </div>
                  </div>

                  {/* Progress Header */}
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span style={{ fontSize: '13.5px', fontWeight: '800', color: '#334155' }}>
                      📋 รายการท่าฝึก ({exercises.length} ท่า)
                    </span>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <span style={{ fontSize: '12px', color: '#64748b', fontWeight: '600' }}>
                        ทำแล้ว {completedInThisTab}/{exercises.length} ท่า
                      </span>
                      <div style={{ width: '80px', height: '6px', background: '#e2e8f0', borderRadius: '4px', overflow: 'hidden' }}>
                        <div style={{
                          width: `${progressPercent}%`,
                          height: '100%',
                          background: warmupSelectedTab === 'warmup' ? '#f59e0b' : '#3b82f6',
                          transition: 'width 0.3s'
                        }}></div>
                      </div>
                    </div>
                  </div>

                  {/* Exercises Grid */}
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                    {exercises.map((exercise, idx) => {
                      const isDone = completedWarmupIds.has(exercise.id);

                      return (
                        <div
                          key={exercise.id}
                          style={{
                            border: isDone ? '1px solid #86efac' : '1px solid #e2e8f0',
                            background: isDone ? '#f0fdf4' : '#ffffff',
                            borderRadius: '14px',
                            padding: '14px 18px',
                            display: 'flex',
                            gap: '14px',
                            alignItems: 'flex-start',
                            transition: 'all 0.2s',
                            boxShadow: isDone ? 'none' : '0 2px 6px rgba(0,0,0,0.02)'
                          }}
                        >
                          {/* Left: Step / Icon */}
                          <div style={{
                            width: '42px',
                            height: '42px',
                            borderRadius: '12px',
                            background: isDone ? '#dcfce7' : '#f8fafc',
                            border: isDone ? '1px solid #bbf7d0' : '1px solid #f1f5f9',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            fontSize: '20px',
                            flexShrink: 0
                          }}>
                            {exercise.icon}
                          </div>

                          {/* Middle: Exercise Info & Instructions */}
                          <div style={{ flex: 1 }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap', marginBottom: '4px' }}>
                              <span style={{ fontSize: '11px', fontWeight: '800', color: '#94a3b8' }}>
                                #{idx + 1}
                              </span>
                              <h4 style={{
                                fontSize: '15px',
                                fontWeight: '700',
                                color: isDone ? '#166534' : '#0f172a',
                                margin: 0,
                                textDecoration: isDone ? 'line-through' : 'none'
                              }}>
                                {exercise.nameTh}
                              </h4>
                              <span style={{ fontSize: '12px', color: '#64748b' }}>
                                ({exercise.name})
                              </span>
                            </div>

                            <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap', margin: '4px 0 8px' }}>
                              <span style={{
                                fontSize: '11.5px',
                                fontWeight: '700',
                                color: warmupSelectedTab === 'warmup' ? '#b45309' : '#1d4ed8',
                                background: warmupSelectedTab === 'warmup' ? '#fef3c7' : '#dbeafe',
                                padding: '2px 8px',
                                borderRadius: '6px'
                              }}>
                                ⏱️ {exercise.duration}
                              </span>
                              <span style={{
                                fontSize: '11.5px',
                                color: '#475569',
                                background: '#f1f5f9',
                                padding: '2px 8px',
                                borderRadius: '6px'
                              }}>
                                🎯 {exercise.target}
                              </span>
                            </div>

                            <p style={{ fontSize: '12.5px', color: '#475569', margin: 0, lineHeight: 1.5 }}>
                              {exercise.instructions}
                            </p>
                          </div>

                          {/* Right: Check Action */}
                          <button
                            type="button"
                            onClick={() => handleToggleWarmupCheck(exercise.id)}
                            style={{
                              border: isDone ? 'none' : '1.5px solid #cbd5e1',
                              background: isDone ? '#10b981' : '#ffffff',
                              color: isDone ? '#ffffff' : '#64748b',
                              borderRadius: '50%',
                              width: '32px',
                              height: '32px',
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              cursor: 'pointer',
                              flexShrink: 0,
                              marginTop: '4px',
                              transition: 'all 0.2s',
                              boxShadow: isDone ? '0 2px 6px rgba(16, 185, 129, 0.4)' : 'none'
                            }}
                            title={isDone ? "คลิกเพื่อยกเลิกการติ๊ก" : "คลิกเมื่อทำท่านี้เสร็จแล้ว"}
                          >
                            <Check size={16} />
                          </button>
                        </div>
                      );
                    })}
                  </div>
                </div>

                {/* Modal Footer */}
                <div style={{
                  padding: '16px 24px',
                  borderTop: '1px solid #f1f5f9',
                  background: '#f8fafc',
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  flexWrap: 'wrap',
                  gap: '10px'
                }}>
                  <button
                    type="button"
                    onClick={() => {
                      setWarmupSelectedTab(prev => prev === 'warmup' ? 'cooldown' : 'warmup');
                    }}
                    style={{
                      background: 'none',
                      border: 'none',
                      color: '#0284c7',
                      fontSize: '13px',
                      fontWeight: '700',
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '4px'
                    }}
                  >
                    <span>{warmupSelectedTab === 'warmup' ? '➡️ สลับไปดูท่า Cool-down หลังซ้อม' : '⬅️ สลับไปดูท่า Warm-up ก่อนซ้อม'}</span>
                  </button>

                  <div style={{ display: 'flex', gap: '8px' }}>
                    {completedInThisTab > 0 && (
                      <button
                        type="button"
                        onClick={() => {
                          setCompletedWarmupIds(prev => {
                            const next = new Set(prev);
                            exercises.forEach(ex => next.delete(ex.id));
                            return next;
                          });
                        }}
                        style={{
                          padding: '8px 14px',
                          borderRadius: '8px',
                          border: '1px solid #cbd5e1',
                          background: '#ffffff',
                          color: '#64748b',
                          fontSize: '12.5px',
                          fontWeight: '600',
                          cursor: 'pointer'
                        }}
                      >
                        ล้างการติ๊ก
                      </button>
                    )}
                    <button
                      type="button"
                      onClick={() => setShowWarmupModal(false)}
                      style={{
                        padding: '9px 22px',
                        borderRadius: '10px',
                        border: 'none',
                        background: '#10b981',
                        color: 'white',
                        fontWeight: '700',
                        fontSize: '13.5px',
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '6px',
                        boxShadow: '0 2px 8px rgba(16, 185, 129, 0.3)'
                      }}
                    >
                      <Check size={16} />
                      <span>เข้าใจแล้ว พร้อมออกกำลังกาย</span>
                    </button>
                  </div>
                </div>
              </div>
            </div>
          );
        })()}

        {/* Floating Action Button (FAB) when Chat is closed - Truly Fixed to Viewport Bottom Right */}
        {!isChatOpen && (
          <button
            type="button"
            onClick={() => setIsChatOpen(true)}
            style={{
              position: 'fixed',
              bottom: '24px',
              right: '24px',
              background: 'linear-gradient(135deg, var(--primary) 0%, #00a389 100%)',
              color: 'white',
              border: 'none',
              borderRadius: '30px',
              padding: '12px 22px',
              display: 'flex',
              alignItems: 'center',
              gap: '10px',
              boxShadow: '0 8px 28px rgba(0, 135, 90, 0.45)',
              cursor: 'pointer',
              zIndex: 999999,
              fontWeight: '700',
              fontSize: '14px',
              transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)'
            }}
            title="คลิกเพื่อปรึกษาและพูดคุยกับ AI Mentor"
          >
            <Bot size={22} />
            <span>ปรึกษา AI Mentor</span>
            <span style={{ background: '#ffab00', color: '#000', fontSize: '10px', padding: '2px 7px', borderRadius: '10px', fontWeight: '800' }}>24/7</span>
          </button>
        )}

        {/* Floating AI Chat Drawer Window when Chat is open - Truly Fixed to Viewport Bottom Right */}
        {isChatOpen && (
          <div style={{
            position: 'fixed',
            bottom: '24px',
            right: '24px',
            width: '390px',
            maxWidth: 'calc(100vw - 32px)',
            height: '560px',
            maxHeight: 'calc(100vh - 80px)',
            background: '#ffffff',
            borderRadius: 'var(--radius-lg)',
            boxShadow: '0 16px 48px rgba(0, 0, 0, 0.25)',
            border: '1px solid var(--border-color)',
            display: 'flex',
            flexDirection: 'column',
            zIndex: 999999,
            overflow: 'hidden'
          }}>
            {/* Header */}
            <div style={{
              background: 'linear-gradient(135deg, var(--primary) 0%, #00a389 100%)',
              color: 'white',
              padding: '12px 16px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
              gap: '8px'
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', minWidth: 0 }}>
                <div style={{ width: '32px', height: '32px', borderRadius: '50%', background: 'rgba(255,255,255,0.2)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                  <Bot size={18} color="white" />
                </div>
                <div style={{ textAlign: 'left', minWidth: 0 }}>
                  <h4 style={{ fontSize: '14px', fontWeight: '700', color: 'white', margin: 0, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                    yourPace AI Mentor
                  </h4>
                  <span style={{ fontSize: '10.5px', opacity: 0.9, display: 'block', whiteSpace: 'nowrap' }}>
                    🟢 พร้อมให้คำปรึกษาตลอด 24 ชม.
                  </span>
                </div>
              </div>

              <div style={{ display: 'flex', alignItems: 'center', gap: '6px', flexShrink: 0 }}>
                <button
                  onClick={handleClearChatHistory}
                  title="ล้างประวัติการสนทนาและเริ่มแชทใหม่"
                  style={{
                    background: 'rgba(255,255,255,0.18)',
                    border: 'none',
                    color: 'white',
                    padding: '4px 8px',
                    borderRadius: '6px',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '4px',
                    fontSize: '11px',
                    fontWeight: '600',
                    transition: 'all 0.2s',
                    whiteSpace: 'nowrap'
                  }}
                >
                  <Trash2 size={12} />
                  <span>ล้างแชท</span>
                </button>

                <button
                  onClick={() => setIsChatOpen(false)}
                  title="พับหน้าต่างแชทลงเพื่อดูข้อมูลบนหน้าจอ"
                  style={{
                    background: 'rgba(255,255,255,0.18)',
                    border: 'none',
                    color: 'white',
                    width: '26px',
                    height: '26px',
                    borderRadius: '50%',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    transition: 'all 0.2s',
                    flexShrink: 0
                  }}
                >
                  <ChevronDown size={16} />
                </button>

                <button
                  onClick={() => setIsChatOpen(false)}
                  title="ปิดหน้าต่าง AI Chat"
                  style={{
                    background: 'rgba(255,255,255,0.18)',
                    border: 'none',
                    color: 'white',
                    width: '26px',
                    height: '26px',
                    borderRadius: '50%',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    transition: 'all 0.2s',
                    flexShrink: 0
                  }}
                >
                  <X size={15} />
                </button>
              </div>
            </div>

            {/* Messages */}
            <div style={{ flex: 1, padding: '16px', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '12px', background: '#f8fafc', textAlign: 'left' }}>
              {isChatHistoryLoading ? (
                <div style={{ display: 'flex', flex: 1, alignItems: 'center', justifyContent: 'center', flexDirection: 'column', gap: '8px', color: '#64748b' }}>
                  <div className="spinner" style={{ width: '20px', height: '20px', border: '2px solid #cbd5e1', borderTop: '2px solid var(--primary)', borderRadius: '50%', animation: 'spin 1s linear infinite' }}></div>
                  <span style={{ fontSize: '12px' }}>กำลังโหลดประวัติการสนทนา...</span>
                </div>
              ) : (
                <>
                  {chatLog.map((msg, index) => {
                    const isAI = msg.sender === 'ai';
                    const timeStr = msg.createdAt ? new Date(msg.createdAt).toLocaleTimeString('th-TH', { hour: '2-digit', minute: '2-digit' }) : null;

                    return (
                      <div
                        key={msg.id || index}
                        style={{
                          alignSelf: isAI ? 'flex-start' : 'flex-end',
                          maxWidth: '85%',
                          display: 'flex',
                          flexDirection: 'column',
                          alignItems: isAI ? 'flex-start' : 'flex-end',
                          gap: '3px'
                        }}
                      >
                        <div style={{
                          padding: '12px 14px',
                          borderRadius: isAI ? '4px 14px 14px 14px' : '14px 4px 14px 14px',
                          fontSize: '13px',
                          lineHeight: '1.55',
                          background: isAI ? '#ffffff' : 'var(--primary)',
                          color: isAI ? 'var(--text-dark)' : '#ffffff',
                          border: isAI ? '1px solid #e2e8f0' : 'none',
                          boxShadow: isAI ? '0 1px 4px rgba(0,0,0,0.04)' : '0 2px 6px rgba(0,135,90,0.25)',
                          wordBreak: 'break-word'
                        }}>
                          {isAI ? (
                            <FormattedChatMessage text={msg.text} />
                          ) : (
                            msg.text
                          )}
                        </div>
                        {timeStr && (
                          <span style={{ fontSize: '10px', color: '#94a3b8', padding: '0 4px' }}>
                            {timeStr}
                          </span>
                        )}
                      </div>
                    );
                  })}

                  {isChatLoading && (
                    <div style={{
                      alignSelf: 'flex-start',
                      padding: '12px 14px',
                      borderRadius: '4px 14px 14px 14px',
                      background: '#ffffff',
                      border: '1px solid #e2e8f0',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '8px',
                      boxShadow: '0 1px 4px rgba(0,0,0,0.04)'
                    }}>
                      <div className="spinner" style={{ width: '12px', height: '12px', border: '1.5px solid #cbd5e1', borderTop: '1.5px solid var(--primary)', borderRadius: '50%', animation: 'spin 1s linear infinite' }}></div>
                      <span style={{ fontSize: '12px', color: 'var(--text-muted)' }}>AI Mentor กำลังประมวลผลคำแนะนำ...</span>
                    </div>
                  )}
                </>
              )}
              <div ref={chatEndRef} />
            </div>

            {/* Input Form */}
            <form onSubmit={handleSendChatMessage} style={{ padding: '12px 14px', background: 'white', borderTop: '1px solid #edf2f7', display: 'flex', gap: '8px' }}>
              <input
                type="text"
                value={chatMessage}
                onChange={(e) => setChatMessage(e.target.value)}
                placeholder="พิมพ์ถามข้อมูลกับ AI Mentor..."
                style={{
                  flex: 1,
                  padding: '10px 14px',
                  borderRadius: 'var(--radius-sm)',
                  border: '1px solid #cbd5e1',
                  fontSize: '13px',
                  outline: 'none'
                }}
                disabled={isChatLoading || isChatHistoryLoading}
              />
              <button
                type="submit"
                style={{
                  width: '38px',
                  height: '38px',
                  borderRadius: 'var(--radius-sm)',
                  background: 'var(--primary)',
                  color: 'white',
                  border: 'none',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  cursor: (isChatLoading || isChatHistoryLoading) ? 'not-allowed' : 'pointer',
                  transition: 'all 0.2s'
                }}
                disabled={isChatLoading || isChatHistoryLoading}
                title="ส่งข้อความ"
              >
                <Send size={16} />
              </button>
            </form>
          </div>
        )}

      </div>
    );
  }

  // VIEW: Default Landing Page (User NOT logged in)
  return (
    <div className="app-container">
      {/* Navigation Bar */}
      <header className="navbar animate-fade-in">
        <div className="logo-container" onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}>
          <div className="logo-badge">yP</div>
          <span className="logo-text">yourPace</span>
        </div>
        <div className="nav-actions">
          <button className="btn btn-outline" onClick={() => setCurrentRoute('auth')}>Sign In</button>
          <button className="btn btn-primary" onClick={() => setCurrentRoute('auth')}>Get Started</button>
        </div>
      </header>

      {/* Main Hero Section */}
      <section className="hero-section animate-slide-up" id="hero">
        <div className="hero-content">
          <h1 className="hero-title">
            Your Personal <br />
            <span className="highlight-green">Health</span> <br />
            <span className="highlight-blue">Mentor</span>
          </h1>
          <p className="hero-desc">
            สัมผัสประสบการณ์การโค้ชฟิตเนสและดูแลสุขภาพด้วยพลัง AI ส่วนตัว
            ปรับแผนโภชนาการและการออกกำลังกายตามสภาพร่างกายและอารมณ์ของคุณ
            พร้อมออกแบบเฉพาะให้สอดคล้องกับอุปกรณ์ที่คุณมีจริงที่บ้าน
          </p>
          <div className="hero-cta">
            <button className="btn btn-large btn-primary" onClick={() => setCurrentRoute('auth')}>
              Start Your Journey <ArrowRight size={18} />
            </button>
            <a href="#features-anchor" className="btn btn-large btn-secondary-outline">
              Learn More
            </a>
          </div>

          <div className="hero-social-proof">
            <span className="stars">
              {"★★★★★".split("").map((star, idx) => <span key={idx}>★</span>)}
            </span>
            <span>Trusted by health enthusiasts — 1,000+ active users</span>
          </div>
        </div>

        <div className="hero-visual">
          <div className="hero-card" onClick={() => setCurrentRoute('auth')}>
            <div className="card-icon-wrapper icon-green">
              <Bot size={28} />
            </div>
            <div className="card-text">
              <h3 className="card-title">AI-Powered Coaching</h3>
              <p className="card-desc">รับแผนการออกกำลังกายที่ออกแบบเฉพาะบุคคลและคำแนะนำแบบเรียลไทม์จาก AI แสนอัจฉริยะ</p>
            </div>
          </div>

          <div className="hero-card" onClick={() => setCurrentRoute('auth')}>
            <div className="card-icon-wrapper icon-blue">
              <TrendingUp size={28} />
            </div>
            <div className="card-text">
              <h3 className="card-title">Smart Tracking</h3>
              <p className="card-desc">ติดตามความคืบหน้าด้านสุขภาพด้วยระบบวิเคราะห์ข้อมูลร่างกายและคำแนะนำเชิงลึก</p>
            </div>
          </div>

          <div className="hero-card" onClick={() => setCurrentRoute('auth')}>
            <div className="card-icon-wrapper icon-pink">
              <Target size={28} />
            </div>
            <div className="card-text">
              <h3 className="card-title">Personalized Goals</h3>
              <p className="card-desc">บรรลุเป้าหมายการมีสุขภาพดีอย่างยั่งยืน โดยปรับให้สอดคล้องกับรูปแบบชีวิตจริงของคุณ</p>
            </div>
          </div>
        </div>
      </section>

      {/* Interactive Widget Section: ลองเช็คอินและออกแบบแผนกับ AI */}
      <section className="features-section" id="interactive-demo" style={{ backgroundColor: '#ffffff', border: '1px solid var(--border-color)', boxShadow: 'var(--shadow-md)', marginBottom: '80px', padding: '60px 24px' }}>
        <span className="section-tag">Interactive Preview</span>
        <h2 className="section-title">ลองทดสอบระบบวิเคราะห์ของ yourPace</h2>
        <p className="section-desc">ลองสัมผัสประสบการณ์จริงของฟีเจอร์เด่นของเรา: ระบบแนะนำการออกกำลังกายตามอุปกรณ์ และการเช็คอินสุขภาพเพื่อรับคำแนะนำจาก AI</p>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1.2fr', gap: '40px', maxWidth: '1000px', margin: '0 auto', textAlign: 'left' }}>

          {/* Column 1: Config Equipment */}
          <div style={{ background: '#f8fafc', padding: '30px', borderRadius: 'var(--radius-md)', border: '1px solid #edf2f7' }}>
            <h3 style={{ fontSize: '20px', marginBottom: '16px', color: 'var(--text-dark)', display: 'flex', alignItems: 'center', gap: '8px' }}>
              <Dumbbell size={22} color="var(--primary)" /> 1. อุปกรณ์ที่คุณมีในตอนนี้
            </h3>
            <p style={{ fontSize: '14px', color: 'var(--text-muted)', marginBottom: '20px' }}>
              AI ของเราจะคัดเลือกท่าออกกำลังกายที่ทำได้จริงทันทีโดยอิงจากอุปกรณ์ที่คุณเลือกด้านล่างนี้
            </p>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              {equipmentOptions.map((eq) => {
                const isSelected = selectedEquipment.includes(eq.id);
                return (
                  <div
                    key={eq.id}
                    onClick={() => handleEquipmentToggle(eq.id)}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      padding: '12px 18px',
                      borderRadius: 'var(--radius-sm)',
                      background: isSelected ? 'var(--primary-light)' : '#ffffff',
                      border: `1px solid ${isSelected ? 'var(--primary)' : '#e2e8f0'}`,
                      cursor: 'pointer',
                      fontWeight: isSelected ? '600' : '400',
                      color: isSelected ? 'var(--primary-hover)' : 'var(--text-dark)',
                      transition: 'var(--transition)'
                    }}
                  >
                    <span style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                      <span style={{ fontSize: '18px' }}>{eq.icon}</span>
                      <span>{eq.name}</span>
                    </span>
                    <span style={{
                      width: '20px',
                      height: '20px',
                      borderRadius: '50%',
                      border: `2px solid ${isSelected ? 'var(--primary)' : '#cbd5e1'}`,
                      background: isSelected ? 'var(--primary)' : 'transparent',
                      display: 'inline-flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      color: 'white',
                      fontSize: '12px'
                    }}>
                      {isSelected && '✓'}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Column 2: Emotional/Physical Check-in */}
          <div style={{ display: 'flex', flexDirection: 'column', justifyItems: 'center', justifyContent: 'center' }}>
            <h3 style={{ fontSize: '20px', marginBottom: '16px', color: 'var(--text-dark)', display: 'flex', alignItems: 'center', gap: '8px' }}>
              <Heart size={22} color="var(--accent-pink)" /> 2. วันนี้สภาพร่างกาย/จิตใจของคุณเป็นอย่างไร?
            </h3>
            <p style={{ fontSize: '14px', color: 'var(--text-muted)', marginBottom: '24px' }}>
              การเช็คอินแบบองค์รวม (Physical & Mental Check-in) ช่วยให้ AI ปรับตารางตามความเหนื่อยล้าหรือระดับความเครียดในแต่ละวัน
            </p>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '12px', marginBottom: '32px' }}>
              <button
                onClick={() => handleCheckin('energetic')}
                style={{
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  gap: '8px',
                  padding: '16px 8px',
                  borderRadius: 'var(--radius-sm)',
                  border: `1px solid ${checkinStatus === 'energetic' ? 'var(--primary)' : '#e2e8f0'}`,
                  background: checkinStatus === 'energetic' ? 'var(--primary-light)' : '#ffffff',
                  cursor: 'pointer',
                  transition: 'var(--transition)'
                }}
              >
                <BatteryCharging size={28} color={checkinStatus === 'energetic' ? 'var(--primary)' : 'var(--text-muted)'} />
                <span style={{ fontSize: '13px', fontWeight: '500' }}>มีพลัง</span>
              </button>

              <button
                onClick={() => handleCheckin('tired')}
                style={{
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  gap: '8px',
                  padding: '16px 8px',
                  borderRadius: 'var(--radius-sm)',
                  border: `1px solid ${checkinStatus === 'tired' ? '#3182ce' : '#e2e8f0'}`,
                  background: checkinStatus === 'tired' ? 'var(--secondary-light)' : '#ffffff',
                  cursor: 'pointer',
                  transition: 'var(--transition)'
                }}
              >
                <Meh size={28} color={checkinStatus === 'tired' ? 'var(--secondary)' : 'var(--text-muted)'} />
                <span style={{ fontSize: '13px', fontWeight: '500' }}>เหนื่อยล้า</span>
              </button>

              <button
                onClick={() => handleCheckin('stressed')}
                style={{
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  gap: '8px',
                  padding: '16px 8px',
                  borderRadius: 'var(--radius-sm)',
                  border: `1px solid ${checkinStatus === 'stressed' ? 'var(--accent-pink)' : '#e2e8f0'}`,
                  background: checkinStatus === 'stressed' ? 'var(--accent-pink-light)' : '#ffffff',
                  cursor: 'pointer',
                  transition: 'var(--transition)'
                }}
              >
                <Frown size={28} color={checkinStatus === 'stressed' ? 'var(--accent-pink)' : 'var(--text-muted)'} />
                <span style={{ fontSize: '13px', fontWeight: '500' }}>เคร่งเครียด</span>
              </button>

              <button
                onClick={() => handleCheckin('focused')}
                style={{
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  gap: '8px',
                  padding: '16px 8px',
                  borderRadius: 'var(--radius-sm)',
                  border: `1px solid ${checkinStatus === 'focused' ? '#805ad5' : '#e2e8f0'}`,
                  background: checkinStatus === 'focused' ? '#faf5ff' : '#ffffff',
                  cursor: 'pointer',
                  transition: 'var(--transition)'
                }}
              >
                <Smile size={28} color={checkinStatus === 'focused' ? '#805ad5' : 'var(--text-muted)'} />
                <span style={{ fontSize: '13px', fontWeight: '500' }}>มีสมาธิ</span>
              </button>
            </div>

            {/* AI Output box */}
            <div style={{
              minHeight: '120px',
              background: '#ffffff',
              border: '1px dashed #cbd5e1',
              borderRadius: 'var(--radius-sm)',
              padding: '20px',
              display: 'flex',
              flexDirection: 'column',
              justifyContent: 'center',
              position: 'relative'
            }}>
              {!checkinStatus && (
                <div style={{ textAlign: 'center', color: 'var(--text-muted)', fontSize: '14px' }}>
                  <Sparkles size={24} color="#a0aec0" style={{ marginBottom: '8px' }} />
                  <p>กดเลือกสภาพร่างกายด้านบน เพื่อรับคำแนะนำโปรแกรมออกกำลังกายจาก AI ทันที</p>
                </div>
              )}

              {checkinStatus && isAnalyzing && (
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '10px' }}>
                  <div className="spinner" style={{
                    width: '32px',
                    height: '32px',
                    border: '3px solid #e2e8f0',
                    borderTop: '3px solid var(--primary)',
                    borderRadius: '50%',
                    animation: 'spin 1s linear infinite'
                  }}></div>
                  <span style={{ fontSize: '14px', color: 'var(--primary)', fontWeight: '500' }}>
                    AI กำลังวิเคราะห์ร่วมกับอุปกรณ์ของคุณ...
                  </span>
                </div>
              )}

              {checkinStatus && !isAnalyzing && (
                <div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '8px' }}>
                    <Sparkles size={16} color="var(--primary)" />
                    <span style={{ fontSize: '12px', fontWeight: 'bold', textTransform: 'uppercase', color: 'var(--primary)', letterSpacing: '1px' }}>
                      คำแนะนำ AI mentor ของคุณ
                    </span>
                  </div>
                  <p style={{ fontSize: '14px', color: 'var(--text-dark)', lineHeight: '1.6', fontWeight: '500' }}>
                    {aiRecommendation}
                  </p>
                  <div style={{ borderTop: '1px solid #edf2f7', marginTop: '12px', paddingTop: '8px', fontSize: '12px', color: 'var(--text-muted)', display: 'flex', justifyContent: 'space-between' }}>
                    <span>อุปกรณ์ที่เลือก: {selectedEquipment.map(id => equipmentOptions.find(e => e.id === id)?.icon).join(' ')}</span>
                    <span style={{ color: 'var(--primary)', cursor: 'pointer', fontWeight: '600' }} onClick={() => setCurrentRoute('auth')}>บันทึกแผนและเริ่มใช้งานจริง →</span>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </section>

      {/* Why Choose yourPace Section */}
      <section className="features-section" id="features-anchor">
        <span className="section-tag">Why Choose yourPace</span>
        <h2 className="section-title">ทุกสิ่งที่คุณต้องการเพื่อบรรลุเป้าหมาย</h2>
        <p className="section-desc">รวบรวมฟังก์ชันการช่วยดูแลสุขภาพที่ครบถ้วนและตอบโจทย์ทุกความต้องการในการพัฒนาตนเองอย่างมีประสิทธิภาพสูงสุด</p>

        <div className="features-grid">
          <div className="feature-item">
            <div className="feature-item-icon" style={{ backgroundColor: '#e6f4ea', color: 'var(--primary)' }}>
              <Calendar size={24} />
            </div>
            <h3 className="feature-item-title">Context-Aware Plans</h3>
            <p className="feature-item-desc">
              ปรับแผนการออกกำลังกายโดยอัตโนมัติตามตารางชีวิต อุปกรณ์ที่มีอยู่จริงในแต่ละวัน
              ตลอดจนระดับพลังงานร่างกายและสภาพอารมณ์ของคุณ
            </p>
          </div>

          <div className="feature-item">
            <div className="feature-item-icon" style={{ backgroundColor: '#e8f0fe', color: 'var(--secondary)' }}>
              <Bot size={24} />
            </div>
            <h3 className="feature-item-title">Real-Time Support</h3>
            <p className="feature-item-desc">
              รับคำแนะนำ ข้อเสนอแนะ หรือตอบข้อสงสัยเกี่ยวกับการออกกำลังกายและโภชนาการได้ทันทีจาก AI Mentor ประจำตัวคุณ
            </p>
          </div>

          <div className="feature-item">
            <div className="feature-item-icon" style={{ backgroundColor: '#fce8e6', color: 'var(--accent-pink)' }}>
              <Heart size={24} />
            </div>
            <h3 className="feature-item-title">Holistic Wellness</h3>
            <p className="feature-item-desc">
              ดูแลสุขภาพอย่างสมบูรณ์แบบทั้งการฝึกซ้อมร่างกาย โภชนาการอาหารที่เหมาะสม
              รวมถึงสภาพจิตใจและความเครียดในหนึ่งเดียว
            </p>
          </div>

          <div className="feature-item">
            <div className="feature-item-icon" style={{ backgroundColor: '#e8f0fe', color: 'var(--secondary)' }}>
              <TrendingUp size={24} />
            </div>
            <h3 className="feature-item-title">Advanced Analytics</h3>
            <p className="feature-item-desc">
              วิเคราะห์ตัวเลขสถิติสุขภาพอย่างแม่นยำ เข้าใจพัฒนาการตนเองผ่านแดชบอร์ดสุขภาพ (Health Dashboard)
              ที่แสดงแนวโน้มอย่างเข้าใจง่าย
            </p>
          </div>

          <div className="feature-item">
            <div className="feature-item-icon" style={{ backgroundColor: '#faf5ff', color: '#805ad5' }}>
              <Clock size={24} />
            </div>
            <h3 className="feature-item-title">24/7 Availability</h3>
            <p className="feature-item-desc">
              โค้ชส่วนตัวอัจฉริยะของคุณพร้อมสแตนด์บายช่วยเหลือคุณตลอด 24 ชั่วโมง 7 วันทำการ
              ไม่ว่าจะดึกแค่ไหนหรือเช้ามืดเท่าไร
            </p>
          </div>

          <div className="feature-item">
            <div className="feature-item-icon" style={{ backgroundColor: '#fffaf0', color: '#dd6b20' }}>
              <Users size={24} />
            </div>
            <h3 className="feature-item-title">Community Support</h3>
            <p className="feature-item-desc">
              ร่วมแบ่งปันผลลัพธ์และความก้าวหน้า ตลอดจนรับแรงผลักดันและกำลังใจที่ดีจากกลุ่มสังคมผู้รักสุขภาพใน yourPace
            </p>
          </div>
        </div>
      </section>

      {/* CTA Box Section */}
      <section className="cta-section">
        <div className="cta-box">
          <h2 className="cta-title">พร้อมที่จะเปลี่ยนสุขภาพของคุณแล้วหรือยัง?</h2>
          <p className="cta-desc">
            เริ่มต้นใช้งาน yourPace วันนี้เพื่อการออกกำลังกายที่ปรับตามไลฟ์สไตล์คุณอย่างแท้จริง
            ก้าวไปสู่เป้าหมายสุขภาพที่ดีกว่าในแบบที่เป็นตัวคุณเอง
          </p>
          <button className="btn btn-large btn-primary" onClick={() => setCurrentRoute('auth')}>
            Get Started Free Today
          </button>
        </div>
      </section>

      {/* Footer Section */}
      <footer className="footer">

        <div className="footer-grid">
          <div className="footer-brand">
            <div className="logo-container" onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}>
              <div className="logo-badge">yP</div>
              <span className="logo-text">yourPace</span>
            </div>
            <p className="footer-brand-desc">
              Your Personal AI Health & Fitness Mentor. เพื่อนคู่คิดการออกกำลังกายและดูแลสุขภาพรายวันของคุณ
            </p>
          </div>

          <div className="footer-column">
            <h4 className="footer-col-title">Product</h4>
            <ul className="footer-links">
              <li><a href="#features-anchor">Features</a></li>
              <li><a href="#interactive-demo">Interactive Demo</a></li>
              <li><a href="#hero">Pricing</a></li>
              <li><a href="#hero">Blog</a></li>
            </ul>
          </div>

          <div className="footer-column">
            <h4 className="footer-col-title">Company</h4>
            <ul className="footer-links">
              <li><a href="#hero">About Us</a></li>
              <li><a href="#hero">Careers</a></li>
              <li><a href="#hero">Contact</a></li>
              <li><a href="#hero">Press</a></li>
            </ul>
          </div>

          <div className="footer-column">
            <h4 className="footer-col-title">Legal</h4>
            <ul className="footer-links">
              <li><a href="#hero">Privacy Policy</a></li>
              <li><a href="#hero">Terms of Service</a></li>
              <li><a href="#hero">Security Guidelines</a></li>
              <li><a href="#hero">Cookies Settings</a></li>
            </ul>
          </div>
        </div>

        <div className="footer-bottom">
          <p>© 2026 yourPace. All rights reserved.</p>
        </div>
      </footer>
    </div>
  );
}

export default App;
