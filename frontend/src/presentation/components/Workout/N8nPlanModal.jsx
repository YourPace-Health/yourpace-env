import { EscapeToClose } from '../../utils/EscapeToClose';
import { Bot, Sparkles, Calendar } from 'lucide-react';

export const N8nPlanModal = ({ calendarEvents, handlePlanFreeTimeWithN8N, isCalendarConnected, isN8nPlanning, n8nCustomNote, n8nDaysCount, setN8nCustomNote, setN8nDaysCount, setShowN8nPlanModal }) => (
  <div role="dialog" aria-modal="true" aria-label="วางแผนออกกำลังกายด้วย AI" style={{
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
    <EscapeToClose onClose={() => setShowN8nPlanModal(false)} />
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
        <label htmlFor="n8nplanmodal-field-121" style={{ fontSize: '13.5px', fontWeight: '700', color: '#334155', display: 'block', marginBottom: '8px' }}>
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
        <label htmlFor="n8nplanmodal-field-121" style={{ fontSize: '13.5px', fontWeight: '700', color: '#334155', display: 'block', marginBottom: '6px' }}>
          📝 แนบเงื่อนไขหรือคำขอพิเศษเพิ่มเติมให้ AI (Optional)
        </label>
        <p style={{ fontSize: '12px', color: '#64748b', margin: '0 0 8px 0' }}>
          ระบุวันที่ติดธุระ วันที่ต้องการงด หรือช่วงเวลาที่ต้องการเน้น เช่น วันเสาร์ไม่สะดวก, ขอเน้นช่วงเช้า
        </p>
        <textarea id="n8nplanmodal-field-121"
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
);
