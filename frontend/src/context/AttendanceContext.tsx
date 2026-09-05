// PeoplePay360 - Live Attendance Quick Widget Context

import React, { createContext, useContext, useState, useEffect } from 'react';
import { apiService } from '../services/apiService';

interface AttendanceContextType {
  hasActiveSession: boolean;
  sessionId: string | null;
  checkInTime: string | null;
  elapsedSeconds: number;
  isPunching: boolean;
  checkIn: () => Promise<void>;
  checkOut: () => Promise<void>;
  refreshSession: () => Promise<void>;
}

const AttendanceContext = createContext<AttendanceContextType | undefined>(undefined);

export const AttendanceProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [hasActiveSession, setHasActiveSession] = useState<boolean>(true);
  const [sessionId, setSessionId] = useState<string | null>('att-sess-1');
  const [checkInTime, setCheckInTime] = useState<string | null>('2026-09-05T09:48:00.000Z');
  const [elapsedSeconds, setElapsedSeconds] = useState<number>(16200);
  const [isPunching, setIsPunching] = useState<boolean>(false);

  const refreshSession = async () => {
    try {
      const sess = await apiService.getAttendanceSession();
      setHasActiveSession(sess.has_active_session);
      setSessionId(sess.session_id || null);
      setCheckInTime(sess.check_in_time || null);
      if (sess.elapsed_seconds) {
        setElapsedSeconds(sess.elapsed_seconds);
      }
    } catch (e) {
      console.error('Failed to load attendance session', e);
    }
  };

  useEffect(() => {
    refreshSession();
  }, []);

  useEffect(() => {
    let interval: any = null;
    if (hasActiveSession) {
      interval = setInterval(() => {
        setElapsedSeconds((prev) => prev + 1);
      }, 1000);
    }
    return () => {
      if (interval) clearInterval(interval);
    };
  }, [hasActiveSession]);

  const checkIn = async () => {
    setIsPunching(true);
    try {
      await apiService.checkIn();
      setHasActiveSession(true);
      setCheckInTime(new Date().toISOString());
      setElapsedSeconds(0);
      setSessionId(`sess-${Date.now()}`);
    } finally {
      setIsPunching(false);
    }
  };

  const checkOut = async () => {
    if (!sessionId) return;
    setIsPunching(true);
    try {
      await apiService.checkOut(sessionId);
      setHasActiveSession(false);
      setSessionId(null);
      setCheckInTime(null);
      setElapsedSeconds(0);
    } finally {
      setIsPunching(false);
    }
  };

  return (
    <AttendanceContext.Provider
      value={{
        hasActiveSession,
        sessionId,
        checkInTime,
        elapsedSeconds,
        isPunching,
        checkIn,
        checkOut,
        refreshSession,
      }}
    >
      {children}
    </AttendanceContext.Provider>
  );
};

export const useAttendance = () => {
  const ctx = useContext(AttendanceContext);
  if (!ctx) throw new Error('useAttendance must be used within AttendanceProvider');
  return ctx;
};
