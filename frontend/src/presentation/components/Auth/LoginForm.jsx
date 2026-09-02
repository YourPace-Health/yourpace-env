// src/presentation/components/Auth/LoginForm.jsx

import { useState } from 'react';
import { Mail, Lock, Eye, EyeOff } from 'lucide-react';

export function LoginForm({ onSubmit, isLoading, onForgotPasswordClick }) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [staySignedIn, setStaySignedIn] = useState(true);
  const [showPassword, setShowPassword] = useState(false);

  const handleSubmit = (e) => {
    e.preventDefault();
    onSubmit({ email, password, staySignedIn });
  };

  return (
    <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '20px', width: '100%' }}>
      {/* Email Input */}
      <div>
        <label style={{ display: 'block', fontSize: '13px', fontWeight: '600', color: 'var(--text-dark)', marginBottom: '8px' }}>
          อีเมลการใช้งาน
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

      {/* Password Input */}
      <div>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
          <label style={{ fontSize: '13px', fontWeight: '600', color: 'var(--text-dark)' }}>
            รหัสผ่าน
          </label>
          <button
            type="button"
            onClick={onForgotPasswordClick}
            style={{
              background: 'none',
              border: 'none',
              color: 'var(--secondary)',
              fontSize: '13px',
              fontWeight: '600',
              cursor: 'pointer'
            }}
          >
            ลืมรหัสผ่าน?
          </button>
        </div>
        <div style={{ position: 'relative' }}>
          <Lock size={18} color="#94a3b8" style={{ position: 'absolute', left: '14px', top: '14px' }} />
          <input
            type={showPassword ? "text" : "password"}
            required
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="••••••••"
            style={{
              width: '100%',
              padding: '12px 42px 12px 42px',
              borderRadius: 'var(--radius-sm)',
              border: '1px solid #cbd5e1',
              fontSize: '14px',
              outline: 'none',
              transition: 'var(--transition)'
            }}
            onFocus={(e) => e.target.style.borderColor = 'var(--primary)'}
            onBlur={(e) => e.target.style.borderColor = '#cbd5e1'}
          />
          <button
            type="button"
            onClick={() => setShowPassword(!showPassword)}
            style={{
              position: 'absolute',
              right: '14px',
              top: '14px',
              background: 'none',
              border: 'none',
              cursor: 'pointer',
              color: '#94a3b8'
            }}
          >
            {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
          </button>
        </div>
      </div>

      {/* Stay Signed In Checkbox */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer' }}>
        <input
          type="checkbox"
          id="staySignedIn"
          checked={staySignedIn}
          onChange={(e) => setStaySignedIn(e.target.checked)}
          style={{
            width: '16px',
            height: '16px',
            accentColor: 'var(--primary)',
            cursor: 'pointer'
          }}
        />
        <label htmlFor="staySignedIn" style={{ fontSize: '14px', color: 'var(--text-muted)', cursor: 'pointer', userSelect: 'none' }}>
          ให้ฉันอยู่ในระบบต่อไป (Stay Signed In)
        </label>
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
        {isLoading ? 'กำลังดำเนินการ...' : 'เข้าสู่ระบบ'}
      </button>
    </form>
  );
}
