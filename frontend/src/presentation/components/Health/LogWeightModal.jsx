import { Check, X, Scale } from 'lucide-react';

export const LogWeightModal = ({ handleSaveWeight, isSavingWeight, setShowLogWeightModal, setWeightForm, weightForm }) => (
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
);
