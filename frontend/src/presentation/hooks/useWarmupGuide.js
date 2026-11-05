import { useState } from 'react';
import { detectWorkoutMuscleCategory } from '../../data/warmupCooldownData';

export function useWarmupGuide() {
  // Warm-up & Cool-down Guide Modal States
  const [showWarmupModal, setShowWarmupModal] = useState(false);

  const [warmupSelectedTab, setWarmupSelectedTab] = useState('warmup'); // 'warmup' | 'cooldown'

  const [warmupCategory, setWarmupCategory] = useState('UPPER_BODY'); // 'UPPER_BODY' | 'LOWER_BODY' | 'CORE_CARDIO'

  const [warmupModalTitle, setWarmupModalTitle] = useState('');

  const [completedWarmupIds, setCompletedWarmupIds] = useState(new Set());

  const handleOpenWarmupGuide = (title = '', description = '', defaultTab = 'warmup') => {
    const detectedCategory = detectWorkoutMuscleCategory(title, description);
    setWarmupCategory(detectedCategory);
    setWarmupModalTitle(title);
    setWarmupSelectedTab(defaultTab);
    setShowWarmupModal(true);
  };

  const handleToggleWarmupCheck = (exerciseId) => {
    setCompletedWarmupIds(prev => {
      const next = new Set(prev);
      if (next.has(exerciseId)) {
        next.delete(exerciseId);
      } else {
        next.add(exerciseId);
      }
      return next;
    });
  };

  return {
    showWarmupModal,
    setShowWarmupModal,
    warmupSelectedTab,
    setWarmupSelectedTab,
    warmupCategory,
    setWarmupCategory,
    warmupModalTitle,
    completedWarmupIds,
    setCompletedWarmupIds,
    handleOpenWarmupGuide,
    handleToggleWarmupCheck,
  };
}
