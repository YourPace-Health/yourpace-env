import { Bot, Sparkles, Flame, Check, Plus, Zap, BarChart3, Medal, Activity } from 'lucide-react';
import { TrendCharts } from '../Charts/TrendCharts';

export const ProgressView = ({ weightHistory, currentUser, getSessionToken, handleFetchWeeklyRecap, isRecapLoading, milestonesList, progressAnalytics, setShowLogWeightModal, setWeightForm, weeklyRecapData }) => (
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

    <TrendCharts userToken={getSessionToken()} refreshKey={weightHistory} />

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
);
