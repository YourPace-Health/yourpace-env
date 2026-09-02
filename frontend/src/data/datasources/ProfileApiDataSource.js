// src/data/datasources/ProfileApiDataSource.js

export class ProfileApiDataSource {
  constructor() {
    const port = (typeof import.meta !== 'undefined' && import.meta.env?.VITE_BACKEND_PORT) || (window.location.port === "8080" ? "8080" : "8081");
    this.API_URL = `http://${window.location.hostname}:${port}/api`;
  }

  async getUserProfile(token) {
    try {
      const response = await fetch(`${this.API_URL}/users/profile`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        }
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "ไม่สามารถดึงข้อมูลโปรไฟล์ได้");
      }

      return data;
    } catch (error) {
      console.error("Get Profile API Error:", error);
      throw error;
    }
  }

  async updateUserProfile(profileData, token) {
    try {
      const response = await fetch(`${this.API_URL}/users/profile`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(profileData)
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "ไม่สามารถอัปเดตข้อมูลโปรไฟล์ได้");
      }

      return data;
    } catch (error) {
      console.error("Update Profile API Error:", error);
      throw error;
    }
  }

  async getEquipments(token) {
    try {
      const response = await fetch(`${this.API_URL}/equipments`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        }
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "ไม่สามารถดึงข้อมูลอุปกรณ์ได้");
      }

      return data;
    } catch (error) {
      console.error("Get Equipments API Error:", error);
      throw error;
    }
  }
}
