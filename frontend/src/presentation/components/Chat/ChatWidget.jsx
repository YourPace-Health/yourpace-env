import { Bot, Send, Trash2, X, ChevronDown } from 'lucide-react';
import { FormattedChatMessage } from '../Formatting/FormattedChatMessage';

export const ChatWidget = ({ chatEndRef, chatLog, chatMessage, handleClearChatHistory, handleSendChatMessage, isChatHistoryLoading, isChatLoading, isChatOpen, setChatMessage, setIsChatOpen }) => (
  <>
    {/* Floating Action Button (FAB) when Chat is closed - Truly Fixed to Viewport Bottom Right */}
    {!isChatOpen && (
      <button
        type="button"
        onClick={() => setIsChatOpen(true)}
        style={{
          position: 'fixed',
          bottom: '24px',
          right: '24px',
          background: 'linear-gradient(135deg, var(--primary) 0%, #00a389 100%)',
          color: 'white',
          border: 'none',
          borderRadius: '30px',
          padding: '12px 22px',
          display: 'flex',
          alignItems: 'center',
          gap: '10px',
          boxShadow: '0 8px 28px rgba(0, 135, 90, 0.45)',
          cursor: 'pointer',
          zIndex: 999999,
          fontWeight: '700',
          fontSize: '14px',
          transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)'
        }}
        title="คลิกเพื่อปรึกษาและพูดคุยกับ AI Mentor"
      >
        <Bot size={22} />
        <span>ปรึกษา AI Mentor</span>
        <span style={{ background: '#ffab00', color: '#000', fontSize: '10px', padding: '2px 7px', borderRadius: '10px', fontWeight: '800' }}>24/7</span>
      </button>
    )}

    {/* Floating AI Chat Drawer Window when Chat is open - Truly Fixed to Viewport Bottom Right */}
    {isChatOpen && (
      <div style={{
        position: 'fixed',
        bottom: '24px',
        right: '24px',
        width: '390px',
        maxWidth: 'calc(100vw - 32px)',
        height: '560px',
        maxHeight: 'calc(100vh - 80px)',
        background: '#ffffff',
        borderRadius: 'var(--radius-lg)',
        boxShadow: '0 16px 48px rgba(0, 0, 0, 0.25)',
        border: '1px solid var(--border-color)',
        display: 'flex',
        flexDirection: 'column',
        zIndex: 999999,
        overflow: 'hidden'
      }}>
        {/* Header */}
        <div style={{
          background: 'linear-gradient(135deg, var(--primary) 0%, #00a389 100%)',
          color: 'white',
          padding: '12px 16px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
          gap: '8px'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', minWidth: 0 }}>
            <div style={{ width: '32px', height: '32px', borderRadius: '50%', background: 'rgba(255,255,255,0.2)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
              <Bot size={18} color="white" />
            </div>
            <div style={{ textAlign: 'left', minWidth: 0 }}>
              <h4 style={{ fontSize: '14px', fontWeight: '700', color: 'white', margin: 0, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                yourPace AI Mentor
              </h4>
              <span style={{ fontSize: '10.5px', opacity: 0.9, display: 'block', whiteSpace: 'nowrap' }}>
                🟢 พร้อมให้คำปรึกษาตลอด 24 ชม.
              </span>
            </div>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', flexShrink: 0 }}>
            <button
              onClick={handleClearChatHistory}
              title="ล้างประวัติการสนทนาและเริ่มแชทใหม่"
              style={{
                background: 'rgba(255,255,255,0.18)',
                border: 'none',
                color: 'white',
                padding: '4px 8px',
                borderRadius: '6px',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '4px',
                fontSize: '11px',
                fontWeight: '600',
                transition: 'all 0.2s',
                whiteSpace: 'nowrap'
              }}
            >
              <Trash2 size={12} />
              <span>ล้างแชท</span>
            </button>

            <button
              onClick={() => setIsChatOpen(false)}
              title="พับหน้าต่างแชทลงเพื่อดูข้อมูลบนหน้าจอ"
              style={{
                background: 'rgba(255,255,255,0.18)',
                border: 'none',
                color: 'white',
                width: '26px',
                height: '26px',
                borderRadius: '50%',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                transition: 'all 0.2s',
                flexShrink: 0
              }}
            >
              <ChevronDown size={16} />
            </button>

            <button
              onClick={() => setIsChatOpen(false)}
              title="ปิดหน้าต่าง AI Chat"
              style={{
                background: 'rgba(255,255,255,0.18)',
                border: 'none',
                color: 'white',
                width: '26px',
                height: '26px',
                borderRadius: '50%',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                transition: 'all 0.2s',
                flexShrink: 0
              }}
            >
              <X size={15} />
            </button>
          </div>
        </div>

        {/* Messages */}
        <div style={{ flex: 1, padding: '16px', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '12px', background: '#f8fafc', textAlign: 'left' }}>
          {isChatHistoryLoading ? (
            <div style={{ display: 'flex', flex: 1, alignItems: 'center', justifyContent: 'center', flexDirection: 'column', gap: '8px', color: '#64748b' }}>
              <div className="spinner" style={{ width: '20px', height: '20px', border: '2px solid #cbd5e1', borderTop: '2px solid var(--primary)', borderRadius: '50%', animation: 'spin 1s linear infinite' }}></div>
              <span style={{ fontSize: '12px' }}>กำลังโหลดประวัติการสนทนา...</span>
            </div>
          ) : (
            <>
              {chatLog.map((msg, index) => {
                const isAI = msg.sender === 'ai';
                const timeStr = msg.createdAt ? new Date(msg.createdAt).toLocaleTimeString('th-TH', { hour: '2-digit', minute: '2-digit' }) : null;

                return (
                  <div
                    key={msg.id || index}
                    style={{
                      alignSelf: isAI ? 'flex-start' : 'flex-end',
                      maxWidth: '85%',
                      display: 'flex',
                      flexDirection: 'column',
                      alignItems: isAI ? 'flex-start' : 'flex-end',
                      gap: '3px'
                    }}
                  >
                    <div style={{
                      padding: '12px 14px',
                      borderRadius: isAI ? '4px 14px 14px 14px' : '14px 4px 14px 14px',
                      fontSize: '13px',
                      lineHeight: '1.55',
                      background: isAI ? '#ffffff' : 'var(--primary)',
                      color: isAI ? 'var(--text-dark)' : '#ffffff',
                      border: isAI ? '1px solid #e2e8f0' : 'none',
                      boxShadow: isAI ? '0 1px 4px rgba(0,0,0,0.04)' : '0 2px 6px rgba(0,135,90,0.25)',
                      wordBreak: 'break-word'
                    }}>
                      {isAI ? (
                        <FormattedChatMessage text={msg.text} />
                      ) : (
                        msg.text
                      )}
                    </div>
                    {timeStr && (
                      <span style={{ fontSize: '10px', color: '#94a3b8', padding: '0 4px' }}>
                        {timeStr}
                      </span>
                    )}
                  </div>
                );
              })}

              {isChatLoading && (
                <div style={{
                  alignSelf: 'flex-start',
                  padding: '12px 14px',
                  borderRadius: '4px 14px 14px 14px',
                  background: '#ffffff',
                  border: '1px solid #e2e8f0',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                  boxShadow: '0 1px 4px rgba(0,0,0,0.04)'
                }}>
                  <div className="spinner" style={{ width: '12px', height: '12px', border: '1.5px solid #cbd5e1', borderTop: '1.5px solid var(--primary)', borderRadius: '50%', animation: 'spin 1s linear infinite' }}></div>
                  <span style={{ fontSize: '12px', color: 'var(--text-muted)' }}>AI Mentor กำลังประมวลผลคำแนะนำ...</span>
                </div>
              )}
            </>
          )}
          <div ref={chatEndRef} />
        </div>

        {/* Input Form */}
        <form onSubmit={handleSendChatMessage} style={{ padding: '12px 14px', background: 'white', borderTop: '1px solid #edf2f7', display: 'flex', gap: '8px' }}>
          <input
            type="text"
            value={chatMessage}
            onChange={(e) => setChatMessage(e.target.value)}
            placeholder="พิมพ์ถามข้อมูลกับ AI Mentor..."
            style={{
              flex: 1,
              padding: '10px 14px',
              borderRadius: 'var(--radius-sm)',
              border: '1px solid #cbd5e1',
              fontSize: '13px',
              outline: 'none'
            }}
            disabled={isChatLoading || isChatHistoryLoading}
          />
          <button
            type="submit"
            style={{
              width: '38px',
              height: '38px',
              borderRadius: 'var(--radius-sm)',
              background: 'var(--primary)',
              color: 'white',
              border: 'none',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              cursor: (isChatLoading || isChatHistoryLoading) ? 'not-allowed' : 'pointer',
              transition: 'all 0.2s'
            }}
            disabled={isChatLoading || isChatHistoryLoading}
            title="ส่งข้อความ"
          >
            <Send size={16} />
          </button>
        </form>
      </div>
    )}
  </>
);
