import { useState } from 'react';

export function useWaterTracker({ authDataSource }) {
  // Water intake state in glasses & target (fetched from backend API)
  const [waterGlasses, setWaterGlasses] = useState(0);

  const [targetWaterGlasses, setTargetWaterGlasses] = useState(10);

  const handleWaterGlassesChange = async (newCount) => {
    const count = Math.max(0, newCount);
    setWaterGlasses(count);
    try {
      const updated = await authDataSource.updateTodayWaterLog(count);
      if (updated) {
        setWaterGlasses(updated.glasses);
        if (updated.targetGlasses) {
          setTargetWaterGlasses(updated.targetGlasses);
        }
      }
    } catch (err) {
      console.error("Failed to update water log via API:", err);
    }
  };

  return {
    waterGlasses,
    setWaterGlasses,
    targetWaterGlasses,
    setTargetWaterGlasses,
    handleWaterGlassesChange,
  };
}
