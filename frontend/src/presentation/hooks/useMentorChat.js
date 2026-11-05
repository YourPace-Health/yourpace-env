import { useEffect, useRef, useState } from 'react';

/**
 * State and handlers for the floating AI Mentor chat: message list, history load/clear,
 * sending a message and keeping the newest message scrolled into view.
 */
export function useMentorChat({ getSessionToken, mentorApiDataSource }) {
  const [chatMessage, setChatMessage] = useState('');
  const [isChatLoading, setIsChatLoading] = useState(false);
  const [isChatHistoryLoading, setIsChatHistoryLoading] = useState(false);
  const [chatLog, setChatLog] = useState([
    { sender: 'ai', text: 'สวัสดีครับ! ผมคือ yourPace AI Mentor ของคุณ วันนี้คุณอยากเน้นออกกำลังกายส่วนไหน หรือให้ผมช่วยวางแผนตารางการออกกำลังกายให้ดีครับ?', createdAt: new Date().toISOString() }
  ]);

  const chatEndRef = useRef(null);

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [chatLog, isChatLoading]);

  const [isChatOpen, setIsChatOpen] = useState(false);

  // Load chat history from backend
  const loadChatHistory = async (token) => {
    if (!token) return;
    setIsChatHistoryLoading(true);
    try {
      const messages = await mentorApiDataSource.getChatHistory(token);
      if (messages && messages.length > 0) {
        setChatLog(messages.map(m => ({
          id: m.id,
          sender: m.sender,
          text: m.message,
          createdAt: m.createdAt
        })));
      } else {
        setChatLog([
          { sender: 'ai', text: 'สวัสดีครับ! ผมคือ yourPace AI Mentor ของคุณ วันนี้คุณอยากเน้นออกกำลังกายส่วนไหน หรือให้ผมช่วยวางแผนตารางการออกกำลังกายให้ดีครับ?', createdAt: new Date().toISOString() }
        ]);
      }
    } catch (err) {
      console.error("Failed to load chat history:", err);
    } finally {
      setIsChatHistoryLoading(false);
    }
  };

  // Clear chat history
  const handleClearChatHistory = async () => {
    const token = getSessionToken();
    if (!token) return;

    if (!confirm("คุณต้องการล้างประวัติการสนทนากับ AI Mentor ทั้งหมดใช่หรือไม่?")) {
      return;
    }

    try {
      await mentorApiDataSource.clearChatHistory(token);
      setChatLog([
        { sender: 'ai', text: 'ประวัติการสนทนาถูกล้างเรียบร้อยแล้วครับ! มีอะไรให้ yourPace AI Mentor ช่วยดูแลสุขภาพวันนี้ไหมครับ? 💪✨', createdAt: new Date().toISOString() }
      ]);
    } catch (err) {
      console.error("Failed to clear chat history:", err);
      alert("เกิดข้อผิดพลาดในการล้างประวัติการสนทนา");
    }
  };

  const handleSendChatMessage = async (e) => {
    e.preventDefault();
    if (!chatMessage.trim()) return;

    const token = getSessionToken();
    if (!token) return;

    const nowIso = new Date().toISOString();
    const userMsg = { sender: 'user', text: chatMessage, createdAt: nowIso };
    setChatLog(prev => [...prev, userMsg]);
    const currentMsg = chatMessage;
    setChatMessage('');
    setIsChatLoading(true);

    try {
      const aiReply = await mentorApiDataSource.chatWithMentor(currentMsg, token);
      setChatLog(prev => [...prev, { sender: 'ai', text: aiReply, createdAt: new Date().toISOString() }]);
    } catch (err) {
      console.error("Chat with mentor error:", err);
      setChatLog(prev => [...prev, {
        sender: 'ai',
        text: '❌ เกิดข้อผิดพลาดในการเชื่อมต่อกับ AI Mentor กรุณาตรวจสอบว่ากำหนด GEMINI_API_KEY ใน Backend .env เรียบร้อยแล้ว (หรือระบบจะตอบแบบจำลองแทนหาก API Key ไม่ถูกต้อง)',
        createdAt: new Date().toISOString()
      }]);
    } finally {
      setIsChatLoading(false);
    }
  };

  return {
    chatMessage,
    setChatMessage,
    isChatLoading,
    isChatHistoryLoading,
    chatLog,
    setChatLog,
    chatEndRef,
    isChatOpen,
    setIsChatOpen,
    loadChatHistory,
    handleClearChatHistory,
    handleSendChatMessage,
  };
}
