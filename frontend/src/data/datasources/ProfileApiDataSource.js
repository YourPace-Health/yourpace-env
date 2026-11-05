// src/data/datasources/ProfileApiDataSource.js

import { API_BASE_URL } from "../../config/api";

export class ProfileApiDataSource {
  constructor() {
    this.API_URL = API_BASE_URL;
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

  async getSettings(token) {
    const response = await fetch(`${this.API_URL}/users/setting`, {
      headers: { 'Authorization': `Bearer ${token}` }
    });
    const data = await response.json();
    if (!response.ok) {
      throw new Error(data.error || "ไม่สามารถดึงการตั้งค่าได้");
    }
    return data;
  }

  // The backend replaces every field on save, so callers send the full settings object.
  async saveSettings(settings, token) {
    const response = await fetch(`${this.API_URL}/users/setting`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify(settings)
    });
    const data = await response.json();
    if (!response.ok) {
      throw new Error(data.error || "ไม่สามารถบันทึกการตั้งค่าได้");
    }
    return data;
  }
}
