// src/data/datasources/MentorApiDataSource.js

export class MentorApiDataSource {
  constructor() {
    const port = window.location.port === "3000" ? "8081" : "8080";
    this.API_URL = `http://${window.location.hostname}:${port}/api`;
  }

  async chatWithMentor(message, token) {
    try {
      const response = await fetch(`${this.API_URL}/mentor/chat`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ message })
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "ไม่สามารถเชื่อมต่อกับ AI Mentor ได้");
      }

      return data.response; // คืนค่าข้อความตอบกลับจาก AI
    } catch (error) {
      console.error("Mentor Chat API Error:", error);
      throw error;
    }
  }

  async getChatHistory(token) {
    try {
      const response = await fetch(`${this.API_URL}/mentor/history`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "ไม่สามารถดึงประวัติการสนทนาได้");
      }

      return data.messages || [];
    } catch (error) {
      console.error("Get Chat History API Error:", error);
      throw error;
    }
  }

  async clearChatHistory(token) {
    try {
      const response = await fetch(`${this.API_URL}/mentor/history`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "ไม่สามารถล้างประวัติการสนทนาได้");
      }

      return true;
    } catch (error) {
      console.error("Clear Chat History API Error:", error);
      throw error;
    }
  }
}
