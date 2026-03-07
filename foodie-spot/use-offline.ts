// hooks/use-offline.ts

import { useState, useEffect, useCallback } from 'react';
import NetInfo, { NetInfoState } from '@react-native-community/netinfo';
import { storage, STORAGE_KEYS } from '@/services/storage';
import { orderAPI } from '@/services/api';
import log from '@/services/logger';

interface OfflineState {
  isOnline: boolean;
  pendingCount: number;
  isSyncing: boolean;
}

export function useOffline() {
  const [state, setState] = useState<OfflineState>({
    isOnline: true,
    pendingCount: 0,
    isSyncing: false,
  });

  const checkPendingActions = useCallback(async () => {
    try {
      const offlineOrders = await storage.getItem<any[]>(STORAGE_KEYS.OFFLINE_ORDERS);
      setState(prev => ({
        ...prev,
        pendingCount: offlineOrders?.length || 0,
      }));
    } catch (error) {
      log.error('Failed to check pending actions:', error);
    }
  }, []);

  const syncNow = useCallback(async () => {
    if (!state.isOnline || state.isSyncing || state.pendingCount === 0) {
      return;
    }

    setState(prev => ({ ...prev, isSyncing: true }));

    try {
      log.info('🔄 [Offline] Starting sync...');
      await orderAPI.syncOfflineOrders();
      await checkPendingActions();
      log.info('✅ [Offline] Sync completed');
    } catch (error) {
      log.error('❌ [Offline] Sync failed:', error);
    } finally {
      setState(prev => ({ ...prev, isSyncing: false }));
    }
  }, [state.isOnline, state.isSyncing, state.pendingCount, checkPendingActions]);

  useEffect(() => {
    const unsubscribe = NetInfo.addEventListener((netState: NetInfoState) => {
      const isConnected = netState.isConnected ?? false;
      
      setState(prev => {
        if (!prev.isOnline && isConnected && prev.pendingCount > 0) {
          log.info('📶 [Offline] Back online, will sync...');
          setTimeout(() => syncNow(), 1000);
        }
        return { ...prev, isOnline: isConnected };
      });
    });

    NetInfo.fetch().then((netState) => {
      setState(prev => ({ ...prev, isOnline: netState.isConnected ?? false }));
    });

    checkPendingActions();

    return () => unsubscribe();
  }, [checkPendingActions, syncNow]);

  useEffect(() => {
    const interval = setInterval(checkPendingActions, 30000);
    return () => clearInterval(interval);
  }, [checkPendingActions]);

  return {
    isOnline: state.isOnline,
    pendingCount: state.pendingCount,
    isSyncing: state.isSyncing,
    syncNow,
    checkPendingActions,
  };
}

export default useOffline;