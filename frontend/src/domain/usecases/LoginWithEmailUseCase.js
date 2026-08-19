// src/domain/usecases/LoginWithEmailUseCase.js

export class LoginWithEmailUseCase {
  constructor(authRepository) {
    this.authRepository = authRepository;
  }

  async execute(email, password, staySignedIn) {
    if (!email || !email.includes('@')) {
      throw new Error("รูปแบบอีเมลไม่ถูกต้อง");
    }
    if (!password || password.length < 6) {
      throw new Error("รหัสผ่านต้องมีความยาวอย่างน้อย 6 ตัวอักษร");
    }

    return await this.authRepository.loginWithEmail(email, password, staySignedIn);
  }
}
