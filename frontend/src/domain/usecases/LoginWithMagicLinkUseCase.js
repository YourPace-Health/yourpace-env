// src/domain/usecases/LoginWithMagicLinkUseCase.js

export class LoginWithMagicLinkUseCase {
  constructor(authRepository) {
    this.authRepository = authRepository;
  }

  async execute(email) {
    if (!email || !email.includes('@')) {
      throw new Error("รูปแบบอีเมลไม่ถูกต้อง");
    }
    return await this.authRepository.requestMagicLink(email);
  }
}
