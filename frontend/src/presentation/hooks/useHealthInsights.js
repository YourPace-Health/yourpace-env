import { useState } from 'react';

export function useHealthInsights({ getSessionToken, setSuccessMessage, getApiUrl, loadUserData, loadProgressAnalytics, loadMilestones }) {
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

  return {
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
  };
}
