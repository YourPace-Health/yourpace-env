import { useState } from 'react';

export function useBurnLogger({ getSessionToken, getApiUrl, getIsCalendarConnected, setSuccessMessage, setWorkoutTab, loadUserData, loadCalendarEvents }) {
  const [showLogBurnModal, setShowLogBurnModal] = useState(false);

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
        const calMsg = getIsCalendarConnected() ? " 📅 พร้อมทำนัดหมายลง Google Calendar ให้เรียบร้อยแล้ว!" : "";
        setSuccessMessage(`✨ บันทึกการออกกำลังกาย "${burnForm.title}" สำเร็จ!${calMsg} (+${Math.round(burnForm.burnedCalories)} kcal)`);
        setWorkoutTab('history'); // Switch to history tab so user sees their new entry
        await loadUserData();
        if (getIsCalendarConnected()) {
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

  return {
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
  };
}
