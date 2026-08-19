// src/data/datasources/AuthApiDataSource.js

/**
 * AuthApiDataSource
 * ทำหน้าที่ติดต่อกับ Server API และจัดเก็บ Token ของเซสชันลงใน LocalStorage/SessionStorage
 * สำหรับ Stay Signed In และเชื่อมต่อกับ Go backend จริงๆ
 */
export class AuthApiDataSource {
  constructor() {
    this.STORAGE_KEY = "yourpace_session";
    // ปรับพอร์ตอัตโนมัติ: หากรันบนพอร์ต 3000 (Docker Compose) ชี้ไปที่ 8081
    // ถ้ารันปกติ (Vite dev 5173) ชี้ไปที่ 8080
    const port = window.location.port === "3000" ? "8081" : "8080";
    this.API_URL = `http://${window.location.hostname}:${port}/api`;
  }

  async loginWithEmail(email, password, staySignedIn) {
    try {
      const response = await fetch(`${this.API_URL}/auth/login`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ email, password }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "อีเมลหรือรหัสผ่านไม่ถูกต้อง");
      }

      // แปลงข้อมูลจาก backend (accessToken, user) เป็นรูปแบบที่ frontend คาดหวัง
      const mockUser = {
        id: data.user.userId,
        email: data.user.email,
        name: data.user.username,
        profilePicture: data.user.profilePicture || `https://api.dicebear.com/7.x/adventurer/svg?seed=${data.user.username}`,
        createdAt: new Date().toISOString()
      };

      const session = { user: mockUser, token: data.accessToken };

      // จัดการ Stay Signed In
      if (staySignedIn) {
        localStorage.setItem(this.STORAGE_KEY, JSON.stringify(session));
      } else {
        sessionStorage.setItem(this.STORAGE_KEY, JSON.stringify(session));
      }

      return session;
    } catch (error) {
      console.error("Login API Error:", error);
      throw error;
    }
  }

  async register(username, email, password) {
    try {
      const response = await fetch(`${this.API_URL}/auth/register`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ username, email, password }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "ไม่สามารถลงทะเบียนได้");
      }

      return data;
    } catch (error) {
      console.error("Register API Error:", error);
      throw error;
    }
  }

  async verifyOTP(email, otp) {
    try {
      const response = await fetch(`${this.API_URL}/auth/verify-otp`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ email, otp }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "รหัส OTP ไม่ถูกต้องหรือหมดอายุ");
      }

      return data;
    } catch (error) {
      console.error("Verify OTP API Error:", error);
      throw error;
    }
  }

  async loginWithGoogle() {
    return new Promise((resolve, reject) => {
      if (!window.google || !window.google.accounts || !window.google.accounts.oauth2) {
        return reject(new Error("Google Sign-In SDK is not loaded. Please refresh the page."));
      }

      let clientId = import.meta.env.VITE_GOOGLE_CLIENT_ID || "226716244678-ikoamnt902ai4j44gfsrlct2vch6olrv.apps.googleusercontent.com";
      if (clientId.startsWith("GOCSPX-")) {
        console.warn("Detected Client Secret in VITE_GOOGLE_CLIENT_ID, falling back to valid Client ID format.");
        clientId = "226716244678-ikoamnt902ai4j44gfsrlct2vch6olrv.apps.googleusercontent.com";
      }

      const tokenClient = window.google.accounts.oauth2.initTokenClient({
        client_id: clientId,
        scope: "openid email profile",
        error_callback: (err) => {
          console.error("Google OAuth error callback:", err);
          reject(new Error("เกิดข้อผิดพลาด Google Client ID ไม่ถูกต้อง หรือไม่มีอยู่ในระบบ (401: invalid_client)"));
        },
        callback: async (tokenResponse) => {
          if (tokenResponse && tokenResponse.access_token) {
            try {
              const response = await fetch(`${this.API_URL}/auth/google`, {
                method: "POST",
                headers: {
                  "Content-Type": "application/json",
                },
                body: JSON.stringify({ accessToken: tokenResponse.access_token }),
              });

              const data = await response.json();
              if (!response.ok) {
                return reject(new Error(data.error || "ล็อกอินผ่าน Google ล้มเหลว"));
              }

              const user = {
                id: data.user.userId,
                email: data.user.email,
                name: data.user.username,
                profilePicture: data.user.profilePicture || `https://api.dicebear.com/7.x/adventurer/svg?seed=${data.user.username}`,
                createdAt: new Date().toISOString()
              };

              const session = { user, token: data.accessToken };
              localStorage.setItem(this.STORAGE_KEY, JSON.stringify(session));
              resolve(session);
            } catch (err) {
              console.error("Google login backend verification error:", err);
              reject(err);
            }
          } else {
            reject(new Error("การขออนุญาตจาก Google ถูกยกเลิกหรือไม่ได้รับสิทธิ์"));
          }
        },
      });

      tokenClient.requestAccessToken();
    });
  }

  async requestMagicLink(email) {
    // จำลอง
    return { success: true, message: `ส่ง Magic Link ไปที่ ${email} เรียบร้อยแล้ว กรุณาเช็คอินบ็อกซ์ของคุณ` };
  }

  async resetPassword(email) {
    // จำลอง
    return { success: true, message: `ส่งลิงก์ตั้งค่ารหัสผ่านใหม่ไปที่ ${email} เรียบร้อยแล้ว` };
  }

  async getCurrentSession() {
    // ดึงเซสชันจากทั้ง Local และ Session Storage
    const localData = localStorage.getItem(this.STORAGE_KEY);
    if (localData) return JSON.parse(localData);

    const sessionData = sessionStorage.getItem(this.STORAGE_KEY);
    if (sessionData) return JSON.parse(sessionData);

    return null;
  }

  async clearSession() {
    localStorage.removeItem(this.STORAGE_KEY);
    sessionStorage.removeItem(this.STORAGE_KEY);
    return true;
  }

  async getTodayWaterLog() {
    try {
      const session = await this.getCurrentSession();
      if (!session || !session.token) return null;

      const response = await fetch(`${this.API_URL}/water/today`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${session.token}`,
          'Content-Type': 'application/json'
        }
      });

      if (!response.ok) return null;
      return await response.json();
    } catch (error) {
      console.error("Get Water Log Error:", error);
      return null;
    }
  }

  async updateTodayWaterLog(glasses, amountMl) {
    try {
      const session = await this.getCurrentSession();
      if (!session || !session.token) return null;

      const body = {};
      if (typeof glasses === 'number') body.glasses = glasses;
      if (typeof amountMl === 'number') body.amountMl = amountMl;

      const response = await fetch(`${this.API_URL}/water/today`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${session.token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(body)
      });

      if (!response.ok) return null;
      return await response.json();
    } catch (error) {
      console.error("Update Water Log Error:", error);
      return null;
    }
  }
}
