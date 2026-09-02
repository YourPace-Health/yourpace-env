import { useState, useEffect } from 'react';
import { 
  ArrowLeft, 
  Weight, 
  Ruler, 
  Dumbbell, 
  AlertCircle, 
  Save,
  Check,
  Target,
  Flame,
  Clock,
  Zap
} from 'lucide-react';
import { ProfileApiDataSource } from '../../data/datasources/ProfileApiDataSource';

const profileDataSource = new ProfileApiDataSource();

export function ProfilePage({ userToken, onBackToDashboard, onProfileUpdateSuccess }) {
  const [isLoading, setIsLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState(null);
  const [successMessage, setSuccessMessage] = useState(null);

  // Form states
  const [age, setAge] = useState(25);
  const [gender, setGender] = useState('MALE');
  const [height, setHeight] = useState(170);
  const [weight, setWeight] = useState(65);
  const [targetWeight, setTargetWeight] = useState(60);
  const [targetDate, setTargetDate] = useState('');
  const [fitnessGoal, setFitnessGoal] = useState('MAINTAIN_HEALTH');
  const [selectedEquipment, setSelectedEquipment] = useState(['Bodyweight']);
  const [selectedLimitations, setSelectedLimitations] = useState([]);
  const [customLimitation, setCustomLimitation] = useState('');

  // Equipment options dynamic state
  const [equipmentOptions, setEquipmentOptions] = useState([]);

  // Fitness Goal options
  const goalOptions = [
    { id: 'LOSE_WEIGHT', name: 'ลดน้ำหนัก / ไขมัน', desc: 'เน้นคาร์ดิโอและการเผาผลาญพลังงานเพื่อควบคุมน้ำหนัก', icon: '🔥' },
    { id: 'GAIN_MUSCLE', name: 'สร้างกล้ามเนื้อ', desc: 'เน้นเวทเทรนนิ่งเพื่อเพิ่มมวลกล้ามเนื้อและความแข็งแรง', icon: '💪' },
    { id: 'IMPROVE_ENDURANCE', name: 'พัฒนาความทนทาน', desc: 'เสริมความแข็งแกร่งของหัวใจ ปอด และการทำงานต่อเนื่อง', icon: '👟' },
    { id: 'MAINTAIN_HEALTH', name: 'รักษาสุขภาพองค์รวม', desc: 'ออกกำลังกายระดับปานกลางเพื่อรักษาความกระฉับกระเฉงและสุขภาพที่ดี', icon: '🌱' }
  ];

  // Common limitations options
  const limitationOptions = [
    { id: 'Knee Pain', name: 'เจ็บหัวเข่า (Knee Pain)', desc: 'เลี่ยงท่ากระโดดหรือแรงกระแทกสูง' },
    { id: 'Lower Back Pain', name: 'ปวดหลังส่วนล่าง (Lower Back Pain)', desc: 'เลี่ยงการบิดตัวหนักหรือยกน้ำหนักกดกระดูกสันหลัง' },
    { id: 'Shoulder Injury', name: 'บาดเจ็บหัวไหล่ (Shoulder Injury)', desc: 'เลี่ยงท่าออกกำลังกายเหนือศีรษะ' },
    { id: 'Ankle Instability', name: 'ข้อเท้าไม่แข็งแรง (Ankle Instability)', desc: 'ต้องการการรองรับหรือเลี่ยงพื้นผิวต่างระดับ' }
  ];

  // Helper to set quick target dates
  const handleSetTargetMonths = (months) => {
    const d = new Date();
    d.setMonth(d.getMonth() + months);
    setTargetDate(d.toISOString().split('T')[0]);
  };

  // Load existing profile and equipments from backend
  useEffect(() => {
    async function loadData() {
      if (!userToken) return;
      setIsLoading(true);
      setError(null);
      try {
        // 1. Fetch Equipments
        const equips = await profileDataSource.getEquipments(userToken);
        setEquipmentOptions(equips || []);

        // 2. Fetch Profile
        const profile = await profileDataSource.getUserProfile(userToken);
        if (profile) {
          if (profile.age) setAge(profile.age);
          if (profile.gender) setGender(profile.gender);
          if (profile.height) setHeight(profile.height);
          if (profile.weight) setWeight(profile.weight);
          if (profile.targetWeight) {
            setTargetWeight(profile.targetWeight);
          } else if (profile.weight) {
            setTargetWeight(profile.weight);
          }
          if (profile.targetDate) {
            setTargetDate(profile.targetDate.split('T')[0]);
          } else {
            // Default 6 months timeline if not set
            const d = new Date();
            d.setMonth(d.getMonth() + 6);
            setTargetDate(d.toISOString().split('T')[0]);
          }
          if (profile.fitnessGoal) setFitnessGoal(profile.fitnessGoal);
          if (profile.equipmentOwned && profile.equipmentOwned.length > 0) {
            setSelectedEquipment(profile.equipmentOwned);
          }
          if (profile.physicalLimitations) {
            setSelectedLimitations(profile.physicalLimitations);
          }
        }
      } catch (err) {
        console.error("Load profile data error:", err);
        setError("ไม่สามารถโหลดข้อมูลประวัติสุขภาพจากเซิร์ฟเวอร์ได้");
      } finally {
        setIsLoading(false);
      }
    }

    loadData();
  }, [userToken]);

  const handleEquipmentToggle = (name) => {
    if (selectedEquipment.includes(name)) {
      setSelectedEquipment(selectedEquipment.filter(item => item !== name));
    } else {
      setSelectedEquipment([...selectedEquipment, name]);
    }
  };

  const handleLimitationToggle = (id) => {
    if (selectedLimitations.includes(id)) {
      setSelectedLimitations(selectedLimitations.filter(item => item !== id));
    } else {
      setSelectedLimitations([...selectedLimitations, id]);
    }
  };

  const handleAddCustomLimitation = (e) => {
    e.preventDefault();
    if (customLimitation.trim() && !selectedLimitations.includes(customLimitation.trim())) {
      setSelectedLimitations([...selectedLimitations, customLimitation.trim()]);
      setCustomLimitation('');
    }
  };

  const handleRemoveLimitation = (limitation) => {
    setSelectedLimitations(selectedLimitations.filter(item => item !== limitation));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsSaving(true);
    setError(null);
    setSuccessMessage(null);

    const payload = {
      age: Number.parseInt(age, 10) || 0,
      gender: gender,
      height: Number.parseFloat(height) || 0,
      weight: Number.parseFloat(weight) || 0,
      targetWeight: Number.parseFloat(targetWeight) || 0,
      targetDate: targetDate || null,
      fitnessGoal: fitnessGoal,
      equipmentOwned: selectedEquipment,
      physicalLimitations: selectedLimitations
    };

    try {
      const updatedProfile = await profileDataSource.updateUserProfile(payload, userToken);
      setSuccessMessage("บันทึกข้อมูลสุขภาพและเป้าหมายของคุณสำเร็จแล้ว!");
      if (onProfileUpdateSuccess) {
        onProfileUpdateSuccess(updatedProfile);
      }
      setTimeout(() => {
        onBackToDashboard();
      }, 1500);
    } catch (err) {
      console.error("Save profile error:", err);
      setError(err.message || "เกิดข้อผิดพลาดในการบันทึกข้อมูล");
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div style={{
      maxWidth: '800px',
      margin: '0 auto',
      padding: '40px 20px',
      textAlign: 'left'
    }} className="animate-slide-up">
      {/* Header Navigation */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '32px' }}>
        <button 
          onClick={onBackToDashboard}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            background: 'none',
            border: 'none',
            color: 'var(--text-muted)',
            cursor: 'pointer',
            fontSize: '15px',
            fontWeight: '600'
          }}
        >
          <ArrowLeft size={18} />
          <span>ย้อนกลับไปที่ Dashboard</span>
        </button>
        <span style={{ fontSize: '13px', color: 'var(--primary)', fontWeight: '700', textTransform: 'uppercase', letterSpacing: '1px' }}>
          Health Settings
        </span>
      </div>

      <div style={{ marginBottom: '40px' }}>
        <h1 style={{ fontSize: '32px', fontWeight: '800', color: 'var(--text-dark)', marginBottom: '8px' }}>
          ข้อมูลสุขภาพและโปรไฟล์ของคุณ 🩺
        </h1>
        <p style={{ color: 'var(--text-muted)', fontSize: '16px' }}>
          กรุณากรอกข้อมูลสุขภาพของท่านตามจริง เพื่อให้ AI Mentor นำไปใช้ออกแบบและวางแผนการออกกำลังกายที่ตรงจุด ปลอดภัย และมีประสิทธิภาพสูงสุด
        </p>
      </div>

      {error && (
        <div style={{
          background: '#fef2f2',
          border: '1px solid #fca5a5',
          borderRadius: 'var(--radius-sm)',
          padding: '16px',
          marginBottom: '24px',
          color: '#b91c1c',
          display: 'flex',
          alignItems: 'center',
          gap: '10px',
          fontSize: '15px'
        }}>
          <AlertCircle size={20} />
          <span>{error}</span>
        </div>
      )}

      {successMessage && (
        <div style={{
          background: '#f0fdf4',
          border: '1px solid #86efac',
          borderRadius: 'var(--radius-sm)',
          padding: '16px',
          marginBottom: '24px',
          color: '#15803d',
          display: 'flex',
          alignItems: 'center',
          gap: '10px',
          fontSize: '15px'
        }}>
          <Check size={20} />
          <span>{successMessage}</span>
        </div>
      )}

      {isLoading ? (
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '12px', padding: '60px 0' }}>
          <div className="spinner" style={{
            width: '40px',
            height: '40px',
            border: '4px solid #e2e8f0',
            borderTop: '4px solid var(--primary)',
            borderRadius: '50%',
            animation: 'spin 1s linear infinite'
          }}></div>
          <span style={{ color: 'var(--text-muted)', fontSize: '15px' }}>กำลังดึงข้อมูลสุขภาพจากระบบ...</span>
        </div>
      ) : (
        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '32px' }}>
          
          {/* Section 1: Basic Body Info & Weight Target Timeline */}
          <div style={{
            background: '#ffffff',
            border: '1px solid var(--border-color)',
            borderRadius: 'var(--radius-md)',
            padding: '28px',
            boxShadow: 'var(--shadow-sm)'
          }}>
            <h3 style={{ fontSize: '18px', fontWeight: '700', color: 'var(--text-dark)', marginBottom: '20px', borderBottom: '1px solid #edf2f7', paddingBottom: '12px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <span>1. ข้อมูลสัดส่วนร่างกายและเป้าหมายน้ำหนัก</span>
              <span style={{ fontSize: '12px', fontWeight: '600', color: '#10b981', background: '#ecfdf5', padding: '4px 10px', borderRadius: '12px' }}>
                🎯 กำหนดเป้าหมายและระยะเวลาชัดเจน
              </span>
            </h3>
            
            {/* Row 1: Basic Biometrics */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '16px', marginBottom: '20px' }}>
              <div>
                <label style={{ display: 'block', fontSize: '13px', fontWeight: '600', color: 'var(--text-dark)', marginBottom: '8px' }}>
                  อายุ (ปี)
                </label>
                <input 
                  type="number" 
                  min={1} 
                  max={120}
                  required
                  value={age}
                  onChange={(e) => setAge(e.target.value)}
                  style={{
                    width: '100%',
                    padding: '10px 14px',
                    borderRadius: 'var(--radius-sm)',
                    border: '1px solid #cbd5e1',
                    fontSize: '15px',
                    outline: 'none'
                  }}
                />
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '13px', fontWeight: '600', color: 'var(--text-dark)', marginBottom: '8px' }}>
                  เพศ
                </label>
                <select 
                  value={gender} 
                  onChange={(e) => setGender(e.target.value)}
                  style={{
                    width: '100%',
                    padding: '10px 14px',
                    borderRadius: 'var(--radius-sm)',
                    border: '1px solid #cbd5e1',
                    fontSize: '15px',
                    outline: 'none'
                  }}
                >
                  <option value="MALE">ชาย (Male)</option>
                  <option value="FEMALE">หญิง (Female)</option>
                  <option value="OTHER">อื่นๆ (Other)</option>
                </select>
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '13px', fontWeight: '600', color: 'var(--text-dark)', marginBottom: '8px' }}>
                  ส่วนสูง (ซม.)
                </label>
                <div style={{ position: 'relative' }}>
                  <input 
                    type="number" 
                    min={50} 
                    max={250}
                    step="0.1"
                    required
                    value={height}
                    onChange={(e) => setHeight(e.target.value)}
                    style={{
                      width: '100%',
                      padding: '10px 14px',
                      borderRadius: 'var(--radius-sm)',
                      border: '1px solid #cbd5e1',
                      fontSize: '15px',
                      outline: 'none'
                    }}
                  />
                  <Ruler size={16} color="#94a3b8" style={{ position: 'absolute', right: '14px', top: '13px' }} />
                </div>
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '13px', fontWeight: '600', color: 'var(--text-dark)', marginBottom: '8px' }}>
                  น้ำหนักปัจจุบัน (กก.)
                </label>
                <div style={{ position: 'relative' }}>
                  <input 
                    type="number" 
                    min={10} 
                    max={300}
                    step="0.1"
                    required
                    value={weight}
                    onChange={(e) => setWeight(e.target.value)}
                    style={{
                      width: '100%',
                      padding: '10px 14px',
                      borderRadius: 'var(--radius-sm)',
                      border: '1px solid #cbd5e1',
                      fontSize: '15px',
                      outline: 'none'
                    }}
                  />
                  <Weight size={16} color="#94a3b8" style={{ position: 'absolute', right: '14px', top: '13px' }} />
                </div>
              </div>
            </div>

            {/* Row 2: Target Weight & Target Timeline Date */}
            <div style={{
              background: '#f8fafc',
              border: '1px solid #e2e8f0',
              borderRadius: '12px',
              padding: '18px 20px',
              display: 'grid',
              gridTemplateColumns: '1fr 1.6fr',
              gap: '20px',
              alignItems: 'start'
            }}>
              <div>
                <label style={{ display: 'block', fontSize: '13px', fontWeight: '700', color: '#047857', marginBottom: '8px' }}>
                  🎯 น้ำหนักเป้าหมายที่คุณต้องการ (กก.)
                </label>
                <div style={{ position: 'relative' }}>
                  <input 
                    type="number" 
                    min={10} 
                    max={300}
                    step="0.1"
                    required
                    value={targetWeight}
                    onChange={(e) => setTargetWeight(e.target.value)}
                    placeholder="เช่น 75"
                    style={{
                      width: '100%',
                      padding: '10px 14px',
                      borderRadius: 'var(--radius-sm)',
                      border: '2px solid #10b981',
                      background: '#ffffff',
                      fontSize: '15px',
                      fontWeight: '700',
                      color: '#065f46',
                      outline: 'none'
                    }}
                  />
                  <Target size={16} color="#059669" style={{ position: 'absolute', right: '14px', top: '13px' }} />
                </div>
              </div>

              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                  <label style={{ fontSize: '13px', fontWeight: '700', color: '#0369a1' }}>
                    📅 วันที่เป้าหมายที่จะบรรลุ (Target Timeline)
                  </label>
                  <span style={{ fontSize: '11px', color: '#64748b' }}>เลือกปุ่มด่วนด้านล่าง</span>
                </div>
                
                <div style={{ display: 'flex', gap: '8px', alignItems: 'center', flexWrap: 'wrap' }}>
                  <div style={{ position: 'relative', flex: 1, minWidth: '160px' }}>
                    <input 
                      type="date"
                      value={targetDate}
                      onChange={(e) => setTargetDate(e.target.value)}
                      required
                      style={{
                        width: '100%',
                        padding: '9px 12px',
                        borderRadius: 'var(--radius-sm)',
                        border: '2px solid #0284c7',
                        background: '#ffffff',
                        fontSize: '14px',
                        fontWeight: '600',
                        color: '#0369a1',
                        outline: 'none'
                      }}
                    />
                  </div>

                  {/* Quick Timeline Preset Buttons */}
                  <div style={{ display: 'flex', gap: '6px' }}>
                    {[
                      { label: '+1 เดือน', months: 1 },
                      { label: '+3 เดือน', months: 3 },
                      { label: '+6 เดือน', months: 6 },
                      { label: '+1 ปี', months: 12 },
                    ].map(preset => (
                      <button
                        key={preset.months}
                        type="button"
                        onClick={() => handleSetTargetMonths(preset.months)}
                        style={{
                          padding: '6px 10px',
                          fontSize: '11.5px',
                          fontWeight: '700',
                          background: '#e0f2fe',
                          color: '#0369a1',
                          border: '1px solid #bae6fd',
                          borderRadius: '6px',
                          cursor: 'pointer',
                          transition: 'all 0.15s',
                          whiteSpace: 'nowrap'
                        }}
                      >
                        {preset.label}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            </div>

            {/* Target Weight & Timeline Real-time Summary Card */}
            {(() => {
              const currentW = Number.parseFloat(weight) || 0;
              const targetW = Number.parseFloat(targetWeight) || 0;
              if (currentW <= 0 || targetW <= 0) return null;

              const diff = currentW - targetW;
              const isLosing = diff > 0;
              const isGaining = diff < 0;
              const isMaintaining = diff === 0;

              // Timeline calculations
              let daysRemaining = 0;
              let monthsRemaining = 0;
              let pacePerWeek = 0;
              let targetDateFormatted = '';

              if (targetDate) {
                const targetObj = new Date(targetDate);
                const now = new Date();
                const diffMs = targetObj.getTime() - now.getTime();
                if (diffMs > 0) {
                  daysRemaining = Math.ceil(diffMs / (1000 * 60 * 60 * 24));
                  const weeksRemaining = daysRemaining / 7;
                  monthsRemaining = daysRemaining / 30.4;
                  if (weeksRemaining > 0) {
                    pacePerWeek = Math.abs(diff) / weeksRemaining;
                  }
                  targetDateFormatted = targetObj.toLocaleDateString('th-TH', { day: 'numeric', month: 'short', year: 'numeric' });
                }
              }

              // Pace safety status
              let paceStatus = 'SAFE'; // SAFE, CHALLENGING, AGGRESSIVE
              if (pacePerWeek > 1.5) {
                paceStatus = 'AGGRESSIVE';
              } else if (pacePerWeek > 1.0) {
                paceStatus = 'CHALLENGING';
              }

              return (
                <div style={{
                  marginTop: '20px',
                  padding: '16px 20px',
                  borderRadius: '12px',
                  background: isLosing ? 'linear-gradient(135deg, #ecfdf5 0%, #f0fdf4 100%)' : (isGaining ? 'linear-gradient(135deg, #eff6ff 0%, #f0f9ff 100%)' : '#f8fafc'),
                  border: isLosing ? '1.5px solid #a7f3d0' : (isGaining ? '1.5px solid #bfdbfe' : '1px solid #e2e8f0'),
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '12px'
                }}>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '10px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                      <div style={{
                        width: '38px',
                        height: '38px',
                        borderRadius: '50%',
                        background: isLosing ? '#10b981' : (isGaining ? '#3b82f6' : '#64748b'),
                        color: 'white',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        flexShrink: 0
                      }}>
                        {isLosing ? <Flame size={22} /> : (isGaining ? <Dumbbell size={20} /> : <Target size={20} />)}
                      </div>
                      <div>
                        <strong style={{ fontSize: '15px', color: isLosing ? '#065f46' : (isGaining ? '#1e40af' : '#334155'), display: 'block' }}>
                          {isLosing && `🔥 เป้าหมาย: ลดน้ำหนัก ${diff.toFixed(1)} กก. (จาก ${currentW} เหลือ ${targetW} กก.)`}
                          {isGaining && `💪 เป้าหมาย: เพิ่มน้ำหนัก/กล้ามเนื้อ +${Math.abs(diff).toFixed(1)} กก. (จาก ${currentW} มุ่งสู่ ${targetW} กก.)`}
                          {isMaintaining && `🌱 เป้าหมาย: รักษาน้ำหนักให้คงที่ (${currentW} กก.)`}
                        </strong>
                        {targetDateFormatted && (
                          <span style={{ fontSize: '12.5px', color: '#0369a1', fontWeight: '600', display: 'flex', alignItems: 'center', gap: '4px', marginTop: '2px' }}>
                            <Clock size={13} /> กำหนดเวลาบรรลุ: ภายใน {targetDateFormatted} (อีกประมาณ {Math.round(monthsRemaining)} เดือน / {daysRemaining} วัน)
                          </span>
                        )}
                      </div>
                    </div>

                    {pacePerWeek > 0 && isLosing && (
                      <div style={{
                        textAlign: 'right',
                        background: 'white',
                        padding: '8px 14px',
                        borderRadius: '10px',
                        border: '1px solid rgba(0,0,0,0.06)',
                        boxShadow: '0 1px 4px rgba(0,0,0,0.04)'
                      }}>
                        <div style={{ fontSize: '11px', color: '#64748b', fontWeight: '600' }}>อัตราการลดที่ต้องทำ</div>
                        <div style={{ fontSize: '15px', fontWeight: '800', color: paceStatus === 'AGGRESSIVE' ? '#dc2626' : (paceStatus === 'CHALLENGING' ? '#d97706' : '#059669') }}>
                          ~{pacePerWeek.toFixed(2)} <span style={{ fontSize: '11px', fontWeight: 'normal' }}>กก./สัปดาห์</span>
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Pace Evaluation Hint Banner */}
                  {pacePerWeek > 0 && isLosing && (
                    <div style={{
                      background: paceStatus === 'AGGRESSIVE' ? '#fef2f2' : (paceStatus === 'CHALLENGING' ? '#fffbeb' : '#f0fdf4'),
                      border: paceStatus === 'AGGRESSIVE' ? '1px solid #fecaca' : (paceStatus === 'CHALLENGING' ? '1px solid #fde68a' : '1px solid #bbf7d0'),
                      borderRadius: '8px',
                      padding: '8px 12px',
                      fontSize: '12px',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '8px',
                      color: paceStatus === 'AGGRESSIVE' ? '#991b1b' : (paceStatus === 'CHALLENGING' ? '#92400e' : '#166534')
                    }}>
                      <Zap size={14} />
                      <span>
                        {paceStatus === 'SAFE' && '🟢 อัตรานี้อยู่ในเกณฑ์มาตรฐานที่แพทย์และผู้เชี่ยวชาญแนะนำ (0.5 - 1.0 กก./สัปดาห์) สุขภาพดี ยั่งยืน และไม่โยโย่'}
                        {paceStatus === 'CHALLENGING' && '🟡 อัตรานี้ค่อนข้างท้าทาย ต้องอาศัยวินัยในการคุมแคลอรี่และการออกกำลังกายสม่ำเสมอ'}
                        {paceStatus === 'AGGRESSIVE' && '🔴 อัตรานี้เร็วเกินไป (มากกว่า 1.5 กก./สัปดาห์) อาจส่งผลเสียต่อสุขภาพและสูญเสียมวลกล้ามเนื้อ แนะนำให้เพิ่มระยะเวลาเป้าหมาย'}
                      </span>
                    </div>
                  )}
                </div>
              );
            })()}
          </div>

          {/* Section 2: Fitness Goals */}
          <div style={{
            background: '#ffffff',
            border: '1px solid var(--border-color)',
            borderRadius: 'var(--radius-md)',
            padding: '28px',
            boxShadow: 'var(--shadow-sm)'
          }}>
            <h3 style={{ fontSize: '18px', fontWeight: '700', color: 'var(--text-dark)', marginBottom: '8px', borderBottom: '1px solid #edf2f7', paddingBottom: '12px' }}>
              2. เป้าหมายการออกกำลังกาย
            </h3>
            <p style={{ color: 'var(--text-muted)', fontSize: '13px', marginBottom: '20px' }}>
              เลือกเป้าหมายที่ตรงกับความก้าวหน้าและการพัฒนาร่างกายที่คุณมุ่งหวังในขณะนี้
            </p>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
              {goalOptions.map(goal => {
                const isSelected = fitnessGoal === goal.id;
                return (
                  <button
                    type="button"
                    key={goal.id}
                    onClick={() => setFitnessGoal(goal.id)}
                    style={{
                      border: `2px solid ${isSelected ? 'var(--primary)' : '#e2e8f0'}`,
                      background: isSelected ? 'var(--primary-light)' : '#ffffff',
                      borderRadius: 'var(--radius-sm)',
                      padding: '18px',
                      cursor: 'pointer',
                      display: 'flex',
                      gap: '16px',
                      transition: 'var(--transition)',
                      textAlign: 'left',
                      width: '100%'
                    }}
                  >
                    <span style={{ fontSize: '28px', display: 'flex', alignItems: 'center' }}>{goal.icon}</span>
                    <div>
                      <h4 style={{ 
                        fontSize: '15px', 
                        fontWeight: '700', 
                        color: isSelected ? 'var(--primary-hover)' : 'var(--text-dark)', 
                        marginBottom: '4px' 
                      }}>
                        {goal.name}
                      </h4>
                      <p style={{ fontSize: '12px', color: 'var(--text-muted)', lineHeight: '1.4' }}>
                        {goal.desc}
                      </p>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Section 3: Equipment Owned */}
          <div style={{
            background: '#ffffff',
            border: '1px solid var(--border-color)',
            borderRadius: 'var(--radius-md)',
            padding: '28px',
            boxShadow: 'var(--shadow-sm)'
          }}>
            <h3 style={{ fontSize: '18px', fontWeight: '700', color: 'var(--text-dark)', marginBottom: '8px', borderBottom: '1px solid #edf2f7', paddingBottom: '12px' }}>
              3. อุปกรณ์ออกกำลังกายที่คุณมี
            </h3>
            <p style={{ color: 'var(--text-muted)', fontSize: '13px', marginBottom: '20px' }}>
              ติ๊กเลือกอุปกรณ์ที่คุณมีอยู่ที่บ้านหรือพร้อมใช้งาน เพื่อให้ AI คัดเลือกท่าวอร์มและสร้างโปรแกรมการฝึกที่เหมาะสม
            </p>

            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '12px' }}>
              {equipmentOptions.map(eq => {
                const isSelected = selectedEquipment.includes(eq.name);
                return (
                  <button
                    type="button"
                    key={eq.equipmentId}
                    onClick={() => handleEquipmentToggle(eq.name)}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '8px',
                      padding: '10px 16px',
                      borderRadius: 'var(--radius-full)',
                      border: `1px solid ${isSelected ? 'var(--primary)' : '#cbd5e1'}`,
                      background: isSelected ? 'var(--primary-light)' : '#ffffff',
                      color: isSelected ? 'var(--primary-hover)' : 'var(--text-dark)',
                      cursor: 'pointer',
                      fontWeight: '600',
                      fontSize: '14px',
                      transition: 'var(--transition)'
                    }}
                  >
                    <span>{eq.icon}</span>
                    <span>{eq.displayName || eq.name}</span>
                    {isSelected && <Check size={14} style={{ marginLeft: '4px' }} />}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Section 4: Physical Limitations */}
          <div style={{
            background: '#ffffff',
            border: '1px solid var(--border-color)',
            borderRadius: 'var(--radius-md)',
            padding: '28px',
            boxShadow: 'var(--shadow-sm)'
          }}>
            <h3 style={{ fontSize: '18px', fontWeight: '700', color: 'var(--text-dark)', marginBottom: '8px', borderBottom: '1px solid #edf2f7', paddingBottom: '12px' }}>
              4. ข้อจำกัดทางร่างกาย / อาการบาดเจ็บ
            </h3>
            <p style={{ color: 'var(--text-muted)', fontSize: '13px', marginBottom: '20px' }}>
              (ไม่บังคับ) หากคุณมีจุดที่บาดเจ็บหรือต้องระวังเป็นพิเศษ โปรดระบุเพื่อให้ AI ช่วยหลีกเลี่ยงการแนะนำท่าที่อาจเป็นอันตราย
            </p>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginBottom: '20px' }}>
              {limitationOptions.map(lim => {
                const isSelected = selectedLimitations.includes(lim.id);
                return (
                  <button
                    type="button"
                    key={lim.id}
                    onClick={() => handleLimitationToggle(lim.id)}
                    style={{
                      border: `1px solid ${isSelected ? '#e53e3e' : '#cbd5e1'}`,
                      background: isSelected ? '#fff5f5' : '#ffffff',
                      borderRadius: 'var(--radius-sm)',
                      padding: '14px',
                      cursor: 'pointer',
                      display: 'flex',
                      flexDirection: 'column',
                      gap: '4px',
                      transition: 'var(--transition)',
                      textAlign: 'left',
                      width: '100%'
                    }}
                  >
                    <span style={{ 
                      fontSize: '14px', 
                      fontWeight: '700', 
                      color: isSelected ? '#c53030' : 'var(--text-dark)'
                    }}>
                      {lim.name}
                    </span>
                    <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>
                      {lim.desc}
                    </span>
                  </button>
                );
              })}
            </div>

            {/* Custom Limitation Add */}
            <div style={{ borderTop: '1px solid #edf2f7', paddingTop: '20px' }}>
              <label style={{ display: 'block', fontSize: '13px', fontWeight: '600', color: 'var(--text-dark)', marginBottom: '8px' }}>
                ระบุข้อจำกัดเพิ่มเติมอื่นๆ ของตนเอง
              </label>
              <div style={{ display: 'flex', gap: '10px' }}>
                <input 
                  type="text" 
                  placeholder="เช่น ปวดข้อมือซ้าย, เพิ่งผ่าคลอดมา 3 เดือน, โรคความดันโลหิตสูง" 
                  value={customLimitation}
                  onChange={(e) => setCustomLimitation(e.target.value)}
                  style={{
                    flex: 1,
                    padding: '10px 14px',
                    borderRadius: 'var(--radius-sm)',
                    border: '1px solid #cbd5e1',
                    fontSize: '14px',
                    outline: 'none'
                  }}
                />
                <button 
                  type="button"
                  onClick={handleAddCustomLimitation}
                  className="btn btn-outline"
                  style={{ padding: '10px 20px', fontSize: '13px', whiteSpace: 'nowrap' }}
                >
                  + เพิ่มข้อจำกัด
                </button>
              </div>

              {/* Selected Limitations Badges */}
              {selectedLimitations.length > 0 && (
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px', marginTop: '16px' }}>
                  {selectedLimitations.map((lim, idx) => (
                    <span 
                      key={`lim-badge-${lim || idx}`}
                      style={{
                        background: '#fee2e2',
                        color: '#991b1b',
                        padding: '6px 12px',
                        borderRadius: 'var(--radius-full)',
                        fontSize: '12px',
                        fontWeight: '600',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '6px'
                      }}
                    >
                      {lim}
                      <button 
                        type="button" 
                        onClick={() => handleRemoveLimitation(lim)}
                        style={{
                          background: 'none',
                          border: 'none',
                          color: '#991b1b',
                          cursor: 'pointer',
                          fontWeight: 'bold',
                          padding: 0,
                          fontSize: '10px',
                          display: 'flex',
                          alignItems: 'center'
                        }}
                      >
                        ✕
                      </button>
                    </span>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Form Actions */}
          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '16px', marginTop: '16px' }}>
            <button 
              type="button" 
              onClick={onBackToDashboard}
              className="btn btn-outline"
              style={{ padding: '14px 28px', fontSize: '15px' }}
              disabled={isSaving}
            >
              ยกเลิก
            </button>
            <button 
              type="submit" 
              className="btn btn-primary"
              style={{ 
                padding: '14px 36px', 
                fontSize: '15px', 
                display: 'flex', 
                alignItems: 'center', 
                gap: '8px',
                background: 'var(--primary)'
              }}
              disabled={isSaving}
            >
              {isSaving ? (
                <>
                  <div className="spinner" style={{
                    width: '18px',
                    height: '18px',
                    border: '2px solid rgba(255,255,255,0.3)',
                    borderTop: '2px solid white',
                    borderRadius: '50%',
                    animation: 'spin 1s linear infinite'
                  }}></div>
                  <span>กำลังบันทึก...</span>
                </>
              ) : (
                <>
                  <Save size={18} />
                  <span>บันทึกประวัติสุขภาพ</span>
                </>
              )}
            </button>
          </div>

        </form>
      )}
    </div>
  );
}
