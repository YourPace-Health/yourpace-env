// src/domain/entities/User.js

export class User {
  constructor({ id, email, name, profilePicture, createdAt }) {
    this.id = id;
    this.email = email;
    this.name = name;
    this.profilePicture = profilePicture;
    this.createdAt = createdAt || new Date().toISOString();
  }

  // Helper method เพื่อตรวจสอบว่าข้อมูลผู้ใช้สมบูรณ์หรือไม่
  isValid() {
    return !!this.id && !!this.email;
  }
}
