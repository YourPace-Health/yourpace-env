import { Activity, Apple, BarChart3, Bot, Camera, CheckCircle, Droplets, Lightbulb, Minus, Plus, RefreshCw, Salad, Trash2, TrendingDown, Utensils } from 'lucide-react';

export const NutritionView = ({ coachFeedback, energyBalance, getSessionToken, handleDeleteMeal, handleWaterGlassesChange, loadCoachFeedback, loadEnergyBalance, loadWeeklyNutrition, nutritionSubTab, setMealAnalysisPreview, setMealForm, setMealModalMode, setNutritionSubTab, setPhotoBase64, setPhotoPreview, setShowLogMealModal, targetWaterGlasses, todayMealsSummary, totalBurned, userProfile, waterGlasses, weeklyNutrition }) => (
  <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }} className="animate-fade-in">
    
    {/* 4 Nutrition Metric Cards */}
    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '18px' }}>
      {/* Card 1: Target Calories */}
      <div style={{ background: '#ffffff', border: '1px solid var(--border-color)', borderRadius: 'var(--radius-md)', padding: '20px', boxShadow: 'var(--shadow-sm)', textAlign: 'left' }}>
        <span style={{ fontSize: '12px', fontWeight: 'bold', color: 'var(--primary)' }}>TARGET CALORIES</span>
        <div style={{ display: 'flex', alignItems: 'baseline', gap: '6px', margin: '10px 0 6px' }}>
          <span style={{ fontSize: '30px', fontWeight: '800', color: 'var(--text-dark)' }}>
            {userProfile?.targetCalories || 2000}
          </span>
          <span style={{ fontSize: '13px', color: 'var(--text-muted)' }}>kcal/วัน</span>
        </div>
        <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>พลังงานที่แนะนำตามเป้าหมาย</span>
      </div>

      {/* Card 2: Calories In */}
      <div style={{ background: '#ffffff', border: '1px solid var(--border-color)', borderRadius: 'var(--radius-md)', padding: '20px', boxShadow: 'var(--shadow-sm)', textAlign: 'left' }}>
        <span style={{ fontSize: '12px', fontWeight: 'bold', color: '#059669' }}>CALORIES IN (วันนี้)</span>
        <div style={{ display: 'flex', alignItems: 'baseline', gap: '6px', margin: '10px 0 6px' }}>
          <span style={{ fontSize: '30px', fontWeight: '800', color: '#059669' }}>
            {Math.round(todayMealsSummary?.totalCalories || 0)}
          </span>
          <span style={{ fontSize: '13px', color: 'var(--text-muted)' }}>kcal</span>
        </div>
        <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>จาก {todayMealsSummary?.meals?.length || 0} มื้อที่บันทึก</span>
      </div>

      {/* Card 3: Burned Calories */}
      <div style={{ background: '#ffffff', border: '1px solid var(--border-color)', borderRadius: 'var(--radius-md)', padding: '20px', boxShadow: 'var(--shadow-sm)', textAlign: 'left' }}>
        <span style={{ fontSize: '12px', fontWeight: 'bold', color: '#ea580c' }}>WORKOUT BURNED</span>
        <div style={{ display: 'flex', alignItems: 'baseline', gap: '6px', margin: '10px 0 6px' }}>
          <span style={{ fontSize: '30px', fontWeight: '800', color: '#ea580c' }}>
            {Math.round(totalBurned)}
          </span>
          <span style={{ fontSize: '13px', color: 'var(--text-muted)' }}>kcal</span>
        </div>
        <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>เผาผลาญจากการออกกำลังกาย</span>
      </div>

      {/* Card 4: Water Intake */}
      <div style={{ background: '#ffffff', border: '1px solid var(--border-color)', borderRadius: 'var(--radius-md)', padding: '20px', boxShadow: 'var(--shadow-sm)', textAlign: 'left' }}>
        <span style={{ fontSize: '12px', fontWeight: 'bold', color: '#00b8d9' }}>WATER INTAKE</span>
        <div style={{ display: 'flex', alignItems: 'baseline', gap: '6px', margin: '10px 0 6px' }}>
          <span style={{ fontSize: '30px', fontWeight: '800', color: '#00b8d9' }}>
            {waterGlasses}
          </span>
          <span style={{ fontSize: '13px', color: 'var(--text-muted)' }}>/ {targetWaterGlasses} แก้ว</span>
        </div>
        <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>~{(waterGlasses * 250 / 1000).toFixed(1)} ลิตร</span>
      </div>
    </div>

    {/* Section: AI Nutrition & Meal Tracker Main Studio Card */}
    <div style={{
      background: '#ffffff',
      border: '1px solid var(--border-color)',
      borderRadius: 'var(--radius-md)',
      padding: '24px 28px',
      boxShadow: 'var(--shadow-sm)',
      textAlign: 'left'
    }}>
      {/* Header with Title and Action Button */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '18px', flexWrap: 'wrap', gap: '12px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <div style={{ width: '44px', height: '44px', borderRadius: '12px', background: '#ecfdf5', color: '#059669', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <Utensils size={24} />
          </div>
          <div>
            <h3 style={{ fontSize: '20px', fontWeight: '800', color: '#0f172a', margin: 0, display: 'flex', alignItems: 'center', gap: '8px' }}>
              <span>โภชนาการและพลังงานอัจฉริยะ (AI Smart Nutrition Studio)</span>
              <span style={{ fontSize: '11px', fontWeight: '700', background: '#e0f2fe', color: '#0369a1', padding: '2px 8px', borderRadius: '10px' }}>
                Multimodal AI
              </span>
            </h3>
            <span style={{ fontSize: '13px', color: '#64748b' }}>
              วิเคราะห์ภาพถ่ายอาหาร สมดุลพลังงาน In vs Out ดื่มน้ำ และแนวโน้มรายสัปดาห์
            </span>
          </div>
        </div>

        <button
          type="button"
          onClick={() => {
            setMealForm({ mealType: 'LUNCH', mealDescription: '', calories: '', protein: '', carbs: '', fat: '' });
            setMealAnalysisPreview(null);
            setPhotoPreview(null);
            setPhotoBase64('');
            setMealModalMode('photo');
            setShowLogMealModal(true);
          }}
          style={{
            background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)',
            border: 'none',
            color: 'white',
            padding: '10px 20px',
            borderRadius: '8px',
            fontWeight: '700',
            fontSize: '13.5px',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            gap: '6px',
            boxShadow: '0 2px 6px rgba(16, 185, 129, 0.3)',
            transition: 'all 0.2s'
          }}
        >
          <Camera size={16} /> 📸 ถ่ายรูป/บันทึกมื้ออาหาร (AI Scan)
        </button>
      </div>

      {/* 5 Feature Navigation Sub-tabs */}
      <div style={{
        display: 'flex',
        gap: '8px',
        borderBottom: '1px solid #e2e8f0',
        paddingBottom: '14px',
        marginBottom: '20px',
        overflowX: 'auto'
      }}>
        {[
          { id: 'tracker', label: '🥗 สารอาหารวันนี้ (Macros)', icon: Salad },
          { id: 'energy', label: '⚖️ สมดุลพลังงาน (In vs Out)', icon: Activity },
          { id: 'hydration', label: '💧 ดื่มน้ำ (Hydration)', icon: Droplets },
          { id: 'analytics', label: '📊 สถิติ 7 วัน & ทำนายน้ำหนัก', icon: BarChart3 },
          { id: 'coach', label: '🤖 คำแนะนำโค้ช AI (Feedback)', icon: Bot }
        ].map(tab => {
          const isSelected = nutritionSubTab === tab.id;
          const Icon = tab.icon;
          return (
            <button
              key={tab.id}
              type="button"
              onClick={() => {
                setNutritionSubTab(tab.id);
                const tok = getSessionToken();
                if (tok) {
                  if (tab.id === 'energy') loadEnergyBalance(tok);
                  if (tab.id === 'analytics') loadWeeklyNutrition(tok);
                  if (tab.id === 'coach') loadCoachFeedback(tok);
                }
              }}
              style={{
                padding: '9px 16px',
                borderRadius: '8px',
                border: isSelected ? '1.5px solid #10b981' : '1px solid #e2e8f0',
                background: isSelected ? '#ecfdf5' : '#f8fafc',
                color: isSelected ? '#065f46' : '#475569',
                fontWeight: isSelected ? '700' : '600',
                fontSize: '13px',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
                whiteSpace: 'nowrap',
                transition: 'all 0.15s'
              }}
            >
              <Icon size={16} color={isSelected ? '#059669' : '#64748b'} />
              <span>{tab.label}</span>
            </button>
          );
        })}
      </div>

      {/* TAB 1: TODAY'S MACROS & MEALS */}
      {nutritionSubTab === 'tracker' && (
        <div className="animate-fade-in">
          {/* Macros & Calorie Summary Grid */}
          <div style={{
            display: 'grid',
            gridTemplateColumns: '1.4fr repeat(3, 1fr)',
            gap: '14px',
            background: '#f8fafc',
            border: '1px solid #e2e8f0',
            borderRadius: '12px',
            padding: '18px 20px',
            alignItems: 'center'
          }}>
            {/* Calories Ring / Progress */}
            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: '4px' }}>
                <span style={{ fontSize: '12px', fontWeight: '700', color: '#64748b' }}>⚡ พลังงานสะสมวันนี้</span>
                <span style={{ fontSize: '13.5px', fontWeight: '800', color: '#0f172a' }}>
                  {Math.round(todayMealsSummary?.totalCalories || 0)} <span style={{ fontSize: '11px', color: '#64748b', fontWeight: 'normal' }}>/ {todayMealsSummary?.targetCalories || 2000} kcal</span>
                </span>
              </div>
              <div style={{ width: '100%', height: '8px', background: '#e2e8f0', borderRadius: '4px', overflow: 'hidden' }}>
                <div style={{
                  width: `${Math.min(100, ((todayMealsSummary?.totalCalories || 0) / (todayMealsSummary?.targetCalories || 2000)) * 100)}%`,
                  height: '100%',
                  background: ((todayMealsSummary?.totalCalories || 0) > (todayMealsSummary?.targetCalories || 2000)) ? '#ef4444' : 'linear-gradient(90deg, #10b981, #059669)',
                  transition: 'width 0.4s ease-out'
                }}></div>
              </div>
              <div style={{ fontSize: '11px', color: '#64748b', marginTop: '4px', display: 'flex', justifyContent: 'space-between' }}>
                <span>เหลืออีก {Math.max(0, (todayMealsSummary?.targetCalories || 2000) - Math.round(todayMealsSummary?.totalCalories || 0))} kcal</span>
                <span>{Math.round(((todayMealsSummary?.totalCalories || 0) / (todayMealsSummary?.targetCalories || 2000)) * 100)}%</span>
              </div>
            </div>

            {/* Protein */}
            <div style={{ background: '#ffffff', border: '1px solid #e2e8f0', borderRadius: '10px', padding: '12px 14px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ fontSize: '11px', fontWeight: '700', color: '#3b82f6', display: 'flex', alignItems: 'center', gap: '4px' }}>
                  🥩 โปรตีน (Protein)
                </span>
                <span style={{ fontSize: '10px', color: '#64748b', fontWeight: '600' }}>
                  เป้า: {Math.round(todayMealsSummary?.targetProtein || 120)}g
                </span>
              </div>
              <div style={{ fontSize: '18px', fontWeight: '800', color: '#1e3a8a', marginTop: '4px' }}>
                {(todayMealsSummary?.totalProtein || 0).toFixed(1)} <span style={{ fontSize: '11px', fontWeight: 'normal', color: '#64748b' }}>/ {Math.round(todayMealsSummary?.targetProtein || 120)} g</span>
              </div>
              <div style={{ width: '100%', height: '5px', background: '#e2e8f0', borderRadius: '3px', overflow: 'hidden', margin: '6px 0 4px' }}>
                <div style={{
                  width: `${Math.min(100, ((todayMealsSummary?.totalProtein || 0) / (todayMealsSummary?.targetProtein || 120)) * 100)}%`,
                  height: '100%',
                  background: '#3b82f6',
                  transition: 'width 0.3s ease-out'
                }}></div>
              </div>
              <div style={{ fontSize: '10px', color: '#64748b', display: 'flex', justifyContent: 'space-between' }}>
                <span>
                  {(todayMealsSummary?.totalProtein || 0) >= (todayMealsSummary?.targetProtein || 120)
                    ? '✓ ครบตามเป้า'
                    : `ขาดอีก ${(Math.max(0, (todayMealsSummary?.targetProtein || 120) - (todayMealsSummary?.totalProtein || 0))).toFixed(1)} g`
                  }
                </span>
                <span>{Math.round(((todayMealsSummary?.totalProtein || 0) / (todayMealsSummary?.targetProtein || 120)) * 100)}%</span>
              </div>
            </div>

            {/* Carbs */}
            <div style={{ background: '#ffffff', border: '1px solid #e2e8f0', borderRadius: '10px', padding: '12px 14px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ fontSize: '11px', fontWeight: '700', color: '#d97706', display: 'flex', alignItems: 'center', gap: '4px' }}>
                  🍚 คาร์โบไฮเดรต (Carbs)
                </span>
                <span style={{ fontSize: '10px', color: '#64748b', fontWeight: '600' }}>
                  เป้า: {Math.round(todayMealsSummary?.targetCarbs || 200)}g
                </span>
              </div>
              <div style={{ fontSize: '18px', fontWeight: '800', color: '#78350f', marginTop: '4px' }}>
                {(todayMealsSummary?.totalCarbs || 0).toFixed(1)} <span style={{ fontSize: '11px', fontWeight: 'normal', color: '#64748b' }}>/ {Math.round(todayMealsSummary?.targetCarbs || 200)} g</span>
              </div>
              <div style={{ width: '100%', height: '5px', background: '#e2e8f0', borderRadius: '3px', overflow: 'hidden', margin: '6px 0 4px' }}>
                <div style={{
                  width: `${Math.min(100, ((todayMealsSummary?.totalCarbs || 0) / (todayMealsSummary?.targetCarbs || 200)) * 100)}%`,
                  height: '100%',
                  background: '#d97706',
                  transition: 'width 0.3s ease-out'
                }}></div>
              </div>
              <div style={{ fontSize: '10px', color: '#64748b', display: 'flex', justifyContent: 'space-between' }}>
                <span>
                  {(todayMealsSummary?.totalCarbs || 0) >= (todayMealsSummary?.targetCarbs || 200)
                    ? '✓ ครบตามเป้า'
                    : `ขาดอีก ${(Math.max(0, (todayMealsSummary?.targetCarbs || 200) - (todayMealsSummary?.totalCarbs || 0))).toFixed(1)} g`
                  }
                </span>
                <span>{Math.round(((todayMealsSummary?.totalCarbs || 0) / (todayMealsSummary?.targetCarbs || 200)) * 100)}%</span>
              </div>
            </div>

            {/* Fat */}
            <div style={{ background: '#ffffff', border: '1px solid #e2e8f0', borderRadius: '10px', padding: '12px 14px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ fontSize: '11px', fontWeight: '700', color: '#eab308', display: 'flex', alignItems: 'center', gap: '4px' }}>
                  🥑 ไขมันดี (Fat)
                </span>
                <span style={{ fontSize: '10px', color: '#64748b', fontWeight: '600' }}>
                  เป้า: {Math.round(todayMealsSummary?.targetFat || 55)}g
                </span>
              </div>
              <div style={{ fontSize: '18px', fontWeight: '800', color: '#713f12', marginTop: '4px' }}>
                {(todayMealsSummary?.totalFat || 0).toFixed(1)} <span style={{ fontSize: '11px', fontWeight: 'normal', color: '#64748b' }}>/ {Math.round(todayMealsSummary?.targetFat || 55)} g</span>
              </div>
              <div style={{ width: '100%', height: '5px', background: '#e2e8f0', borderRadius: '3px', overflow: 'hidden', margin: '6px 0 4px' }}>
                <div style={{
                  width: `${Math.min(100, ((todayMealsSummary?.totalFat || 0) / (todayMealsSummary?.targetFat || 55)) * 100)}%`,
                  height: '100%',
                  background: '#eab308',
                  transition: 'width 0.3s ease-out'
                }}></div>
              </div>
              <div style={{ fontSize: '10px', color: '#64748b', display: 'flex', justifyContent: 'space-between' }}>
                <span>
                  {(todayMealsSummary?.totalFat || 0) >= (todayMealsSummary?.targetFat || 55)
                    ? '✓ ครบตามเป้า'
                    : `ขาดอีก ${(Math.max(0, (todayMealsSummary?.targetFat || 55) - (todayMealsSummary?.totalFat || 0))).toFixed(1)} g`
                  }
                </span>
                <span>{Math.round(((todayMealsSummary?.totalFat || 0) / (todayMealsSummary?.targetFat || 55)) * 100)}%</span>
              </div>
            </div>
          </div>

          {/* Today's Meals Timeline / List */}
          <div style={{ marginTop: '20px' }}>
            <div style={{ fontSize: '14px', fontWeight: '700', color: '#334155', marginBottom: '12px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <span>📋 มื้ออาหารที่บันทึกแล้ววันนี้ ({todayMealsSummary?.meals?.length || 0} มื้อ)</span>
            </div>

            {todayMealsSummary?.meals && todayMealsSummary.meals.length > 0 ? (
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: '14px' }}>
                {todayMealsSummary.meals.map(meal => {
                  const mealBadgeColors = {
                    BREAKFAST: { bg: '#fef3c7', text: '#92400e', icon: '🍳', label: 'มื้อเช้า' },
                    LUNCH: { bg: '#e0f2fe', text: '#0369a1', icon: '🍱', label: 'มื้อกลางวัน' },
                    DINNER: { bg: '#fae8ff', text: '#86198f', icon: '🍲', label: 'มื้อเย็น' },
                    SNACK: { bg: '#f1f5f9', text: '#475569', icon: '🍎', label: 'ของว่าง' }
                  };
                  const badge = mealBadgeColors[meal.mealType] || mealBadgeColors.LUNCH;

                  return (
                    <div
                      key={meal.mealId}
                      style={{
                        background: '#ffffff',
                        border: '1px solid #e2e8f0',
                        borderRadius: '12px',
                        padding: '14px 16px',
                        display: 'flex',
                        flexDirection: 'column',
                        justifyContent: 'space-between',
                        boxShadow: '0 2px 6px rgba(0,0,0,0.02)'
                      }}
                    >
                      <div>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                          <span style={{ fontSize: '11px', fontWeight: '700', background: badge.bg, color: badge.text, padding: '2px 8px', borderRadius: '6px', display: 'flex', alignItems: 'center', gap: '4px' }}>
                            <span>{badge.icon}</span> {badge.label}
                          </span>
                          <button
                            type="button"
                            onClick={() => handleDeleteMeal(meal.mealId)}
                            style={{ background: 'transparent', border: 'none', color: '#94a3b8', cursor: 'pointer', padding: '2px' }}
                            title="ลบรายการมื้อนี้"
                          >
                            <Trash2 size={14} />
                          </button>
                        </div>

                        <div style={{ fontSize: '14.5px', fontWeight: '700', color: '#0f172a', marginBottom: '6px' }}>
                          {meal.mealDescription}
                        </div>

                        {meal.aiSummary && (
                          <div style={{ fontSize: '12px', color: '#64748b', lineHeight: '1.4', marginBottom: '10px', background: '#f8fafc', padding: '8px 10px', borderRadius: '6px' }}>
                            {meal.aiSummary}
                          </div>
                        )}
                      </div>

                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderTop: '1px solid #f1f5f9', paddingTop: '8px', fontSize: '12px' }}>
                        <strong style={{ color: '#059669', fontSize: '13.5px' }}>🔥 {Math.round(meal.calories || 0)} kcal</strong>
                        <div style={{ display: 'flex', gap: '8px', color: '#64748b', fontSize: '11.5px' }}>
                          <span>P: {Math.round(meal.protein || 0)}g</span>
                          <span>C: {Math.round(meal.carbs || 0)}g</span>
                          <span>F: {Math.round(meal.fat || 0)}g</span>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              <div style={{
                background: '#f8fafc',
                border: '1px dashed #cbd5e1',
                borderRadius: '12px',
                padding: '36px',
                textAlign: 'center',
                color: '#64748b'
              }}>
                <Apple size={36} color="#94a3b8" style={{ margin: '0 auto 10px', display: 'block' }} />
                <div style={{ fontSize: '14px', fontWeight: '600', color: '#334155' }}>ยังไม่มีบันทึกมื้ออาหารสำหรับวันนี้</div>
                <div style={{ fontSize: '12.5px', marginTop: '4px' }}>คลิกปุ่ม <strong>"📸 ถ่ายรูป/บันทึกมื้ออาหาร"</strong> ด้านบนเพื่อให้ AI ช่วยคำนวณแคลอรี่และโภชนาการได้ทันที</div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* TAB 2: DYNAMIC ENERGY BALANCE (IN VS OUT) */}
      {nutritionSubTab === 'energy' && (
        <div className="animate-fade-in" style={{ display: 'flex', flexDirection: 'column', gap: '18px' }}>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '16px' }}>
            <div style={{ background: '#f0fdf4', border: '1.5px solid #bbf7d0', borderRadius: '14px', padding: '18px', textAlign: 'center' }}>
              <div style={{ fontSize: '12.5px', fontWeight: '700', color: '#166534', marginBottom: '6px' }}>📥 พลังงานที่กิน (Calories In)</div>
              <div style={{ fontSize: '28px', fontWeight: '800', color: '#15803d' }}>
                {Math.round(energyBalance?.caloriesIn || todayMealsSummary?.totalCalories || 0)} <span style={{ fontSize: '14px', fontWeight: '600' }}>kcal</span>
              </div>
              <span style={{ fontSize: '11.5px', color: '#16a34a' }}>จากอาหาร {energyBalance?.mealCount || todayMealsSummary?.meals?.length || 0} มื้อวันนี้</span>
            </div>

            <div style={{ background: '#fff7ed', border: '1.5px solid #fed7aa', borderRadius: '14px', padding: '18px', textAlign: 'center' }}>
              <div style={{ fontSize: '12.5px', fontWeight: '700', color: '#9a3412', marginBottom: '6px' }}>🔥 เผาผลาญจากการออกกำลัง (Burned)</div>
              <div style={{ fontSize: '28px', fontWeight: '800', color: '#c2410c' }}>
                {Math.round(energyBalance?.caloriesBurned || totalBurned || 0)} <span style={{ fontSize: '14px', fontWeight: '600' }}>kcal</span>
              </div>
              <span style={{ fontSize: '11.5px', color: '#ea580c' }}>จากกิจกรรมที่ทำสำเร็จ</span>
            </div>

            <div style={{ background: '#f8fafc', border: '1.5px solid #cbd5e1', borderRadius: '14px', padding: '18px', textAlign: 'center' }}>
              <div style={{ fontSize: '12.5px', fontWeight: '700', color: '#334155', marginBottom: '6px' }}>🎯 พลังงานสุทธิ (Net Calories)</div>
              <div style={{ fontSize: '28px', fontWeight: '800', color: '#0f172a' }}>
                {Math.round(energyBalance?.netCalories !== undefined ? energyBalance.netCalories : ((todayMealsSummary?.totalCalories || 0) - totalBurned))} <span style={{ fontSize: '14px', fontWeight: '600' }}>kcal</span>
              </div>
              <span style={{ fontSize: '11.5px', color: '#64748b' }}>เป้าหมายประจำวัน: {Math.round(energyBalance?.targetCalories || todayMealsSummary?.targetCalories || 2000)} kcal</span>
            </div>
          </div>

          {/* Deficit Banner */}
          <div style={{
            background: 'linear-gradient(135deg, #eff6ff 0%, #ecfdf5 100%)',
            border: '1px solid #93c5fd',
            borderRadius: '14px',
            padding: '18px 24px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            flexWrap: 'wrap',
            gap: '12px'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
              <div style={{ width: '46px', height: '46px', borderRadius: '50%', background: '#dbeafe', color: '#2563eb', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <Activity size={24} />
              </div>
              <div>
                <strong style={{ fontSize: '15px', color: '#1e40af', display: 'block' }}>
                  สถานะพลังงานปัจจุบัน: {energyBalance?.statusMessage || 'อยู่ในเกณฑ์สมดุลตามแผน'}
                </strong>
                <span style={{ fontSize: '12.5px', color: '#475569' }}>
                  {energyBalance?.isDeficitSuccess
                    ? '🎉 คุณกำลังสร้าง Calorie Deficit ได้อย่างมีประสิทธิภาพ ไขมันสะสมกำลังถูกดึงมาใช้!'
                    : '💡 ควบคุมปริมาณพลังงานในมื้อถัดไป หรือออกกำลังกายเพิ่มเพื่อคงสภาวะ Deficit'}
                </span>
              </div>
            </div>
            <div style={{ background: '#ffffff', padding: '10px 18px', borderRadius: '10px', border: '1px solid #bfdbfe', textAlign: 'right' }}>
              <span style={{ fontSize: '11px', color: '#64748b', display: 'block' }}>ค่า TDEE พื้นฐาน</span>
              <strong style={{ fontSize: '16px', color: '#1d4ed8' }}>~{Math.round(energyBalance?.tdee || 2400)} kcal/วัน</strong>
            </div>
          </div>
        </div>
      )}

      {/* TAB 3: SMART HYDRATION TRACKER */}
      {nutritionSubTab === 'hydration' && (
        <div className="animate-fade-in" style={{ display: 'grid', gridTemplateColumns: '1fr 1.2fr', gap: '24px', alignItems: 'center' }}>
          {/* Hydration Animation Visual Card */}
          <div style={{
            background: 'linear-gradient(180deg, #ecfeff 0%, #cffafe 100%)',
            border: '1.5px solid #a5f3fc',
            borderRadius: '16px',
            padding: '28px',
            textAlign: 'center',
            position: 'relative',
            overflow: 'hidden'
          }}>
            <div style={{ width: '70px', height: '70px', borderRadius: '50%', background: '#ffffff', color: '#0891b2', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 14px', boxShadow: '0 4px 12px rgba(6,182,212,0.2)' }} className="water-pulse-glow">
              <Droplets size={36} />
            </div>
            <div style={{ fontSize: '36px', fontWeight: '900', color: '#155e75', margin: '4px 0' }}>
              {(waterGlasses * 250).toLocaleString()} <span style={{ fontSize: '18px', fontWeight: '600' }}>ml</span>
            </div>
            <div style={{ fontSize: '14px', fontWeight: '700', color: '#0e7490' }}>
              {waterGlasses} / {targetWaterGlasses} แก้ว ({Math.min(100, Math.round((waterGlasses / targetWaterGlasses) * 100))}%)
            </div>
            <div style={{ width: '80%', height: '10px', background: '#ffffff', borderRadius: '5px', overflow: 'hidden', margin: '14px auto 8px' }}>
              <div style={{
                width: `${Math.min(100, (waterGlasses / targetWaterGlasses) * 100)}%`,
                height: '100%',
                background: 'linear-gradient(90deg, #06b6d4, #0891b2)',
                transition: 'width 0.3s ease'
              }}></div>
            </div>
            <span style={{ fontSize: '11.5px', color: '#0e7490' }}>เป้าหมาย: {(targetWaterGlasses * 250 / 1000).toFixed(1)} ลิตรต่อวัน</span>
          </div>

          {/* Quick Tap Buttons */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            <h5 style={{ fontSize: '15px', fontWeight: '800', color: '#0f172a', margin: '0 0 2px' }}>⚡ บันทึกการดื่มน้ำด่วน:</h5>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
              <button
                type="button"
                onClick={() => handleWaterGlassesChange(waterGlasses + 1)}
                style={{ padding: '14px', borderRadius: '10px', background: '#f0fdfa', border: '1.5px solid #99f6e4', color: '#0f766e', fontWeight: '700', fontSize: '13.5px', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px' }}
              >
                <Plus size={16} /> <span>+1 แก้ว (250 ml)</span>
              </button>
              <button
                type="button"
                onClick={() => handleWaterGlassesChange(waterGlasses + 2)}
                style={{ padding: '14px', borderRadius: '10px', background: '#ecfeff', border: '1.5px solid #a5f3fc', color: '#0e7490', fontWeight: '700', fontSize: '13.5px', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px' }}
              >
                <Plus size={16} /> <span>+1 ขวด (500 ml)</span>
              </button>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
              <button
                type="button"
                onClick={() => handleWaterGlassesChange(Math.max(0, waterGlasses - 1))}
                style={{ padding: '10px', borderRadius: '8px', background: '#f8fafc', border: '1px solid #cbd5e1', color: '#64748b', fontWeight: '600', fontSize: '12px', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '4px' }}
              >
                <Minus size={14} /> <span>-1 แก้ว (250 ml)</span>
              </button>
              <button
                type="button"
                onClick={() => handleWaterGlassesChange(0)}
                style={{ padding: '10px', borderRadius: '8px', background: '#f8fafc', border: '1px solid #cbd5e1', color: '#ef4444', fontWeight: '600', fontSize: '12px', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '4px' }}
              >
                <RefreshCw size={14} /> <span>รีเซ็ตวันนี้</span>
              </button>
            </div>
            <div style={{ background: '#f8fafc', padding: '12px 14px', borderRadius: '8px', border: '1px solid #e2e8f0', fontSize: '12px', color: '#64748b', lineHeight: '1.5' }}>
              💡 <strong>เกร็ดความรู้:</strong> การดื่มน้ำอย่างสม่ำเสมอช่วยเพิ่มอัตราการเผาผลาญ (BMR) และลดความอยากอาหารระหว่างมื้อได้ถึง 15-20%
            </div>
          </div>
        </div>
      )}

      {/* TAB 4: WEEKLY NUTRITION & WEIGHT PROJECTION */}
      {nutritionSubTab === 'analytics' && (
        <div className="animate-fade-in" style={{ display: 'flex', flexDirection: 'column', gap: '18px' }}>
          <div style={{ display: 'grid', gridTemplateColumns: '1.6fr 1fr', gap: '18px' }}>
            {/* 7 Days Bar Chart Visual */}
            <div style={{ background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '12px', padding: '18px' }}>
              <div style={{ fontSize: '13.5px', fontWeight: '700', color: '#334155', marginBottom: '14px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span>📊 ปริมาณพลังงาน 7 วันย้อนหลัง (kcal)</span>
                <span style={{ fontSize: '11.5px', color: '#059669', fontWeight: '700' }}>
                  เฉลี่ย: {Math.round(weeklyNutrition?.avgDailyCalories || todayMealsSummary?.totalCalories || 0)} kcal/วัน
                </span>
              </div>
              <div style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', height: '130px', padding: '0 8px', borderBottom: '1px solid #cbd5e1' }}>
                {(weeklyNutrition?.dailyPoints || [
                  { dayName: 'จ.', calories: 1850 },
                  { dayName: 'อ.', calories: 1920 },
                  { dayName: 'พ.', calories: 1780 },
                  { dayName: 'พฤ.', calories: 2050 },
                  { dayName: 'ศ.', calories: 1890 },
                  { dayName: 'ส.', calories: 2100 },
                  { dayName: 'อา.', calories: Math.round(todayMealsSummary?.totalCalories || 1950) }
                ]).map((pt, idx) => {
                  const maxCal = 2500;
                  const heightPct = Math.min(100, Math.max(15, (pt.calories / maxCal) * 100));
                  return (
                    <div key={idx} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '4px', width: '36px' }}>
                      <span style={{ fontSize: '10px', color: '#64748b', fontWeight: '700' }}>{pt.calories > 0 ? pt.calories : '-'}</span>
                      <div style={{
                        width: '20px',
                        height: `${heightPct}%`,
                        background: pt.calories > 2200 ? '#f97316' : 'linear-gradient(180deg, #10b981 0%, #059669 100%)',
                        borderRadius: '4px 4px 0 0',
                        transition: 'height 0.4s ease'
                      }}></div>
                      <span style={{ fontSize: '11.5px', fontWeight: '700', color: '#475569' }}>{pt.dayName}</span>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Macro Distribution Donut Breakdown */}
            <div style={{ background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '12px', padding: '18px' }}>
              <div style={{ fontSize: '13.5px', fontWeight: '700', color: '#334155', marginBottom: '12px' }}>
                🍰 สัดส่วนสารอาหารหลัก (%)
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12.5px' }}>
                  <span style={{ color: '#2563eb', fontWeight: '700' }}>🥩 โปรตีน</span>
                  <strong>{Math.round(weeklyNutrition?.macroDistribution?.proteinPct || 30)}%</strong>
                </div>
                <div style={{ width: '100%', height: '7px', background: '#e2e8f0', borderRadius: '4px', overflow: 'hidden' }}>
                  <div style={{ width: `${weeklyNutrition?.macroDistribution?.proteinPct || 30}%`, height: '100%', background: '#3b82f6' }}></div>
                </div>

                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12.5px' }}>
                  <span style={{ color: '#d97706', fontWeight: '700' }}>🍚 คาร์โบไฮเดรต</span>
                  <strong>{Math.round(weeklyNutrition?.macroDistribution?.carbsPct || 45)}%</strong>
                </div>
                <div style={{ width: '100%', height: '7px', background: '#e2e8f0', borderRadius: '4px', overflow: 'hidden' }}>
                  <div style={{ width: `${weeklyNutrition?.macroDistribution?.carbsPct || 45}%`, height: '100%', background: '#f59e0b' }}></div>
                </div>

                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12.5px' }}>
                  <span style={{ color: '#ca8a04', fontWeight: '700' }}>🥑 ไขมันดี</span>
                  <strong>{Math.round(weeklyNutrition?.macroDistribution?.fatPct || 25)}%</strong>
                </div>
                <div style={{ width: '100%', height: '7px', background: '#e2e8f0', borderRadius: '4px', overflow: 'hidden' }}>
                  <div style={{ width: `${weeklyNutrition?.macroDistribution?.fatPct || 25}%`, height: '100%', background: '#eab308' }}></div>
                </div>
              </div>
            </div>
          </div>

          {/* Weight Loss Projection Card */}
          <div style={{
            background: 'linear-gradient(135deg, #f0fdf4 0%, #e0f2fe 100%)',
            border: '1.5px solid #86efac',
            borderRadius: '14px',
            padding: '18px 24px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            flexWrap: 'wrap',
            gap: '12px'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
              <div style={{ width: '46px', height: '46px', borderRadius: '50%', background: '#dcfce7', color: '#16a34a', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <TrendingDown size={24} />
              </div>
              <div>
                <strong style={{ fontSize: '15px', color: '#15803d', display: 'block' }}>
                  พยากรณ์ผลลัพธ์น้ำหนักตัว (AI Weight Loss Curve)
                </strong>
                <span style={{ fontSize: '12.5px', color: '#475569' }}>
                  ด้วยอัตราการกินและออกกำลังกายปัจจุบัน คาดการณ์การลดน้ำหนักได้ประมาณ <strong>~{(weeklyNutrition?.projectedWeightLossKg || 0.45).toFixed(2)} กก./สัปดาห์</strong>
                </span>
              </div>
            </div>
            <span style={{ fontSize: '12.5px', fontWeight: '800', background: '#16a34a', color: 'white', padding: '6px 16px', borderRadius: '20px' }}>
              🎯 อยู่ในเกณฑ์ปลอดภัย & ยั่งยืน
            </span>
          </div>
        </div>
      )}

      {/* TAB 5: AI DAILY NUTRITION COACH FEEDBACK */}
      {nutritionSubTab === 'coach' && (
        <div className="animate-fade-in" style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          {/* Score Card */}
          <div style={{
            background: 'linear-gradient(135deg, #faf5ff 0%, #f3e8ff 100%)',
            border: '1.5px solid #d8b4fe',
            borderRadius: '14px',
            padding: '20px 24px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            flexWrap: 'wrap',
            gap: '12px'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
              <div style={{ width: '52px', height: '52px', borderRadius: '50%', background: '#9333ea', color: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: '900', fontSize: '20px' }}>
                {coachFeedback?.dietScore || 8.5}
              </div>
              <div>
                <h5 style={{ fontSize: '17px', fontWeight: '800', color: '#581c87', margin: '0 0 4px' }}>
                  {coachFeedback?.title || 'คุณภาพโภชนาการวันนี้อยู่ในเกณฑ์ยอดเยี่ยม! 🌟'}
                </h5>
                <span style={{ fontSize: '12.5px', color: '#7e22ce' }}>ประเมินโดย yourPace AI Nutrition Coach</span>
              </div>
            </div>
            <span style={{ fontSize: '13px', fontWeight: '700', background: '#ede9fe', color: '#6b21a8', padding: '8px 16px', borderRadius: '20px' }}>
              Diet Score: {coachFeedback?.dietScore || 8.5} / 10
            </span>
          </div>

          {/* Highlights & Suggestions Grid */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px' }}>
            <div style={{ background: '#f0fdf4', border: '1px solid #bbf7d0', borderRadius: '12px', padding: '16px' }}>
              <div style={{ fontSize: '13px', fontWeight: '700', color: '#166534', marginBottom: '6px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                <CheckCircle size={16} color="#16a34a" /> จุดเด่นของอาหารวันนี้:
              </div>
              <p style={{ fontSize: '12.5px', color: '#15803d', margin: 0, lineHeight: '1.5' }}>
                {coachFeedback?.highlights || 'สัดส่วนโปรตีนอยู่ในเกณฑ์ที่ดีมาก ช่วยรักษามวลกล้ามเนื้อและทำให้รู้สึกอิ่มนานตลอดวัน'}
              </p>
            </div>

            <div style={{ background: '#fffbeb', border: '1px solid #fde68a', borderRadius: '12px', padding: '16px' }}>
              <div style={{ fontSize: '13px', fontWeight: '700', color: '#92400e', marginBottom: '6px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                <Lightbulb size={16} color="#d97706" /> ข้อแนะนำสำหรับวันพรุ่งนี้:
              </div>
              <p style={{ fontSize: '12.5px', color: '#b45309', margin: 0, lineHeight: '1.5' }}>
                {coachFeedback?.suggestions || 'เพิ่มผักใบเขียวหรือผลไม้น้ำตาลต่ำในมื้อเย็น เพื่อเสริมวิตามินและกากใยอาหาร (Fiber)'}
              </p>
            </div>
          </div>

          {/* Coach Note */}
          {coachFeedback?.coachNote && (
            <div style={{ background: '#ffffff', border: '1px solid #e2e8f0', borderRadius: '12px', padding: '14px 18px', fontSize: '12.5px', color: '#475569', lineHeight: '1.5' }}>
              💬 <strong>ข้อความจากโค้ช:</strong> {coachFeedback.coachNote}
            </div>
          )}
        </div>
      )}
    </div>
  </div>
);
