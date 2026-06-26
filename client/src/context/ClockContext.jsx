import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { API_BASE } from '../config';

const ClockContext = createContext(null);

export function ClockProvider({ children }) {
  const [systemState, setSystemState] = useState(null);
  const [selectedDate, setSelectedDate] = useState('');
  const [stats, setStats] = useState(null);
  const [isLoadingStats, setIsLoadingStats] = useState(false);
  const [isAdvancingTime, setIsAdvancingTime] = useState(false);
  const [timeSimulationLogs, setTimeSimulationLogs] = useState(null);
  const [refreshTrigger, setRefreshTrigger] = useState(0);

  // Fetch virtual system date state
  const fetchSystemState = useCallback(async () => {
    try {
      const res = await fetch(`${API_BASE}/system`);
      if (!res.ok) throw new Error('Failed to fetch system state');
      const data = await res.json();
      
      setSystemState(prev => {
        // If system date changed or manual override status changed, update state
        if (!prev || prev.system_date !== data.system_date || prev.is_manual_override !== data.is_manual_override) {
          const newSystemDateStr = new Date(data.system_date).toISOString().split('T')[0];
          // If selectedDate isn't set, or if it matched the previous system date, auto-advance it
          setSelectedDate(currSelected => {
            if (!currSelected || (prev && currSelected === new Date(prev.system_date).toISOString().split('T')[0])) {
              return newSystemDateStr;
            }
            return currSelected;
          });
          return data;
        }
        return prev;
      });
      return data;
    } catch (e) {
      console.error('Error in fetchSystemState:', e);
    }
  }, []);

  // Fetch stats for the selected ledger filter date
  const fetchDashboardStats = useCallback(async (dateStr) => {
    if (!dateStr) return;
    setIsLoadingStats(true);
    try {
      const res = await fetch(`${API_BASE}/system/dashboard?date=${dateStr}`);
      if (!res.ok) throw new Error('Failed to fetch dashboard stats');
      const data = await res.json();
      setStats(data);
    } catch (e) {
      console.error('Error in fetchDashboardStats:', e);
    } finally {
      setIsLoadingStats(false);
    }
  }, []);

  // Trigger state refresh
  const triggerRefresh = useCallback(() => {
    setRefreshTrigger(prev => prev + 1);
  }, []);

  // Advance clock manually
  const advanceSystemClock = useCallback(async (targetDate) => {
    if (!targetDate) return;
    setIsAdvancingTime(true);
    setTimeSimulationLogs(null);
    try {
      const res = await fetch(`${API_BASE}/system`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ system_date: targetDate })
      });
      const data = await res.json();
      if (res.ok) {
        setSystemState({
          system_date: data.system_date,
          is_manual_override: data.is_manual_override
        });
        setSelectedDate(targetDate);
        setTimeSimulationLogs(data);
        triggerRefresh();
        return { success: true, data };
      } else {
        return { success: false, error: data.error || 'Failed to advance clock' };
      }
    } catch (e) {
      console.error('Error in advanceSystemClock:', e);
      return { success: false, error: 'Network error connecting to Server' };
    } finally {
      setIsAdvancingTime(false);
    }
  }, [triggerRefresh]);

  // Sync virtual clock back to real calendar date
  const resetToAutoSync = useCallback(async () => {
    setIsAdvancingTime(true);
    setTimeSimulationLogs(null);
    try {
      const res = await fetch(`${API_BASE}/system/sync`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' }
      });
      const data = await res.json();
      if (res.ok) {
        setSystemState({
          system_date: data.system_date,
          is_manual_override: data.is_manual_override
        });
        const realDateStr = new Date(data.system_date).toISOString().split('T')[0];
        setSelectedDate(realDateStr);
        setTimeSimulationLogs(data);
        triggerRefresh();
        return { success: true, data };
      } else {
        return { success: false, error: data.error || 'Failed to sync clock' };
      }
    } catch (e) {
      console.error('Error in resetToAutoSync:', e);
      return { success: false, error: 'Network error connecting to Server' };
    } finally {
      setIsAdvancingTime(false);
    }
  }, [triggerRefresh]);

  // Initial load and manual refresh trigger
  useEffect(() => {
    fetchSystemState();
  }, [fetchSystemState, refreshTrigger]);

  // Cascade refetches when selectedDate or refreshTrigger changes
  useEffect(() => {
    if (selectedDate) {
      fetchDashboardStats(selectedDate);
    }
  }, [selectedDate, fetchDashboardStats, refreshTrigger]);

  // Polling check (every 30 seconds) and Visibility check
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        console.log('[ClockContext] Tab visible, syncing system state...');
        fetchSystemState();
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    const intervalId = setInterval(() => {
      console.log('[ClockContext] Polling system state check...');
      fetchSystemState();
    }, 30000); // 30 seconds

    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      clearInterval(intervalId);
    };
  }, [fetchSystemState]);

  return (
    <ClockContext.Provider value={{
      systemState,
      selectedDate,
      setSelectedDate,
      stats,
      isLoadingStats,
      isAdvancingTime,
      timeSimulationLogs,
      setTimeSimulationLogs,
      fetchSystemState,
      fetchDashboardStats,
      advanceSystemClock,
      resetToAutoSync,
      triggerRefresh
    }}>
      {children}
    </ClockContext.Provider>
  );
}

export function useClock() {
  const context = useContext(ClockContext);
  if (!context) {
    throw new Error('useClock must be used within a ClockProvider');
  }
  return context;
}
