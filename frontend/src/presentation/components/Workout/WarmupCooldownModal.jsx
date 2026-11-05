import { EscapeToClose } from '../../utils/EscapeToClose';
import { Flame, Check, X, Droplets, Lightbulb } from 'lucide-react';
import { WARMUP_COOLDOWN_DATA } from '../../../data/warmupCooldownData';

export const WarmupCooldownModal = ({ completedWarmupIds, handleToggleWarmupCheck, setCompletedWarmupIds, setShowWarmupModal, setWarmupCategory, setWarmupSelectedTab, warmupCategory, warmupModalTitle, warmupSelectedTab }) => {
    const currentGuide = WARMUP_COOLDOWN_DATA[warmupCategory] || WARMUP_COOLDOWN_DATA.CORE_CARDIO;
    const exercises = warmupSelectedTab === 'warmup' ? currentGuide.warmupExercises : currentGuide.cooldownExercises;
    const completedInThisTab = exercises.filter(ex => completedWarmupIds.has(ex.id)).length;
    const progressPercent = exercises.length > 0 ? Math.round((completedInThisTab / exercises.length) * 100) : 0;

    return (
      <div
        role="presentation"
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
        onClick={(e) => {
          // only a click on the backdrop itself closes; clicks inside the panel do not
          if (e.target === e.currentTarget) setShowWarmupModal(false);
        }}
      >
        <EscapeToClose onClose={() => setShowWarmupModal(false)} />
        <div
          role="dialog"
          aria-modal="true"
          aria-label={warmupModalTitle || 'ท่าวอร์มอัพและคูลดาวน์'}
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
};
