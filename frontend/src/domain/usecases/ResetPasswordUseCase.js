// src/domain/usecases/ResetPasswordUseCase.js

export class ResetPasswordUseCase {
  constructor(authRepository) {
    this.authRepository = authRepository;
  }

  async execute(email) {
    if (!email || !email.includes('@')) {
      throw new Error("รูปแบบอีเมลไม่ถูกต้อง");
    }
    return await this.authRepository.resetPassword(email);
  }
}
