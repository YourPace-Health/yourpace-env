import { useState } from 'react';

// Daily cardio goal shown on the dashboard
export const TARGET_STEPS = 8000;

export function useWorkoutPlans({
  getSessionToken,
  getApiUrl,
  getCalendarEvents,
  loadCalendarEvents,
  loadUserData,
  setChatLog,
  setIsChatOpen,
  setError,
  setSuccessMessage
}) {
  // Schedules state
  const [workoutSchedules, setWorkoutSchedules] = useState([]);

  const [schedulesLoading, setSchedulesLoading] = useState(false);

  // Cardio Target state (Steps & Distance)
  const [cardioSteps, setCardioSteps] = useState(0);

  const targetSteps = TARGET_STEPS;
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

  const [showN8nPlanModal, setShowN8nPlanModal] = useState(false);

  const [n8nCustomNote, setN8nCustomNote] = useState('');

  const [n8nDaysCount, setN8nDaysCount] = useState(3);

  const [workoutTab, setWorkoutTab] = useState('plan'); // 'plan' | 'history'

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
          calendarEvents: getCalendarEvents(),
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

  return {
    targetSteps,
    workoutSchedules,
    setWorkoutSchedules,
    schedulesLoading,
    setSchedulesLoading,
    cardioSteps,
    setCardioSteps,
    targetDistanceKm,
    getScheduleId,
    handleToggleCardioTarget,
    totalBurned,
    setTotalBurned,
    showN8nPlanModal,
    setShowN8nPlanModal,
    n8nCustomNote,
    setN8nCustomNote,
    n8nDaysCount,
    setN8nDaysCount,
    workoutTab,
    setWorkoutTab,
    isN8nPlanning,
    handlePlanFreeTimeWithN8N,
    handleDeleteAllSchedules,
    handleDeleteSchedule,
    handleToggleScheduleStatus,
    handleToggleGCalEvent,
  };
}
