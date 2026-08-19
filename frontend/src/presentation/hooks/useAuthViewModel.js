// src/presentation/hooks/useAuthViewModel.js

import { useState, useEffect } from 'react';
import { AuthApiDataSource } from '../../data/datasources/AuthApiDataSource';
import { AuthRepositoryImpl } from '../../data/repositories/AuthRepositoryImpl';
import { LoginWithEmailUseCase } from '../../domain/usecases/LoginWithEmailUseCase';
import { LoginWithGoogleUseCase } from '../../domain/usecases/LoginWithGoogleUseCase';
import { LoginWithMagicLinkUseCase } from '../../domain/usecases/LoginWithMagicLinkUseCase';
import { ResetPasswordUseCase } from '../../domain/usecases/ResetPasswordUseCase';

// สร้าง instances สำหรับสถาปัตยกรรม (ทำแบบ Singleton ในแอปจำลอง)
const authDataSource = new AuthApiDataSource();
const authRepository = new AuthRepositoryImpl(authDataSource);

const loginWithEmailUseCase = new LoginWithEmailUseCase(authRepository);
const loginWithGoogleUseCase = new LoginWithGoogleUseCase(authRepository);
const loginWithMagicLinkUseCase = new LoginWithMagicLinkUseCase(authRepository);
const resetPasswordUseCase = new ResetPasswordUseCase(authRepository);

export function useAuthViewModel() {
  const [currentUser, setCurrentUser] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);
  const [successMessage, setSuccessMessage] = useState(null);
  
  // โหมดควบคุมหน้าจอ Auth: 'signin' | 'signup' | 'forgot'
  const [authMode, setAuthMode] = useState('signin');
  // วิธีล็อกอินที่กำลังใช้งาน: 'email' | 'magic' | 'social'
  const [loginMethod, setLoginMethod] = useState('email');
  
  // State เพิ่มเติมสำหรับ OTP
  const [isVerifyingOTP, setIsVerifyingOTP] = useState(false);
  const [otpEmail, setOtpEmail] = useState('');

  const checkSession = async () => {
    setIsLoading(true);
    try {
      const user = await authRepository.getCurrentUser();
      if (user) {
        setCurrentUser(user);
      }
      return user;
    } catch (err) {
      console.error("Error restoring session:", err);
    } finally {
      setIsLoading(false);
    }
  };

  // ตรวจสอบสถานะการ Stay Signed In เมื่อผู้ใช้เปิดหน้าเว็บ
  useEffect(() => {
    checkSession();
  }, []);

  const loginWithEmail = async (email, password, staySignedIn) => {
    setIsLoading(true);
    setError(null);
    setSuccessMessage(null);
    try {
      const result = await loginWithEmailUseCase.execute(email, password, staySignedIn);
      setCurrentUser(result.user);
      setSuccessMessage("เข้าสู่ระบบเรียบร้อย! ยินดีต้อนรับกลับเข้าสู่ yourPace");
      return result.user;
    } catch (err) {
      setError(err.message || "เกิดข้อผิดพลาดในการเข้าสู่ระบบ");
      throw err;
    } finally {
      setIsLoading(false);
    }
  };

  const registerUser = async (username, email, password) => {
    setIsLoading(true);
    setError(null);
    setSuccessMessage(null);
    try {
      await authRepository.register(username, email, password);
      setOtpEmail(email);
      setIsVerifyingOTP(true);
      setSuccessMessage("สมัครสมาชิกสำเร็จแล้ว! กรุณากรอกรหัส OTP 6 หลักที่ส่งไปยังอีเมลของคุณเพื่อยืนยันตัวตน");
    } catch (err) {
      setError(err.message || "เกิดข้อผิดพลาดในการสมัครสมาชิก");
      throw err;
    } finally {
      setIsLoading(false);
    }
  };

  const confirmOTP = async (otp) => {
    setIsLoading(true);
    setError(null);
    setSuccessMessage(null);
    try {
      await authRepository.verifyOTP(otpEmail, otp);
      setIsVerifyingOTP(false);
      setAuthMode('signin');
      setSuccessMessage("ยืนยันอีเมลสำเร็จแล้ว! คุณสามารถเข้าสู่ระบบได้ทันที");
    } catch (err) {
      setError(err.message || "รหัส OTP ไม่ถูกต้องหรือหมดอายุ");
      throw err;
    } finally {
      setIsLoading(false);
    }
  };

  const loginWithGoogle = async () => {
    setIsLoading(true);
    setError(null);
    setSuccessMessage(null);
    try {
      const result = await loginWithGoogleUseCase.execute();
      setCurrentUser(result.user);
      setSuccessMessage("เข้าสู่ระบบด้วย Google สำเร็จ!");
      return result.user;
    } catch (err) {
      setError(err.message || "เกิดข้อผิดพลาดในการล็อกอินผ่าน Google");
      throw err;
    } finally {
      setIsLoading(false);
    }
  };

  const requestMagicLink = async (email) => {
    setIsLoading(true);
    setError(null);
    setSuccessMessage(null);
    try {
      const result = await loginWithMagicLinkUseCase.execute(email);
      setSuccessMessage(result.message);
      return result;
    } catch (err) {
      setError(err.message || "เกิดข้อผิดพลาดในการขอ Magic Link");
      throw err;
    } finally {
      setIsLoading(false);
    }
  };

  const requestResetPassword = async (email) => {
    setIsLoading(true);
    setError(null);
    setSuccessMessage(null);
    try {
      const result = await resetPasswordUseCase.execute(email);
      setSuccessMessage(result.message);
      return result;
    } catch (err) {
      setError(err.message || "เกิดข้อผิดพลาดในการส่งคำขอรีเซ็ตรหัสผ่าน");
      throw err;
    } finally {
      setIsLoading(false);
    }
  };

  const logout = async () => {
    setIsLoading(true);
    try {
      await authRepository.logout();
      setCurrentUser(null);
      setSuccessMessage("ออกจากระบบเรียบร้อยแล้ว");
    } catch (err) {
      setError("ไม่สามารถออกจากระบบได้");
    } finally {
      setIsLoading(false);
    }
  };

  return {
    currentUser,
    setCurrentUser,
    checkSession,
    isLoading,
    error,
    successMessage,
    authMode,
    loginMethod,
    isVerifyingOTP,
    otpEmail,
    setIsVerifyingOTP,
    setAuthMode,
    setLoginMethod,
    setError,
    setSuccessMessage,
    loginWithEmail,
    registerUser,
    confirmOTP,
    loginWithGoogle,
    requestMagicLink,
    requestResetPassword,
    logout
  };
}
