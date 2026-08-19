// src/data/repositories/AuthRepositoryImpl.js

import { User } from '../../domain/entities/User';
import { AuthRepository } from '../../domain/repositories/AuthRepository';

/**
 * AuthRepositoryImpl
 * สืบทอดความสามารถจาก AuthRepository
 * ทำหน้าที่ประสานงานระหว่าง UseCases กับ Data Sources และแปลงข้อมูลภายนอก (Data Model) เป็น Domain Model (User Entity)
 */
export class AuthRepositoryImpl extends AuthRepository {
  constructor(authApiDataSource) {
    super();
    this.authApiDataSource = authApiDataSource;
  }

  // แปลง Mock/API response เป็น User Entity
  _mapToUserEntity(rawUser) {
    if (!rawUser) return null;
    return new User({
      id: rawUser.id,
      email: rawUser.email,
      name: rawUser.name,
      profilePicture: rawUser.profilePicture,
      createdAt: rawUser.createdAt
    });
  }

  async loginWithEmail(email, password, staySignedIn) {
    const session = await this.authApiDataSource.loginWithEmail(email, password, staySignedIn);
    return {
      user: this._mapToUserEntity(session.user),
      token: session.token
    };
  }

  async loginWithGoogle() {
    const session = await this.authApiDataSource.loginWithGoogle();
    return {
      user: this._mapToUserEntity(session.user),
      token: session.token
    };
  }

  async requestMagicLink(email) {
    return await this.authApiDataSource.requestMagicLink(email);
  }

  async resetPassword(email) {
    return await this.authApiDataSource.resetPassword(email);
  }

  async getCurrentUser() {
    const session = await this.authApiDataSource.getCurrentSession();
    if (!session) return null;
    return this._mapToUserEntity(session.user);
  }

  async register(username, email, password) {
    return await this.authApiDataSource.register(username, email, password);
  }

  async verifyOTP(email, otp) {
    return await this.authApiDataSource.verifyOTP(email, otp);
  }

  async logout() {
    return await this.authApiDataSource.clearSession();
  }
}
