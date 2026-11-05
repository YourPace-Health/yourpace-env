import { useState } from 'react';

export function useGoogleCalendar({ getSessionToken, getApiUrl, setSuccessMessage }) {
  // Google Calendar Integration States
  const [isCalendarConnected, setIsCalendarConnected] = useState(false);

  const [calendarEvents, setCalendarEvents] = useState([]);

  const [calendarLoading, setCalendarLoading] = useState(false);

  // Check Google Calendar connection status
  const loadCalendarStatus = async (token) => {
    try {
      const response = await fetch(getApiUrl("/calendar/status"), {
        headers: { "Authorization": `Bearer ${token}` }
      });
      if (response.ok) {
        const data = await response.json();
        setIsCalendarConnected(data.connected);
        return data.connected;
      }
    } catch (err) {
      console.error("Failed to load calendar status:", err);
    }
    return false;
  };

  // Fetch Google Calendar events
  const loadCalendarEvents = async (token) => {
    setCalendarLoading(true);
    try {
      const response = await fetch(getApiUrl("/calendar/events"), {
        headers: { "Authorization": `Bearer ${token}` }
      });
      if (response.ok) {
        const data = await response.json();
        setCalendarEvents(data.items || []);
      } else if (response.status === 403) {
        // Token expired or revoked — backend has already deleted it
        console.warn("Google Calendar token expired or revoked, marking as disconnected");
        setIsCalendarConnected(false);
        setCalendarEvents([]);
      }
    } catch (err) {
      console.error("Failed to load calendar events:", err);
    } finally {
      setCalendarLoading(false);
    }
  };

  const handleConnectCalendar = async () => {
    const token = getSessionToken();
    if (!token) return;

    try {
      const response = await fetch(getApiUrl("/calendar/auth-url"), {
        headers: { "Authorization": `Bearer ${token}` }
      });
      if (response.ok) {
        const data = await response.json();
        if (data.authUrl) {
          window.location.href = data.authUrl;
        }
      }
    } catch (err) {
      console.error("Failed to get google auth url:", err);
      alert("เกิดข้อผิดพลาดในการเชื่อมต่อ Google Calendar");
    }
  };

  const handleDisconnectCalendar = async () => {
    const token = getSessionToken();
    if (!token) return;

    if (!confirm("คุณต้องการยกเลิกการเชื่อมต่อ Google Calendar ใช่หรือไม่?")) return;

    try {
      const response = await fetch(getApiUrl("/calendar"), {
        method: "DELETE",
        headers: { "Authorization": `Bearer ${token}` }
      });
      if (response.ok) {
        setIsCalendarConnected(false);
        setCalendarEvents([]);
        setSuccessMessage("ยกเลิกการเชื่อมต่อ Google Calendar สำเร็จแล้ว!");
      }
    } catch (err) {
      console.error("Failed to disconnect calendar:", err);
      alert("เกิดข้อผิดพลาดในการยกเลิกการเชื่อมต่อ");
    }
  };

  return {
    isCalendarConnected,
    calendarEvents,
    calendarLoading,
    loadCalendarStatus,
    loadCalendarEvents,
    handleConnectCalendar,
    handleDisconnectCalendar,
  };
}
