// src/presentation/components/Auth/ForgotPasswordForm.jsx

import React, { useState } from 'react';
import { Mail, ArrowLeft } from 'lucide-react';

export function ForgotPasswordForm({ onSubmit, isLoading, onBackToLoginClick }) {
  const [email, setEmail] = useState('');

  const handleSubmit = (e) => {
    e.preventDefault();
    onSubmit(email);
  };

  return (
    <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '20px', width: '100%' }}>
      {/* Back Button */}
      <button
        type="button"
        onClick={onBackToLoginClick}
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: '8px',
          background: 'none',
          border: 'none',
          color: 'var(--text-muted)',
          fontSize: '14px',
          fontWeight: '600',
          cursor: 'pointer',
          alignSelf: 'flex-start',
          padding: '4px 0',
          transition: 'var(--transition)'
        }}
        onMouseEnter={(e) => e.currentTarget.style.color = 'var(--text-dark)'}
        onMouseLeave={(e) => e.currentTarget.style.color = 'var(--text-muted)'}
      >
        <ArrowLeft size={16} />
        <span>ย้อนกลับไปหน้าล็อกอิน</span>
      </button>

      {/* Title info */}
      <div style={{ textAlign: 'left' }}>
        <h4 style={{ fontSize: '18px', fontWeight: '700', color: 'var(--text-dark)', marginBottom: '8px' }}>
          ลืมรหัสผ่านใช่ไหม?
        </h4>
        <p style={{ fontSize: '14px', color: 'var(--text-muted)', lineHeight: '1.5' }}>
          กรอกอีเมลบัญชีการใช้งานของคุณเพื่อรับลิงก์รีเซ็ตรหัสผ่านใหม่
        </p>
      </div>

      {/* Email Input */}
      <div>
        <label style={{ display: 'block', fontSize: '13px', fontWeight: '600', color: 'var(--text-dark)', marginBottom: '8px' }}>
          อีเมลของคุณ
        </label>
        <div style={{ position: 'relative' }}>
          <Mail size={18} color="#94a3b8" style={{ position: 'absolute', left: '14px', top: '14px' }} />
          <input
            type="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="somchai@yourpace.com"
            style={{
              width: '100%',
              padding: '12px 14px 12px 42px',
              borderRadius: 'var(--radius-sm)',
              border: '1px solid #cbd5e1',
              fontSize: '14px',
              outline: 'none',
              transition: 'var(--transition)'
            }}
            onFocus={(e) => e.target.style.borderColor = 'var(--primary)'}
            onBlur={(e) => e.target.style.borderColor = '#cbd5e1'}
          />
        </div>
      </div>

      {/* Submit Button */}
      <button
        type="submit"
        disabled={isLoading}
        style={{
          width: '100%',
          padding: '14px',
          borderRadius: 'var(--radius-sm)',
          background: 'var(--primary)',
          color: '#ffffff',
          border: 'none',
          fontFamily: 'var(--font-heading)',
          fontWeight: '700',
          fontSize: '15px',
          cursor: isLoading ? 'not-allowed' : 'pointer',
          boxShadow: '0 4px 12px rgba(0, 135, 90, 0.15)',
          transition: 'var(--transition)'
        }}
        onMouseEnter={(e) => {
          if (!isLoading) {
            e.currentTarget.style.backgroundColor = 'var(--primary-hover)';
            e.currentTarget.style.transform = 'translateY(-1px)';
            e.currentTarget.style.boxShadow = '0 6px 16px rgba(0, 135, 90, 0.25)';
          }
        }}
        onMouseLeave={(e) => {
          if (!isLoading) {
            e.currentTarget.style.backgroundColor = 'var(--primary)';
            e.currentTarget.style.transform = 'translateY(0)';
            e.currentTarget.style.boxShadow = '0 4px 12px rgba(0, 135, 90, 0.15)';
          }
        }}
      >
        {isLoading ? 'กำลังดำเนินการ...' : 'ส่งลิงก์รีเซ็ตรหัสผ่าน'}
      </button>
    </form>
  );
}
