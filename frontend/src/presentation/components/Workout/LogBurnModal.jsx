import { EscapeToClose } from '../../utils/EscapeToClose';
import { Bot, Sparkles, Calendar, Flame, Check } from 'lucide-react';

export const LogBurnModal = ({ aiBurnExplanation, aiIntensityMap, burnForm, calculateEndTimeString, handleBurnDurationChange, handleBurnIntensityChange, handleCalculateBurnWithN8N, handleSaveBurnLog, handleSelectPreset, isCalculatingAiBurn, isCalendarConnected, isSavingBurnLog, setBurnForm, setShowLogBurnModal, workoutPresets }) => (
  <div role="dialog" aria-modal="true" aria-label="บันทึกแคลอรี่ที่เผาผลาญ" style={{
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
    <EscapeToClose onClose={() => setShowLogBurnModal(false)} />
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
        <div id="burn-preset-label" style={{ display: 'block', fontSize: '11.5px', fontWeight: '700', color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: '6px' }}>
          ⚡ เลือกกิจกรรมยอดนิยม หรือตัวเลือกอื่นๆ
        </div>
        <div role="group" aria-labelledby="burn-preset-label" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(78px, 1fr))', gap: '6px' }}>
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
          <label htmlFor="logburnmodal-field-111" style={{ display: 'block', fontSize: '13px', fontWeight: '600', color: 'var(--text-dark)', marginBottom: '5px' }}>
            ชื่อกิจกรรม / ชนิดการออกกำลังกาย <span style={{ color: '#ef4444' }}>*</span>
          </label>
          <input id="logburnmodal-field-111"
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
            <label htmlFor="logburnmodal-field-132" style={{ display: 'block', fontSize: '12.5px', fontWeight: '600', color: 'var(--text-dark)', marginBottom: '5px' }}>
              วันที่ออกกำลังกาย
            </label>
            <input id="logburnmodal-field-132"
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
            <label htmlFor="logburnmodal-field-150" style={{ display: 'block', fontSize: '12.5px', fontWeight: '600', color: 'var(--text-dark)', marginBottom: '5px' }}>
              เวลาที่เริ่ม
            </label>
            <input id="logburnmodal-field-150"
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
            <label htmlFor="logburnmodal-field-168" style={{ display: 'block', fontSize: '12.5px', fontWeight: '600', color: 'var(--text-dark)', marginBottom: '5px' }}>
              ระยะเวลา (นาที) <span style={{ color: '#ef4444' }}>*</span>
            </label>
            <input id="logburnmodal-field-168"
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
            <div id="burn-intensity-label" style={{ fontSize: '13px', fontWeight: '600', color: 'var(--text-dark)' }}>
              ระดับความเหนื่อย / ความเข้มข้น (Intensity)
            </div>
            {aiIntensityMap && (
              <span style={{ fontSize: '11px', color: '#7c3aed', fontWeight: '700', display: 'flex', alignItems: 'center', gap: '3px' }}>
                <Sparkles size={12} /> ผลลัพธ์ AI 3 ระดับ
              </span>
            )}
          </div>
          <div role="group" aria-labelledby="burn-intensity-label" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '8px' }}>
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
          <label htmlFor="logburnmodal-field-257" style={{ display: 'block', fontSize: '13px', fontWeight: '600', color: 'var(--text-dark)', marginBottom: '5px' }}>
            บันทึกรายละเอียดเพิ่มเติม (ตัวเลือก)
          </label>
          <textarea id="logburnmodal-field-257"
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
            <label htmlFor="logburnmodal-field-353" style={{ fontSize: '13px', fontWeight: '600', color: 'var(--text-dark)' }}>
              พลังงานที่เผาผลาญ (kcal)
            </label>
            <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>
              {burnForm.selectedPresetId === 'other' && !burnForm.burnedCalories 
                ? '(กดปุ่ม n8n AI ด้านบน หรือระบุตัวเลข)' 
                : '(สามารถปรับแต่งตัวเลขได้ตามต้องการ)'}
            </span>
          </div>
          <div style={{ position: 'relative' }}>
            <input id="logburnmodal-field-353"
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
);
