// src/presentation/components/Auth/MagicLinkForm.jsx

import { useState } from 'react';
import { Mail, Sparkles } from 'lucide-react';

export function MagicLinkForm({ onSubmit, isLoading }) {
  const [email, setEmail] = useState('');

  const handleSubmit = (e) => {
    e.preventDefault();
    onSubmit(email);
  };

  return (
    <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '20px', width: '100%' }}>
      <div style={{ textAlign: 'left', background: 'var(--primary-light)', padding: '16px', borderRadius: 'var(--radius-sm)', border: '1px solid rgba(0, 135, 90, 0.1)' }}>
        <p style={{ fontSize: '13px', color: 'var(--primary-hover)', lineHeight: '1.5', display: 'flex', alignItems: 'center', gap: '6px' }}>
          <Sparkles size={16} /> 
          <span><strong>Passwordless Login:</strong> กรอกอีเมลด้านล่างเพื่อล็อกอินเข้าใช้งานได้ทันทีโดยไม่ต้องใช้รหัสผ่าน</span>
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
        {isLoading ? 'กำลังส่งลิงก์...' : 'ส่ง Magic Link'}
      </button>
    </form>
  );
}
