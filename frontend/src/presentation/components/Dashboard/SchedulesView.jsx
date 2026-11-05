import { Bot, Calendar, Dumbbell, Flame, Check, Plus, Trash2, X, RefreshCw } from 'lucide-react';

export const SchedulesView = ({ calendarEvents, calendarLoading, cardioSteps, completedPlansCount, getScheduleId, getSessionToken, handleConnectCalendar, handleDeleteAllSchedules, handleDeleteSchedule, handleOpenWarmupGuide, handleToggleCardioTarget, handleToggleGCalEvent, handleToggleScheduleStatus, handleWaterGlassesChange, isCalendarConnected, isN8nPlanning, isProfilePending, loadCalendarEvents, schedulesLoading, setShowLogBurnModal, setShowN8nPlanModal, setWorkoutTab, targetDistanceKm, targetSteps, targetWaterGlasses, totalBurned, totalPlansCount, upcomingPlansCount, waterGlasses, workoutSchedules, workoutTab }) => (
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
);
