// src/data/datasources/MealApiDataSource.js

export class MealApiDataSource {
  constructor() {
    const port = (typeof import.meta !== 'undefined' && import.meta.env?.VITE_BACKEND_PORT) || (window.location.port === "8080" ? "8080" : "8081");
    this.API_URL = `http://${window.location.hostname}:${port}/api`;
  }

  async getTodayMeals(token) {
    try {
      const response = await fetch(`${this.API_URL}/meals/today`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        }
      });
      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error || "ไม่สามารถดึงข้อมูลมื้ออาหารวันนี้ได้");
      }
      return data;
    } catch (error) {
      console.error("Get Today Meals API Error:", error);
      throw error;
    }
  }

  async previewMealAnalysis(mealDescription, token) {
    try {
      const response = await fetch(`${this.API_URL}/meals/preview`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ mealDescription })
      });
      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error || "ไม่สามารถวิเคราะห์มื้ออาหารได้");
      }
      return data;
    } catch (error) {
      console.error("Preview Meal Analysis API Error:", error);
      throw error;
    }
  }

  async logMeal(mealData, token) {
    try {
      const response = await fetch(`${this.API_URL}/meals/log`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(mealData)
      });
      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error || "ไม่สามารถบันทึกมื้ออาหารได้");
      }
      return data;
    } catch (error) {
      console.error("Log Meal API Error:", error);
      throw error;
    }
  }

  async analyzeMealPhoto(imageData, mimeType, token) {
    try {
      const response = await fetch(`${this.API_URL}/meals/analyze-photo`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ imageData, mimeType: mimeType || 'image/jpeg' })
      });
      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error || "ไม่สามารถวิเคราะห์ภาพถ่ายอาหารได้");
      }
      return data;
    } catch (error) {
      console.error("Analyze Meal Photo API Error:", error);
      throw error;
    }
  }

  async getEnergyBalance(token) {
    try {
      const response = await fetch(`${this.API_URL}/meals/energy-balance`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        }
      });
      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error || "ไม่สามารถดึงข้อมูลสมดุลพลังงานได้");
      }
      return data;
    } catch (error) {
      console.error("Get Energy Balance API Error:", error);
      throw error;
    }
  }

  async getWeeklyAnalytics(token) {
    try {
      const response = await fetch(`${this.API_URL}/meals/weekly-analytics`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        }
      });
      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error || "ไม่สามารถดึงข้อมูลสถิติรายสัปดาห์ได้");
      }
      return data;
    } catch (error) {
      console.error("Get Weekly Analytics API Error:", error);
      throw error;
    }
  }

  async getDailyCoachFeedback(token) {
    try {
      const response = await fetch(`${this.API_URL}/meals/coach-feedback`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        }
      });
      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error || "ไม่สามารถดึงข้อคิดเห็นจากโค้ชได้");
      }
      return data;
    } catch (error) {
      console.error("Get Daily Coach Feedback API Error:", error);
      throw error;
    }
  }

  async deleteMeal(mealId, token) {
    try {
      const response = await fetch(`${this.API_URL}/meals/${mealId}`, {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        }
      });
      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error || "ไม่สามารถลบมื้ออาหารได้");
      }
      return data;
    } catch (error) {
      console.error("Delete Meal API Error:", error);
      throw error;
    }
  }
}
