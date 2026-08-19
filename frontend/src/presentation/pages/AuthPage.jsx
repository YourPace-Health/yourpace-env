// src/presentation/pages/AuthPage.jsx

import React, { useState } from 'react';
import { useAuthViewModel } from '../hooks/useAuthViewModel';
import { SocialLogin } from '../components/Auth/SocialLogin';
import { LoginForm } from '../components/Auth/LoginForm';
import { MagicLinkForm } from '../components/Auth/MagicLinkForm';
import { ForgotPasswordForm } from '../components/Auth/ForgotPasswordForm';
import { Bot, ShieldCheck, Mail, Sparkles, X, ArrowLeft } from 'lucide-react';

export function AuthPage({ onBackToHome, onAuthSuccess }) {
  const {
    currentUser,
    isLoading,
    error,
    successMessage,
    authMode,
    loginMethod,
    setAuthMode,
    setLoginMethod,
    setError,
    setSuccessMessage,
    loginWithEmail,
    loginWithGoogle,
    requestMagicLink,
    requestResetPassword,
    isVerifyingOTP,
    setIsVerifyingOTP,
    registerUser,
    confirmOTP,
    otpEmail
  } = useAuthViewModel();

  const handleEmailLoginSubmit = async ({ email, password, staySignedIn }) => {
    try {
      const user = await loginWithEmail(email, password, staySignedIn);
      if (onAuthSuccess) {
        onAuthSuccess(user);
      }
    } catch (err) {
      // Error handled by ViewModel state
    }
  };

  const handleGoogleLoginSubmit = async () => {
    try {
      const user = await loginWithGoogle();
      if (onAuthSuccess) {
        onAuthSuccess(user);
      }
    } catch (err) {
      // Error handled by ViewModel state
    }
  };

  const handleMagicLinkSubmit = async (email) => {
    try {
      await requestMagicLink(email);
    } catch (err) {
      // Error handled by ViewModel state
    }
  };

  const handleResetPasswordSubmit = async (email) => {
    try {
      await requestResetPassword(email);
    } catch (err) {
      // Error handled by ViewModel state
    }
  };

  return (
    <div style={{
      minHeight: '100vh',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      padding: '40px 20px',
      background: 'linear-gradient(135deg, #f4fcf9 0%, #f0f4f8 100%)',
      position: 'relative'
    }}>
      {/* Back to Landing Page floating button */}
      <button
        onClick={onBackToHome}
        style={{
          position: 'absolute',
          top: '24px',
          left: '24px',
          display: 'flex',
          alignItems: 'center',
          gap: '8px',
          padding: '10px 18px',
          borderRadius: 'var(--radius-full)',
          border: '1px solid #cbd5e1',
          background: '#ffffff',
          color: 'var(--text-muted)',
          fontSize: '14px',
          fontWeight: '600',
          cursor: 'pointer',
          boxShadow: 'var(--shadow-sm)',
          transition: 'var(--transition)'
        }}
        onMouseEnter={(e) => {
          e.currentTarget.style.color = 'var(--text-dark)';
          e.currentTarget.style.transform = 'translateX(-2px)';
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.color = 'var(--text-muted)';
          e.currentTarget.style.transform = 'translateX(0)';
        }}
      >
        <ArrowLeft size={16} />
        <span>กลับหน้าแรก yourPace</span>
      </button>

      {/* Main Authentication Container Card */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: '1fr 1.1fr',
        width: '100%',
        maxWidth: '960px',
        background: '#ffffff',
        borderRadius: 'var(--radius-lg)',
        boxShadow: 'var(--shadow-lg)',
        overflow: 'hidden',
        minHeight: '600px'
      }}>
        
        {/* Left Side: Brand Visual & Value Proposition */}
        <div style={{
          background: 'linear-gradient(135deg, var(--primary) 0%, #0052cc 100%)',
          color: 'white',
          padding: '60px 48px',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'space-between',
          position: 'relative',
          overflow: 'hidden'
        }}>
          {/* Overlay background decorative elements */}
          <div style={{
            position: 'absolute',
            top: '-20%',
            right: '-20%',
            width: '300px',
            height: '300px',
            background: 'rgba(255, 255, 255, 0.05)',
            borderRadius: '50%'
          }}></div>
          <div style={{
            position: 'absolute',
            bottom: '-10%',
            left: '-10%',
            width: '200px',
            height: '200px',
            background: 'rgba(255, 255, 255, 0.03)',
            borderRadius: '50%'
          }}></div>

          {/* Logo */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', zIndex: 10 }}>
            <div style={{
              background: 'white',
              color: 'var(--primary)',
              width: '36px',
              height: '36px',
              borderRadius: 'var(--radius-sm)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontWeight: '800',
              fontSize: '18px'
            }}>YP</div>
            <span style={{ fontSize: '22px', fontWeight: '800', letterSpacing: '-0.5px' }}>yourPace</span>
          </div>

          {/* Text Showcase */}
          <div style={{ margin: '40px 0', zIndex: 10 }}>
            <h2 style={{ fontSize: '38px', fontWeight: '800', lineHeight: '1.2', marginBottom: '20px', color: 'white' }}>
              เปลี่ยนเป้าหมายให้กลายเป็นความจริง
            </h2>
            <p style={{ fontSize: '16px', opacity: 0.9, lineHeight: '1.6', marginBottom: '32px' }}>
              เข้าสู่ระบบเพื่อใช้งานแผนการซ้อมสุขภาพ ออกแบบตารางออกกำลังกายตามอุปกรณ์ที่คุณมี 
              และพูดคุยปรึกษากับ AI Personal Health Mentor ของคุณได้โดยไม่มีข้อจำกัด
            </p>

            {/* Testimonial preview */}
            <div style={{ 
              background: 'rgba(255, 255, 255, 0.08)', 
              backdropFilter: 'blur(8px)',
              padding: '20px', 
              borderRadius: 'var(--radius-md)',
              border: '1px solid rgba(255, 255, 255, 0.12)' 
            }}>
              <p style={{ fontSize: '14px', fontStyle: 'italic', marginBottom: '12px', lineHeight: '1.5' }}>
                "ระบบเช็คอินสภาพร่างกายของ yourPace ทำให้ชีวิตง่ายขึ้นมาก วันไหนเหนื่อย AI ก็ช่วยปรับตารางให้แบบนุ่มนวล รักฟีเจอร์นี้มากครับ!"
              </p>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <div style={{ width: '32px', height: '32px', borderRadius: '50%', backgroundColor: 'white', display: 'flex', alignItems: 'center', justifyItems: 'center', justifyContent: 'center', color: 'var(--primary)', fontWeight: 'bold', fontSize: '12px' }}>
                  SK
                </div>
                <div>
                  <h5 style={{ fontSize: '13px', fontWeight: '700', color: 'white' }}>สมศักดิ์ เกียรติทวี</h5>
                  <span style={{ fontSize: '11px', opacity: 0.7 }}>ผู้ใช้งานจริงมาแล้ว 3 เดือน</span>
                </div>
              </div>
            </div>
          </div>

          {/* Trust badges */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '20px', fontSize: '13px', opacity: 0.8, zIndex: 10 }}>
            <span style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              <ShieldCheck size={16} /> ข้อมูลปลอดภัย 100%
            </span>
            <span style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              <Bot size={16} /> ขับเคลื่อนด้วย AI
            </span>
          </div>
        </div>

        {/* Right Side: Auth Forms */}
        <div style={{
          padding: '50px 48px',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'center',
          position: 'relative'
        }}>
          
          {/* Notification Alerts */}
          {error && (
            <div style={{
              background: '#fef2f2',
              border: '1px solid #fca5a5',
              borderRadius: 'var(--radius-sm)',
              padding: '12px 16px',
              marginBottom: '20px',
              fontSize: '14px',
              color: '#b91c1c',
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center'
            }}>
              <span>{error}</span>
              <button onClick={() => setError(null)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#b91c1c' }}>
                <X size={16} />
              </button>
            </div>
          )}

          {successMessage && (
            <div style={{
              background: '#f0fdf4',
              border: '1px solid #86efac',
              borderRadius: 'var(--radius-sm)',
              padding: '12px 16px',
              marginBottom: '20px',
              fontSize: '14px',
              color: '#15803d',
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center'
            }}>
              <span>{successMessage}</span>
              <button onClick={() => setSuccessMessage(null)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#15803d' }}>
                <X size={16} />
              </button>
            </div>
          )}

              {/* Check different auth states */}
              {isVerifyingOTP ? (
                <form onSubmit={async (e) => {
                  e.preventDefault();
                  const otp = e.target.otp.value;
                  try {
                    await confirmOTP(otp);
                  } catch (err) {
                    // Handled by VM state
                  }
                }} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                  <div style={{ textAlign: 'left', marginBottom: '16px' }}>
                    <h3 style={{ fontSize: '24px', fontWeight: '800', color: 'var(--text-dark)', marginBottom: '8px' }}>
                      ยืนยันรหัส OTP
                    </h3>
                    <p style={{ color: 'var(--text-muted)', fontSize: '14px' }}>
                      กรุณากรอกรหัส OTP 6 หลักที่ส่งไปยังอีเมล <strong>{otpEmail}</strong> ของคุณ
                    </p>
                  </div>
                  <div>
                    <label style={{ display: 'block', fontSize: '13px', fontWeight: '600', color: 'var(--text-dark)', marginBottom: '6px' }}>
                      รหัส OTP 6 หลัก
                    </label>
                    <input
                      name="otp"
                      type="text"
                      maxLength={6}
                      required
                      placeholder="123456"
                      style={{
                        width: '100%',
                        padding: '12px 14px',
                        borderRadius: 'var(--radius-sm)',
                        border: '1px solid #cbd5e1',
                        fontSize: '18px',
                        fontWeight: 'bold',
                        textAlign: 'center',
                        letterSpacing: '8px',
                        outline: 'none'
                      }}
                    />
                  </div>
                  <button type="submit" className="btn btn-primary" style={{ width: '100%', padding: '14px', fontSize: '15px', marginTop: '10px' }}>
                    {isLoading ? 'กำลังตรวจสอบ...' : 'ยืนยันรหัส OTP'}
                  </button>
                  <button
                    type="button"
                    onClick={() => setIsVerifyingOTP(false)}
                    style={{
                      background: 'none',
                      border: 'none',
                      color: 'var(--text-muted)',
                      cursor: 'pointer',
                      fontSize: '13px',
                      textDecoration: 'underline',
                      marginTop: '8px'
                    }}
                  >
                    ย้อนกลับไปหน้าสมัครสมาชิก
                  </button>
                </form>
              ) : authMode === 'forgot' ? (
                <ForgotPasswordForm 
                  onSubmit={handleResetPasswordSubmit} 
                  isLoading={isLoading} 
                  onBackToLoginClick={() => setAuthMode('signin')}
                />
              ) : (
                <div>
                  {/* Form header */}
                  <div style={{ textAlign: 'left', marginBottom: '24px' }}>
                    <h3 style={{ fontSize: '28px', fontWeight: '800', color: 'var(--text-dark)', marginBottom: '8px' }}>
                      {authMode === 'signin' ? 'ยินดีต้อนรับกลับมา' : 'สร้างบัญชีใช้งานฟรี'}
                    </h3>
                    <p style={{ color: 'var(--text-muted)', fontSize: '14px' }}>
                      {authMode === 'signin' 
                        ? 'กรอกข้อมูลส่วนตัวเพื่อเข้าใช้งานระบบ AI mentor' 
                        : 'สมัครบัญชี yourPace วันนี้เพื่อเริ่มต้นปฏิวัติสุขภาพของคุณ'
                      }
                    </p>
                  </div>

                  {/* Social Google Login option (Available for both Login and Register) */}
                  <SocialLogin onGoogleLogin={handleGoogleLoginSubmit} isLoading={isLoading} />

                  {/* Tab Selector for Login Methods (only on Sign In mode) */}
                  {authMode === 'signin' && (
                    <div style={{
                      display: 'flex',
                      borderBottom: '1px solid #cbd5e1',
                      marginBottom: '24px',
                      gap: '20px'
                    }}>
                      <button
                        onClick={() => setLoginMethod('email')}
                        style={{
                          padding: '10px 4px',
                          background: 'none',
                          border: 'none',
                          borderBottom: `2px solid ${loginMethod === 'email' ? 'var(--primary)' : 'transparent'}`,
                          color: loginMethod === 'email' ? 'var(--text-dark)' : 'var(--text-muted)',
                          fontWeight: '600',
                          fontSize: '14px',
                          cursor: 'pointer',
                          transition: 'var(--transition)'
                        }}
                      >
                        อีเมลและรหัสผ่าน
                      </button>
                      <button
                        onClick={() => setLoginMethod('magic')}
                        style={{
                          padding: '10px 4px',
                          background: 'none',
                          border: 'none',
                          borderBottom: `2px solid ${loginMethod === 'magic' ? 'var(--primary)' : 'transparent'}`,
                          color: loginMethod === 'magic' ? 'var(--text-dark)' : 'var(--text-muted)',
                          fontWeight: '600',
                          fontSize: '14px',
                          cursor: 'pointer',
                          transition: 'var(--transition)'
                        }}
                      >
                        Magic Link (ไร้รหัสผ่าน)
                      </button>
                    </div>
                  )}

                  {/* Switchable login / register forms */}
                  {authMode === 'signin' ? (
                    loginMethod === 'email' ? (
                      <LoginForm 
                        onSubmit={handleEmailLoginSubmit} 
                        isLoading={isLoading} 
                        onForgotPasswordClick={() => setAuthMode('forgot')}
                      />
                    ) : (
                      <MagicLinkForm 
                        onSubmit={handleMagicLinkSubmit} 
                        isLoading={isLoading}
                      />
                    )
                  ) : (
                    /* Sign up/Register Form (Simply reusing email register style logic) */
                    <form onSubmit={async (e) => {
                      e.preventDefault();
                      const username = e.target.username.value;
                      const email = e.target.email.value;
                      const password = e.target.password.value;
                      try {
                        await registerUser(username, email, password);
                      } catch (err) {
                        // Handled by VM state
                      }
                    }} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                      <div>
                        <label style={{ display: 'block', fontSize: '13px', fontWeight: '600', color: 'var(--text-dark)', marginBottom: '6px' }}>
                          ชื่อผู้ใช้
                        </label>
                        <input
                          name="username"
                          type="text"
                          required
                          placeholder="สมชาย รักดี"
                          style={{
                            width: '100%',
                            padding: '12px 14px',
                            borderRadius: 'var(--radius-sm)',
                            border: '1px solid #cbd5e1',
                            fontSize: '14px',
                            outline: 'none'
                          }}
                        />
                      </div>
                      <div>
                        <label style={{ display: 'block', fontSize: '13px', fontWeight: '600', color: 'var(--text-dark)', marginBottom: '6px' }}>
                          อีเมล
                        </label>
                        <input
                          name="email"
                          type="email"
                          required
                          placeholder="somchai@yourpace.com"
                          style={{
                            width: '100%',
                            padding: '12px 14px',
                            borderRadius: 'var(--radius-sm)',
                            border: '1px solid #cbd5e1',
                            fontSize: '14px',
                            outline: 'none'
                          }}
                        />
                      </div>
                      <div>
                        <label style={{ display: 'block', fontSize: '13px', fontWeight: '600', color: 'var(--text-dark)', marginBottom: '6px' }}>
                          รหัสผ่าน
                        </label>
                        <input
                          name="password"
                          type="password"
                          required
                          placeholder="รหัสผ่านอย่างน้อย 6 ตัวอักษร"
                          style={{
                            width: '100%',
                            padding: '12px 14px',
                            borderRadius: 'var(--radius-sm)',
                            border: '1px solid #cbd5e1',
                            fontSize: '14px',
                            outline: 'none'
                          }}
                        />
                      </div>
                      <button type="submit" className="btn btn-primary" style={{ width: '100%', padding: '14px', fontSize: '15px', marginTop: '10px' }}>
                        {isLoading ? 'กำลังดำเนินการ...' : 'สมัครสมาชิกฟรี'}
                      </button>
                    </form>
                  )}

                  {/* Toggle Register/Login footer */}
                  <div style={{ marginTop: '24px', textAlign: 'center', fontSize: '14px' }}>
                    <span style={{ color: 'var(--text-muted)' }}>
                      {authMode === 'signin' ? 'ยังไม่ได้สมัครสมาชิกใช่หรือไม่?' : 'เป็นสมาชิกอยู่แล้วหรือไม่?'}
                    </span>{' '}
                    <button
                      onClick={() => {
                        setError(null);
                        setSuccessMessage(null);
                        setAuthMode(authMode === 'signin' ? 'signup' : 'signin');
                      }}
                      style={{
                        background: 'none',
                        border: 'none',
                        color: 'var(--primary)',
                        fontWeight: '700',
                        cursor: 'pointer',
                        fontSize: '14px'
                      }}
                    >
                      {authMode === 'signin' ? 'สมัครใช้งานฟรี' : 'เข้าสู่ระบบที่นี่'}
                    </button>
                  </div>
                </div>
              )}
        </div>
      </div>
    </div>
  );
}
