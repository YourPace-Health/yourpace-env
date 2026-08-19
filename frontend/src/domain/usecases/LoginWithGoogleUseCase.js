// src/domain/usecases/LoginWithGoogleUseCase.js

export class LoginWithGoogleUseCase {
  constructor(authRepository) {
    this.authRepository = authRepository;
  }

  async execute() {
    return await this.authRepository.loginWithGoogle();
  }
}
