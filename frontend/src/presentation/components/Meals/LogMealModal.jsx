import { Bot, Sparkles, CheckCircle, Check, X, Utensils, ChefHat, Camera } from 'lucide-react';

export const LogMealModal = ({ handleAnalyzeMealPreview, handleAnalyzePhoto, handlePhotoFileSelect, handleSaveMeal, isAnalyzingMeal, isAnalyzingPhoto, isSavingMeal, mealAnalysisPreview, mealForm, mealModalMode, photoPreview, setMealForm, setMealModalMode, setPhotoBase64, setPhotoPreview, setShowLogMealModal }) => (
  <div style={{
    position: 'fixed',
    inset: 0,
    background: 'rgba(15, 23, 42, 0.65)',
    backdropFilter: 'blur(4px)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 9999,
    padding: '20px'
  }}>
    <div style={{
      background: '#ffffff',
      borderRadius: '16px',
      width: '100%',
      maxWidth: '580px',
      padding: '26px',
      boxShadow: '0 20px 25px -5px rgba(0,0,0,0.1), 0 10px 10px -5px rgba(0,0,0,0.04)',
      textAlign: 'left',
      maxHeight: '90vh',
      overflowY: 'auto'
    }} className="animate-slide-up">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px', borderBottom: '1px solid #f1f5f9', paddingBottom: '12px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <div style={{ width: '40px', height: '40px', borderRadius: '10px', background: '#ecfdf5', color: '#059669', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <Utensils size={22} />
          </div>
          <div>
            <h3 style={{ fontSize: '18px', fontWeight: '800', color: '#0f172a', margin: 0 }}>
              บันทึกมื้ออาหาร & วิเคราะห์ด้วย AI
            </h3>
            <span style={{ fontSize: '12px', color: '#64748b' }}>AI จะคำนวณแคลอรี่ โปรตีน คาร์บ และไขมันให้อัตโนมัติ</span>
          </div>
        </div>
        <button
          type="button"
          onClick={() => setShowLogMealModal(false)}
          style={{ background: 'transparent', border: 'none', color: '#94a3b8', cursor: 'pointer', padding: '4px' }}
        >
          <X size={20} />
        </button>
      </div>

      {/* Mode Toggle Tabs: Text vs. Photo Scanner */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px', marginBottom: '18px', background: '#f1f5f9', padding: '4px', borderRadius: '10px' }}>
        <button
          type="button"
          onClick={() => setMealModalMode('text')}
          style={{
            padding: '9px',
            borderRadius: '8px',
            border: 'none',
            background: mealModalMode === 'text' ? '#ffffff' : 'transparent',
            color: mealModalMode === 'text' ? '#0f172a' : '#64748b',
            fontWeight: '700',
            fontSize: '13px',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '6px',
            boxShadow: mealModalMode === 'text' ? '0 2px 4px rgba(0,0,0,0.06)' : 'none',
            transition: 'all 0.2s'
          }}
        >
          <ChefHat size={16} color={mealModalMode === 'text' ? '#10b981' : '#64748b'} />
          <span>พิมพ์ชื่ออาหาร (Text)</span>
        </button>
        <button
          type="button"
          onClick={() => setMealModalMode('photo')}
          style={{
            padding: '9px',
            borderRadius: '8px',
            border: 'none',
            background: mealModalMode === 'photo' ? '#ffffff' : 'transparent',
            color: mealModalMode === 'photo' ? '#0f172a' : '#64748b',
            fontWeight: '700',
            fontSize: '13px',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '6px',
            boxShadow: mealModalMode === 'photo' ? '0 2px 4px rgba(0,0,0,0.06)' : 'none',
            transition: 'all 0.2s'
          }}
        >
          <Camera size={16} color={mealModalMode === 'photo' ? '#3b82f6' : '#64748b'} />
          <span>📸 ถ่ายรูป/สแกนภาพ (AI Vision)</span>
        </button>
      </div>

      <form onSubmit={handleSaveMeal} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
        {/* Meal Type Selector */}
        <div>
          <label style={{ display: 'block', fontSize: '12px', fontWeight: '700', color: '#334155', marginBottom: '6px' }}>
            ประเภทมื้ออาหาร
          </label>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '8px' }}>
            {[
              { id: 'BREAKFAST', label: 'มื้อเช้า', icon: '🍳' },
              { id: 'LUNCH', label: 'มื้อกลางวัน', icon: '🍱' },
              { id: 'DINNER', label: 'มื้อเย็น', icon: '🍲' },
              { id: 'SNACK', label: 'ของว่าง', icon: '🍎' }
            ].map(type => {
              const isSelected = mealForm.mealType === type.id;
              return (
                <button
                  key={type.id}
                  type="button"
                  onClick={() => setMealForm({ ...mealForm, mealType: type.id })}
                  style={{
                    padding: '8px 4px',
                    borderRadius: '8px',
                    border: `2px solid ${isSelected ? '#10b981' : '#e2e8f0'}`,
                    background: isSelected ? '#ecfdf5' : '#ffffff',
                    color: isSelected ? '#065f46' : '#475569',
                    fontWeight: '700',
                    fontSize: '12px',
                    cursor: 'pointer',
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    gap: '3px',
                    transition: 'all 0.15s'
                  }}
                >
                  <span style={{ fontSize: '16px' }}>{type.icon}</span>
                  <span>{type.label}</span>
                </button>
              );
            })}
          </div>
        </div>

        {/* MODE 1: PHOTO SCANNER */}
        {mealModalMode === 'photo' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            <label style={{ display: 'block', fontSize: '12.5px', fontWeight: '700', color: '#334155' }}>
              อัปโหลดหรือถ่ายภาพจานอาหาร
            </label>

            {!photoPreview ? (
              <label style={{
                border: '2px dashed #93c5fd',
                background: '#eff6ff',
                borderRadius: '12px',
                padding: '30px 20px',
                textAlign: 'center',
                cursor: 'pointer',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                gap: '8px',
                transition: 'all 0.2s'
              }}>
                <input
                  type="file"
                  accept="image/*"
                  onChange={handlePhotoFileSelect}
                  style={{ display: 'none' }}
                />
                <div style={{ width: '48px', height: '48px', borderRadius: '50%', background: '#dbeafe', color: '#2563eb', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <Camera size={24} />
                </div>
                <div>
                  <strong style={{ fontSize: '14px', color: '#1e40af', display: 'block' }}>คลิกเพื่อเลือกภาพ หรือถ่ายภาพอาหาร</strong>
                  <span style={{ fontSize: '11.5px', color: '#64748b' }}>รองรับไฟล์ JPG, PNG, WebP (AI จะตรวจจับวัตถุดิบและสัดส่วนให้)</span>
                </div>
              </label>
            ) : (
              <div style={{ position: 'relative', borderRadius: '12px', overflow: 'hidden', border: '2px solid #3b82f6', background: '#0f172a' }}>
                {isAnalyzingPhoto && <div className="scanner-laser"></div>}
                <img
                  src={photoPreview}
                  alt="Meal Preview"
                  style={{ width: '100%', maxHeight: '240px', objectFit: 'cover', display: 'block', opacity: isAnalyzingPhoto ? 0.7 : 1 }}
                />
                <button
                  type="button"
                  onClick={() => { setPhotoPreview(null); setPhotoBase64(''); }}
                  style={{
                    position: 'absolute',
                    top: '10px',
                    right: '10px',
                    background: 'rgba(15, 23, 42, 0.75)',
                    color: 'white',
                    border: 'none',
                    borderRadius: '50%',
                    width: '28px',
                    height: '28px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    cursor: 'pointer'
                  }}
                >
                  <X size={16} />
                </button>
                <div style={{ position: 'absolute', bottom: '8px', left: '10px', background: 'rgba(0,0,0,0.65)', color: '#38bdf8', padding: '3px 8px', borderRadius: '6px', fontSize: '11px', fontWeight: '700', display: 'flex', alignItems: 'center', gap: '4px' }}>
                  <Sparkles size={12} /> Gemini 1.5 Vision Ready
                </div>
              </div>
            )}

            {photoPreview && (
              <button
                type="button"
                onClick={handleAnalyzePhoto}
                disabled={isAnalyzingPhoto}
                style={{
                  width: '100%',
                  padding: '12px',
                  borderRadius: '10px',
                  background: 'linear-gradient(135deg, #2563eb 0%, #1d4ed8 100%)',
                  border: 'none',
                  color: 'white',
                  fontWeight: '700',
                  fontSize: '13.5px',
                  cursor: isAnalyzingPhoto ? 'not-allowed' : 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '8px',
                  boxShadow: '0 2px 8px rgba(37, 99, 235, 0.3)'
                }}
              >
                {isAnalyzingPhoto ? (
                  <>
                    <div className="spinner" style={{ width: '15px', height: '15px', border: '2px solid rgba(255,255,255,0.3)', borderTop: '2px solid white', borderRadius: '50%', animation: 'spin 0.8s linear infinite' }}></div>
                    <span>Gemini Vision กำลังสแกนอาหารในภาพ...</span>
                  </>
                ) : (
                  <>
                    <Sparkles size={16} />
                    <span>🔍 สแกนและวิเคราะห์คุณค่าอาหารจากภาพ (AI Vision)</span>
                  </>
                )}
              </button>
            )}
          </div>
        )}

        {/* MODE 2: TEXT INPUT */}
        {mealModalMode === 'text' && (
          <div>
            <label style={{ display: 'block', fontSize: '12.5px', fontWeight: '700', color: '#334155', marginBottom: '6px' }}>
              ชื่ออาหาร / เมนูที่รับประทาน <span style={{ color: '#ef4444' }}>*</span>
            </label>
            <textarea
              rows="2"
              required
              value={mealForm.mealDescription}
              onChange={(e) => setMealForm({ ...mealForm, mealDescription: e.target.value })}
              placeholder="เช่น ข้าวกะเพราอกไก่ไข่ดาวไม่น้ำมัน, สลัดทูน่า + ขนมปังโฮลวีท 2 แผ่น"
              style={{
                width: '100%',
                padding: '10px 14px',
                borderRadius: '8px',
                border: '1.5px solid #cbd5e1',
                fontSize: '14px',
                outline: 'none',
                resize: 'vertical'
              }}
            />

            {/* Quick Preset Buttons */}
            <div style={{ marginTop: '8px' }}>
              <span style={{ fontSize: '11px', color: '#64748b', display: 'block', marginBottom: '4px' }}>
                ⚡ เมนูตัวอย่างคลิกได้ทันที:
              </span>
              <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
                {[
                  'อกไก่ย่าง 200g + ข้าวกล้อง 1 ทัพพี',
                  'สเต็กแซลมอน + สลัดผักน้ำใส',
                  'ไข่ต้ม 2 ฟอง + กล้วยหอม 1 ลูก',
                  'ข้าวกะเพราอกไก่ไข่ดาว',
                  'เวย์โปรตีน 1 สกู๊ป + นมข้าวโอ๊ต'
                ].map(preset => (
                  <button
                    key={preset}
                    type="button"
                    onClick={() => setMealForm({ ...mealForm, mealDescription: preset })}
                    style={{
                      padding: '4px 10px',
                      fontSize: '11px',
                      background: '#f1f5f9',
                      color: '#334155',
                      border: '1px solid #e2e8f0',
                      borderRadius: '6px',
                      cursor: 'pointer',
                      transition: 'all 0.15s'
                    }}
                  >
                    {preset}
                  </button>
                ))}
              </div>
            </div>

            <button
              type="button"
              onClick={handleAnalyzeMealPreview}
              disabled={isAnalyzingMeal || !mealForm.mealDescription.trim()}
              style={{
                width: '100%',
                padding: '11px',
                borderRadius: '8px',
                background: 'linear-gradient(135deg, #3b82f6 0%, #2563eb 100%)',
                border: 'none',
                color: 'white',
                fontWeight: '700',
                fontSize: '13px',
                cursor: (isAnalyzingMeal || !mealForm.mealDescription.trim()) ? 'not-allowed' : 'pointer',
                opacity: (!mealForm.mealDescription.trim() && !isAnalyzingMeal) ? 0.6 : 1,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '6px',
                marginTop: '12px',
                boxShadow: '0 2px 6px rgba(37, 99, 235, 0.2)'
              }}
            >
              {isAnalyzingMeal ? (
                <>
                  <div className="spinner" style={{ width: '13px', height: '13px', border: '2px solid rgba(255,255,255,0.3)', borderTop: '2px solid white', borderRadius: '50%', animation: 'spin 0.8s linear infinite' }}></div>
                  <span>Gemini AI กำลังวิเคราะห์โภชนาการ...</span>
                </>
              ) : (
                <>
                  <Sparkles size={15} />
                  <span>🤖 ให้ AI คำนวณแคลอรี่และสารอาหาร (Analyze with Gemini)</span>
                </>
              )}
            </button>
          </div>
        )}

        {/* AI Processing Animation Banner when Loading */}
        {isAnalyzingMeal && (
          <div className="animate-pulse-glow" style={{
            background: 'linear-gradient(135deg, #eff6ff 0%, #f0fdf4 100%)',
            border: '1.5px solid #60a5fa',
            borderRadius: '12px',
            padding: '18px',
            display: 'flex',
            flexDirection: 'column',
            gap: '10px',
            textAlign: 'center'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}>
              <Bot size={22} color="#2563eb" style={{ animation: 'spin 3s linear infinite' }} />
              <strong style={{ fontSize: '14px', color: '#1e40af' }}>Gemini AI กำลังประมวลผลเมนูอาหารของคุณ...</strong>
            </div>

            <p style={{ fontSize: '12px', color: '#475569', margin: 0 }}>
              กำลังสืบค้นฐานข้อมูลโภชนาการ คำนวณพลังงาน (kcal) และสัดส่วนโปรตีน คาร์บ ไขมัน
            </p>

            {/* Animated Typing Dots */}
            <div style={{ display: 'flex', justifyContent: 'center', gap: '6px', marginTop: '4px' }}>
              <div className="typing-dot-1" style={{ width: '8px', height: '8px', borderRadius: '50%', background: '#3b82f6' }}></div>
              <div className="typing-dot-2" style={{ width: '8px', height: '8px', borderRadius: '50%', background: '#10b981' }}></div>
              <div className="typing-dot-3" style={{ width: '8px', height: '8px', borderRadius: '50%', background: '#3b82f6' }}></div>
            </div>
          </div>
        )}

        {/* AI Analysis Preview Result Card */}
        {mealAnalysisPreview && !isAnalyzingMeal && (
          <div className="animate-slide-up" style={{
            background: '#f0fdf4',
            border: '1.5px solid #a7f3d0',
            borderRadius: '12px',
            padding: '16px',
            display: 'flex',
            flexDirection: 'column',
            gap: '10px'
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div style={{ fontSize: '13px', fontWeight: '800', color: '#065f46', display: 'flex', alignItems: 'center', gap: '6px' }}>
                <CheckCircle size={16} color="#059669" /> ผลการวิเคราะห์จาก AI เรียบร้อยแล้ว
              </div>
              <span style={{ fontSize: '11px', fontWeight: '700', background: '#dcfce7', color: '#15803d', padding: '2px 8px', borderRadius: '10px' }}>
                คะแนนสุขภาพ: {mealAnalysisPreview.healthScore || 80}/100
              </span>
            </div>

            {mealAnalysisPreview.summary && (
              <p style={{ fontSize: '12.5px', color: '#166534', margin: 0, lineHeight: '1.4' }}>
                {mealAnalysisPreview.summary}
              </p>
            )}

            {mealAnalysisPreview.tips && (
              <div style={{ fontSize: '11.5px', color: '#047857', background: '#ffffff', padding: '8px 10px', borderRadius: '6px', border: '1px solid #bbf7d0' }}>
                💡 <strong>คำแนะนำ:</strong> {mealAnalysisPreview.tips}
              </div>
            )}
          </div>
        )}

        {/* Nutrition Numerical Fields (Editable or Shimmering while Loading) */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '10px' }}>
          <div>
            <label style={{ display: 'block', fontSize: '11.5px', fontWeight: '700', color: '#334155', marginBottom: '4px' }}>
              🔥 แคลอรี่ (kcal)
            </label>
            <input
              type="number"
              step="1"
              min="0"
              className={isAnalyzingMeal ? 'skeleton-shimmer' : ''}
              value={mealForm.calories}
              onChange={(e) => setMealForm({ ...mealForm, calories: e.target.value })}
              placeholder={isAnalyzingMeal ? 'กำลังคำนวณ...' : 'เช่น 450'}
              style={{ width: '100%', padding: '8px 10px', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '13px', fontWeight: '700', color: '#059669' }}
            />
          </div>
          <div>
            <label style={{ display: 'block', fontSize: '11.5px', fontWeight: '700', color: '#334155', marginBottom: '4px' }}>
              🥩 โปรตีน (g)
            </label>
            <input
              type="number"
              step="0.1"
              min="0"
              className={isAnalyzingMeal ? 'skeleton-shimmer' : ''}
              value={mealForm.protein}
              onChange={(e) => setMealForm({ ...mealForm, protein: e.target.value })}
              placeholder={isAnalyzingMeal ? '...' : 'เช่น 30'}
              style={{ width: '100%', padding: '8px 10px', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '13px', fontWeight: '600' }}
            />
          </div>
          <div>
            <label style={{ display: 'block', fontSize: '11.5px', fontWeight: '700', color: '#334155', marginBottom: '4px' }}>
              🍚 คาร์บ (g)
            </label>
            <input
              type="number"
              step="0.1"
              min="0"
              className={isAnalyzingMeal ? 'skeleton-shimmer' : ''}
              value={mealForm.carbs}
              onChange={(e) => setMealForm({ ...mealForm, carbs: e.target.value })}
              placeholder={isAnalyzingMeal ? '...' : 'เช่น 45'}
              style={{ width: '100%', padding: '8px 10px', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '13px', fontWeight: '600' }}
            />
          </div>
          <div>
            <label style={{ display: 'block', fontSize: '11.5px', fontWeight: '700', color: '#334155', marginBottom: '4px' }}>
              🥑 ไขมัน (g)
            </label>
            <input
              type="number"
              step="0.1"
              min="0"
              className={isAnalyzingMeal ? 'skeleton-shimmer' : ''}
              value={mealForm.fat}
              onChange={(e) => setMealForm({ ...mealForm, fat: e.target.value })}
              placeholder={isAnalyzingMeal ? '...' : 'เช่น 12'}
              style={{ width: '100%', padding: '8px 10px', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '13px', fontWeight: '600' }}
            />
          </div>
        </div>

        {/* Form Action Buttons */}
        <div style={{ display: 'flex', gap: '10px', marginTop: '10px', justifyContent: 'flex-end' }}>
          <button
            type="button"
            onClick={() => setShowLogMealModal(false)}
            disabled={isSavingMeal}
            style={{
              padding: '10px 18px',
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
            disabled={isSavingMeal || !mealForm.mealDescription.trim()}
            style={{
              background: '#10b981',
              border: 'none',
              color: 'white',
              padding: '10px 22px',
              borderRadius: '8px',
              fontWeight: '700',
              fontSize: '13.5px',
              cursor: (isSavingMeal || !mealForm.mealDescription.trim()) ? 'not-allowed' : 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              boxShadow: '0 2px 6px rgba(16, 185, 129, 0.3)'
            }}
          >
            {isSavingMeal ? (
              <>
                <div className="spinner" style={{ width: '12px', height: '12px', border: '2px solid rgba(255,255,255,0.3)', borderTop: '2px solid white', borderRadius: '50%', animation: 'spin 1s linear infinite' }}></div>
                <span>กำลังบันทึก...</span>
              </>
            ) : (
              <>
                <Check size={16} />
                <span>บันทึกมื้ออาหาร</span>
              </>
            )}
          </button>
        </div>
      </form>
    </div>
  </div>
);
