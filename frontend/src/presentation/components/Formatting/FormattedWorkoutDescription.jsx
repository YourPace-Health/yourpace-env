// Parses and formats workout descriptions into clean visual cards & badges
export const FormattedWorkoutDescription = ({ description }) => {
  if (!description) return null;

  // 1. Try parsing raw [Name: ..., Description: ..., MuscleGroup: ..., EquipmentNeeded: ..., BurnRate: ..., DifficultyLevel: ...]
  const itemRegex = /\[Name:\s*([^,]+?),\s*Description:\s*([^,]+?),\s*MuscleGroup:\s*([^,]+?),\s*EquipmentNeeded:\s*([^,]+?),\s*BurnRate:\s*([^,]+?),\s*DifficultyLevel:\s*([^\]]+?)\]/g;
  let match;
  const exercises = [];
  while ((match = itemRegex.exec(description)) !== null) {
    exercises.push({
      name: match[1].trim(),
      description: match[2].trim(),
      muscleGroup: match[3].trim(),
      equipment: match[4].trim(),
      burnRate: match[5].trim(),
      difficulty: match[6].trim()
    });
  }

  const benefitMatch = description.match(/\|\s*ประโยชน์:\s*([^|]+)/);
  const benefit = benefitMatch ? benefitMatch[1].replace(/\]+$/, '').trim() : null;

  const calMatch = description.match(/\|\s*เผาผลาญประมาณ:\s*([^|]+)/);
  const calories = calMatch ? calMatch[1].replace(/\]+$/, '').trim() : null;

  if (exercises.length > 0) {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '12px' }}>
          {exercises.map((ex, i) => (
            <div key={i} style={{
              background: '#f8fafc',
              borderRadius: '12px',
              padding: '16px 18px',
              display: 'flex',
              flexDirection: 'column',
              gap: '6px',
              border: '1px solid #f1f5f9'
            }}>
              <span style={{ fontWeight: '700', fontSize: '15px', color: '#334155' }}>
                {ex.name}
              </span>
              <span style={{ fontSize: '13px', color: '#10b981', fontWeight: '600' }}>
                {ex.description}
              </span>
              {(ex.muscleGroup || ex.equipment) && (
                <div style={{ display: 'flex', gap: '4px', flexWrap: 'wrap', marginTop: '2px' }}>
                  {ex.muscleGroup && (
                    <span style={{ fontSize: '10.5px', padding: '2px 8px', borderRadius: '10px', background: '#ecfdf5', color: '#047857', fontWeight: '600' }}>
                      💪 {ex.muscleGroup}
                    </span>
                  )}
                  {ex.equipment && (
                    <span style={{ fontSize: '10.5px', padding: '2px 8px', borderRadius: '10px', background: '#eff6ff', color: '#1d4ed8', fontWeight: '600' }}>
                      🧘 {ex.equipment}
                    </span>
                  )}
                </div>
              )}
            </div>
          ))}
        </div>

        {(benefit || calories) && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', marginTop: '4px' }}>
            {benefit && (
              <div style={{ background: '#f0fdf4', border: '1px solid #bbf7d0', borderRadius: '8px', padding: '10px 14px', fontSize: '12.5px', color: '#15803d', display: 'flex', alignItems: 'center', gap: '6px' }}>
                <span>✨</span> <span><strong>ประโยชน์:</strong> {benefit}</span>
              </div>
            )}
            {calories && (
              <div style={{ background: '#fff7ed', border: '1px solid #ffedd5', borderRadius: '8px', padding: '10px 14px', fontSize: '12.5px', color: '#c2410c', fontWeight: '700', display: 'flex', alignItems: 'center', gap: '6px' }}>
                <span>🔥</span> <span><strong>เผาผลาญประมาณ:</strong> {calories}</span>
              </div>
            )}
          </div>
        )}
      </div>
    );
  }

  // Fallback formatting: parse bullet points or line items
  let cleanedText = description.replace(/^รายการท่าฝึก\s*:\s*/i, '');
  
  // Separate benefits and calories
  const bMatch = cleanedText.match(/\|?\s*ประโยชน์:\s*([^|\n]+)/i);
  const benefitStr = bMatch ? bMatch[1].replace(/\]+$/, '').trim() : null;

  const cMatch = cleanedText.match(/\|?\s*เผาผลาญประมาณ:\s*([^|\n]+)/i);
  const caloriesStr = cMatch ? cMatch[1].replace(/\]+$/, '').trim() : null;

  // Remove benefit and calories from main text before splitting bullet points
  let exercisesText = cleanedText
    .replace(/\|?\s*ประโยชน์:[\s\S]*/i, '')
    .replace(/\|?\s*เผาผลาญประมาณ:[\s\S]*/i, '');

  // Split by bullet points (•) or newlines (\n)
  const rawItems = exercisesText.includes('•')
    ? exercisesText.split('•').map(s => s.trim()).filter(Boolean)
    : exercisesText.split('\n').map(s => s.trim()).filter(Boolean);

  const parsedExercises = rawItems
    .filter(item => {
      const clean = item.trim();
      if (!clean) return false;
      if (clean.startsWith('#') || clean.startsWith('---') || clean.startsWith('ประโยชน์') || clean.startsWith('เผาผลาญ') || clean.startsWith('คำแนะนำ')) return false;
      return true;
    })
    .map(item => {
      // Extract muscle and equipment inside parentheses e.g. (กล้ามเนื้อ: ต้นขา | อุปกรณ์: ดัมเบล)
      const metaMatch = item.match(/\(([^)]+)\)/);
      let muscleGroup = null;
      let equipment = null;
      let mainText = item;

      if (metaMatch) {
        const metaContent = metaMatch[1];
        mainText = item.replace(metaMatch[0], '').trim();

        const mMatch = metaContent.match(/กล้ามเนื้อ:\s*([^|)]+)/i);
        if (mMatch) muscleGroup = mMatch[1].trim().replace(/^[()]+|[()]+$/g, '');

        const eqMatch = metaContent.match(/อุปกรณ์:\s*([^|)]+)/i);
        if (eqMatch) equipment = eqMatch[1].trim().replace(/^[()]+|[()]+$/g, '');
      }

      mainText = mainText.replace(/^[()]+|[()]+$/g, '').trim();

      const parts = mainText.split(/[-–—]/).map(s => s.trim());
      let name = parts[0] ? parts[0].replace(/^[()*#]+|[()*#]+$/g, '').trim() : mainText;
      let desc = parts.slice(1).join(' - ').replace(/^[()*#]+|[()*#]+$/g, '').trim() || name;

      if (name.toLowerCase() === 'อุปกรณ์' || name.toLowerCase() === 'กล้ามเนื้อ') {
        return null;
      }

      return {
        name: name,
        description: desc,
        muscleGroup: muscleGroup,
        equipment: equipment
      };
    })
    .filter(Boolean);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '12px' }}>
        {parsedExercises.map((ex, i) => (
          <div key={`ex-${ex.name || 'item'}-${i}`} style={{
            background: '#f8fafc',
            borderRadius: '12px',
            padding: '16px 18px',
            display: 'flex',
            flexDirection: 'column',
            gap: '6px',
            border: '1px solid #f1f5f9'
          }}>
            <span style={{ fontWeight: '700', fontSize: '15px', color: '#334155' }}>
              {ex.name}
            </span>
            <span style={{ fontSize: '13px', color: '#10b981', fontWeight: '600' }}>
              {ex.description}
            </span>
            {(ex.muscleGroup || ex.equipment) && (
              <div style={{ display: 'flex', gap: '4px', flexWrap: 'wrap', marginTop: '2px' }}>
                {ex.muscleGroup && (
                  <span style={{ fontSize: '10.5px', padding: '2px 8px', borderRadius: '10px', background: '#ecfdf5', color: '#047857', fontWeight: '600' }}>
                    💪 {ex.muscleGroup}
                  </span>
                )}
                {ex.equipment && (
                  <span style={{ fontSize: '10.5px', padding: '2px 8px', borderRadius: '10px', background: '#f1f5f9', color: '#475569', fontWeight: '600' }}>
                    ⚙️ {ex.equipment}
                  </span>
                )}
              </div>
            )}
          </div>
        ))}
      </div>

      {(benefitStr || caloriesStr) && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', marginTop: '4px' }}>
          {benefitStr && (
            <div style={{ background: '#f0fdf4', border: '1px solid #bbf7d0', borderRadius: '8px', padding: '10px 14px', fontSize: '12.5px', color: '#15803d', display: 'flex', alignItems: 'center', gap: '6px' }}>
              <span>✨</span> <span><strong>ประโยชน์:</strong> {benefitStr}</span>
            </div>
          )}
          {caloriesStr && (
            <div style={{ background: '#fff7ed', border: '1px solid #ffedd5', borderRadius: '8px', padding: '10px 14px', fontSize: '12.5px', color: '#c2410c', fontWeight: '700', display: 'flex', alignItems: 'center', gap: '6px' }}>
              <span>🔥</span> <span><strong>เผาผลาญประมาณ:</strong> {caloriesStr}</span>
            </div>
          )}
        </div>
      )}
    </div>
  );
};
