// src/domain/repositories/AuthRepository.js

/**
 * AuthRepository Interface
 * กำหนดสัญญา (Contracts) สำหรับการยืนยันตัวตนในระบบ
 * เลเยอร์ Data จะเป็นผู้ทำหน้าที่ประยุกต์ใช้งาน (Implementation) ของ Interface นี้
 */
export class AuthRepository {
  async loginWithEmail(_email, _password, _staySignedIn) {
    throw new Error("Method 'loginWithEmail()' must be implemented");
  }

  async loginWithGoogle() {
    throw new Error("Method 'loginWithGoogle()' must be implemented");
  }

  async requestMagicLink(_email) {
    throw new Error("Method 'requestMagicLink()' must be implemented");
  }

  async verifyMagicLink(_token) {
    throw new Error("Method 'verifyMagicLink()' must be implemented");
  }

  async resetPassword(_email) {
    throw new Error("Method 'resetPassword()' must be implemented");
  }

  async getCurrentUser() {
    throw new Error("Method 'getCurrentUser()' must be implemented");
  }

  async register(_username, _email, _password) {
    throw new Error("Method 'register()' must be implemented");
  }

  async verifyOTP(_email, _otp) {
    throw new Error("Method 'verifyOTP()' must be implemented");
  }

  async logout() {
    throw new Error("Method 'logout()' must be implemented");
  }
}
