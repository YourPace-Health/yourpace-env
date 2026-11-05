import { useState } from 'react';

/**
 * Meal & nutrition tracker: today's meals, energy balance, weekly analytics, coach feedback,
 * and the log-meal modal flow (text or photo analysis, save, delete).
 */
export function useMealTracker({ getSessionToken, mealDataSource }) {
  // Meal & AI Nutrition Tracker States
  const [todayMealsSummary, setTodayMealsSummary] = useState(null);
  const [showLogMealModal, setShowLogMealModal] = useState(false);
  const [mealModalMode, setMealModalMode] = useState('text'); // 'text' | 'photo'
  const [photoPreview, setPhotoPreview] = useState(null);
  const [photoBase64, setPhotoBase64] = useState('');
  const [photoMimeType, setPhotoMimeType] = useState('image/jpeg');
  const [isAnalyzingPhoto, setIsAnalyzingPhoto] = useState(false);
  const [mealForm, setMealForm] = useState({
    mealType: 'LUNCH',
    mealDescription: '',
    calories: '',
    protein: '',
    carbs: '',
    fat: ''
  });
  const [mealAnalysisPreview, setMealAnalysisPreview] = useState(null);
  const [isAnalyzingMeal, setIsAnalyzingMeal] = useState(false);
  const [isSavingMeal, setIsSavingMeal] = useState(false);

  // New Nutrition Feature States
  const [nutritionSubTab, setNutritionSubTab] = useState('tracker'); // 'tracker' | 'energy' | 'hydration' | 'analytics' | 'coach'
  const [energyBalance, setEnergyBalance] = useState(null);
  const [weeklyNutrition, setWeeklyNutrition] = useState(null);
  const [coachFeedback, setCoachFeedback] = useState(null);

  // Fetch Today Meals & Nutrition
  const loadTodayMeals = async (authToken) => {
    const activeTok = authToken || getSessionToken();
    if (!activeTok) return;
    try {
      const data = await mealDataSource.getTodayMeals(activeTok);
      setTodayMealsSummary(data);
      loadEnergyBalance(activeTok);
      loadWeeklyNutrition(activeTok);
      loadCoachFeedback(activeTok);
    } catch (err) {
      console.error("Failed to load today meals:", err);
    }
  };

  // Load Energy Balance
  const loadEnergyBalance = async (authToken) => {
    const activeTok = authToken || getSessionToken();
    if (!activeTok) return;
    try {
      const data = await mealDataSource.getEnergyBalance(activeTok);
      setEnergyBalance(data);
    } catch (err) {
      console.error("Failed to load energy balance:", err);
    }
  };

  // Load Weekly Nutrition
  const loadWeeklyNutrition = async (authToken) => {
    const activeTok = authToken || getSessionToken();
    if (!activeTok) return;
    try {
      const data = await mealDataSource.getWeeklyAnalytics(activeTok);
      setWeeklyNutrition(data);
    } catch (err) {
      console.error("Failed to load weekly nutrition:", err);
    }
  };

  // Load Coach Feedback
  const loadCoachFeedback = async (authToken) => {
    const activeTok = authToken || getSessionToken();
    if (!activeTok) return;
    try {
      const data = await mealDataSource.getDailyCoachFeedback(activeTok);
      setCoachFeedback(data);
    } catch (err) {
      console.error("Failed to load coach feedback:", err);
    }
  };

  // Handle Photo Selection
  const handlePhotoFileSelect = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setPhotoMimeType(file.type || 'image/jpeg');
    const reader = new FileReader();
    reader.onload = (event) => {
      const result = event.target.result;
      setPhotoPreview(result);
      setPhotoBase64(result);
    };
    reader.readAsDataURL(file);
  };

  // Analyze Photo with Gemini Vision AI
  const handleAnalyzePhoto = async () => {
    const token = getSessionToken();
    if (!photoBase64 || !token) {
      alert("กรุณาเลือกรูปภาพอาหารก่อนทำการวิเคราะห์");
      return;
    }
    setIsAnalyzingPhoto(true);
    try {
      const result = await mealDataSource.analyzeMealPhoto(photoBase64, photoMimeType, token);
      setMealAnalysisPreview(result);
      setMealForm(prev => ({
        ...prev,
        mealDescription: result.summary ? result.summary.split(' - ')[0] : 'อาหารที่ตรวจพบในภาพ',
        calories: result.calories !== undefined ? result.calories : '',
        protein: result.protein !== undefined ? result.protein : '',
        carbs: result.carbs !== undefined ? result.carbs : '',
        fat: result.fat !== undefined ? result.fat : ''
      }));
    } catch (err) {
      console.error("Analyze photo error:", err);
      alert("ไม่สามารถวิเคราะห์ภาพอาหารได้ในขณะนี้: " + (err.message || ""));
    } finally {
      setIsAnalyzingPhoto(false);
    }
  };

  // AI Meal Preview Analysis
  const handleAnalyzeMealPreview = async () => {
    const token = getSessionToken();
    if (!mealForm.mealDescription.trim() || !token) {
      if (!token) alert("ไม่พบข้อมูลการเข้าสู่ระบบ กรุณาเข้าสู่ระบบใหม่อีกครั้ง");
      return;
    }
    setIsAnalyzingMeal(true);
    try {
      const preview = await mealDataSource.previewMealAnalysis(mealForm.mealDescription, token);
      setMealAnalysisPreview(preview);
      setMealForm(prev => ({
        ...prev,
        calories: preview.calories !== undefined ? preview.calories : '',
        protein: preview.protein !== undefined ? preview.protein : '',
        carbs: preview.carbs !== undefined ? preview.carbs : '',
        fat: preview.fat !== undefined ? preview.fat : ''
      }));
    } catch (err) {
      console.error("Failed to preview meal analysis:", err);
      alert("ไม่สามารถวิเคราะห์อาหารได้ในขณะนี้: " + (err.message || ""));
    } finally {
      setIsAnalyzingMeal(false);
    }
  };

  // Save Meal to DB
  const handleSaveMeal = async (e) => {
    e.preventDefault();
    const token = getSessionToken();
    if (!mealForm.mealDescription.trim() || !token) {
      if (!token) alert("ไม่พบข้อมูลการเข้าสู่ระบบ กรุณาเข้าสู่ระบบใหม่อีกครั้ง");
      return;
    }
    setIsSavingMeal(true);
    try {
      const payload = {
        mealType: mealForm.mealType,
        mealDescription: mealForm.mealDescription,
        calories: mealForm.calories ? parseFloat(mealForm.calories) : undefined,
        protein: mealForm.protein ? parseFloat(mealForm.protein) : undefined,
        carbs: mealForm.carbs ? parseFloat(mealForm.carbs) : undefined,
        fat: mealForm.fat ? parseFloat(mealForm.fat) : undefined
      };
      await mealDataSource.logMeal(payload, token);
      setShowLogMealModal(false);
      setMealForm({ mealType: 'LUNCH', mealDescription: '', calories: '', protein: '', carbs: '', fat: '' });
      setMealAnalysisPreview(null);
      await loadTodayMeals(token);
    } catch (err) {
      console.error("Failed to log meal:", err);
      alert("เกิดข้อผิดพลาดในการบันทึกมื้ออาหาร: " + (err.message || ""));
    } finally {
      setIsSavingMeal(false);
    }
  };

  // Delete Meal
  const handleDeleteMeal = async (mealId) => {
    const token = getSessionToken();
    if (!token) return;
    if (!window.confirm("คุณต้องการลบรายการมื้ออาหารนี้ใช่หรือไม่?")) return;
    try {
      await mealDataSource.deleteMeal(mealId, token);
      await loadTodayMeals(token);
    } catch (err) {
      console.error("Failed to delete meal:", err);
      alert("ไม่สามารถลบมื้ออาหารได้: " + (err.message || ""));
    }
  };

  return {
    todayMealsSummary,
    showLogMealModal,
    setShowLogMealModal,
    mealModalMode,
    setMealModalMode,
    photoPreview,
    setPhotoPreview,
    setPhotoBase64,
    isAnalyzingPhoto,
    mealForm,
    setMealForm,
    mealAnalysisPreview,
    setMealAnalysisPreview,
    isAnalyzingMeal,
    isSavingMeal,
    nutritionSubTab,
    setNutritionSubTab,
    energyBalance,
    weeklyNutrition,
    coachFeedback,
    loadTodayMeals,
    loadEnergyBalance,
    loadWeeklyNutrition,
    loadCoachFeedback,
    handlePhotoFileSelect,
    handleAnalyzePhoto,
    handleAnalyzeMealPreview,
    handleSaveMeal,
    handleDeleteMeal,
  };
}
