import { useState } from 'react';

export function useCheckinDemo() {
  // Check-in simulator states (for landing page demo)
  const [checkinStatus, setCheckinStatus] = useState(null);

  const [isAnalyzing, setIsAnalyzing] = useState(false);

  const [aiRecommendation, setAiRecommendation] = useState('');

  // Equipment interactive list
  const [selectedEquipment, setSelectedEquipment] = useState(['bodyweight']);

  const handleCheckin = (status) => {
    setCheckinStatus(status);
    setIsAnalyzing(true);

    setTimeout(() => {
      setIsAnalyzing(false);
      let recommendation;
      switch (status) {
        case 'energetic':
          recommendation = '🔋 พลังงานเต็มเปี่ยม! AI แนะนำโปรแกรม Strength Training หนัก 45 นาที ร่วมกับคาร์ดิโอความเข้มข้นสูง (HIIT) เพื่อเผาผลาญไขมันสูงสุด และแนะนำเน้นโปรตีนหลังออกกำลังกาย';
          break;
        case 'tired':
          recommendation = '😴 ร่างกายต้องการการฟื้นฟู! วันนี้ควรเน้นการยืดเหยียดโยคะ 20 นาที และเน้นดื่มน้ำมากๆ หลีกเลี่ยงคาร์ดิโอหนัก เพื่อช่วยให้กล้ามเนื้อได้คลายตัวและนอนหลับได้ดียิ่งขึ้น';
          break;
        case 'stressed':
          recommendation = '🧘 ผ่อนคลายจิตใจก่อน! แนะนำการฝึกหายใจ (Mindful Breathing) 5 นาที ผสมผสานกับการเดินเบาๆ (LISS) 15 นาที เพื่อลดฮอร์โมนความเครียด (Cortisol) และเพิ่มระดับฮอร์โมนแห่งความสุข';
          break;
        case 'focused':
          recommendation = '🎯 มีสมาธิดีเยี่ยม! เหมาะกับทักษะการออกกำลังกายที่ซับซ้อน เช่น การฝึกท่าบอดี้เวทขั้นสูง (Calisthenics) หรือการฝึกซ้อมความทนทานของกล้ามเนื้อ (Endurance)';
          break;
        default:
          recommendation = '';
      }
      setAiRecommendation(recommendation);
    }, 1000);
  };

  const handleEquipmentToggle = (id) => {
    if (selectedEquipment.includes(id)) {
      if (selectedEquipment.length > 1) {
        setSelectedEquipment(selectedEquipment.filter(item => item !== id));
      }
    } else {
      setSelectedEquipment([...selectedEquipment, id]);
    }
  };

  return {
    checkinStatus,
    isAnalyzing,
    aiRecommendation,
    selectedEquipment,
    handleCheckin,
    handleEquipmentToggle,
  };
}
