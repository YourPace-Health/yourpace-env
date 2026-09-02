import { Component } from 'react';

export class ErrorBoundary extends Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, errorInfo) {
    console.error('Unhandled React Error:', error, errorInfo);
  }

  handleReload = () => {
    window.location.reload();
  };

  render() {
    if (this.state.hasError) {
      return (
        <div
          style={{
            minHeight: '100vh',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '24px',
            backgroundColor: '#f8fafc',
            color: '#1e293b',
            fontFamily: 'system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
            textAlign: 'center',
          }}
        >
          <div
            style={{
              maxWidth: '520px',
              width: '100%',
              backgroundColor: '#ffffff',
              borderRadius: '16px',
              padding: '36px',
              boxShadow: '0 10px 25px rgba(0, 0, 0, 0.05)',
              border: '1px solid #e2e8f0',
            }}
          >
            <div style={{ fontSize: '48px', marginBottom: '16px' }}>⚠️</div>
            <h2
              style={{
                fontSize: '22px',
                fontWeight: '700',
                color: '#0f172a',
                marginBottom: '8px',
              }}
            >
              เกิดข้อผิดพลาดในการแสดงผล
            </h2>
            <p
              style={{
                fontSize: '14px',
                color: '#64748b',
                lineHeight: '1.6',
                marginBottom: '24px',
              }}
            >
              ขออภัยในความไม่สะดวก ระบบ yourPace พบข้อผิดพลาดชั่วคราวในการโหลดหน้าจอ กรุณากดรีโหลดเพื่อเริ่มใหม่
            </p>
            <button
              onClick={this.handleReload}
              style={{
                padding: '12px 28px',
                borderRadius: '8px',
                border: 'none',
                backgroundColor: '#00875A',
                color: '#ffffff',
                fontWeight: '600',
                fontSize: '14px',
                cursor: 'pointer',
                transition: 'background 0.2s',
              }}
            >
              รีเฟรชหน้าเว็บ (Reload)
            </button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
