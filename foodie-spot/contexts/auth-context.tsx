
import React, { createContext, ReactNode, useCallback, useContext, useEffect, useState } from 'react';
import { auth, LoginCredentials, RegisterData, User, AuthTokens } from '@/services/auth';
import log from '@/services/logger';
import { router } from 'expo-router';

interface AuthContextType {
  user: User | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  error: string | null;
  login: (credentials: LoginCredentials) => Promise<{ user: User; tokens: AuthTokens }>;
  register: (data: RegisterData) => Promise<{ user: User; tokens: AuthTokens }>;
  logout: () => Promise<void>;
  refreshAuth: () => Promise<void>;
  updateUser: (updates: Partial<User>) => Promise<void>;
  clearError: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const checkAuth = useCallback(async () => {
    try {
      log.debug('🔍 [AuthContext] Checking auth state...');
      setIsLoading(true);
      setError(null);
      const state = await auth.getAuthState();
      setUser(state.user);
      setIsAuthenticated(state.isAuthenticated);
      log.debug('✅ [AuthContext] Auth state:', state.isAuthenticated ? 'authenticated' : 'not authenticated');
    } catch (err) {
      log.error('❌ [AuthContext] Auth check failed:', err);
      setError(err instanceof Error ? err.message : 'Erreur de vérification');
      setIsAuthenticated(false);
      setUser(null);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    checkAuth();
  }, [checkAuth]);

  const login = useCallback(async (credentials: LoginCredentials) => {
    try {
      setIsLoading(true);
      setError(null);
      const result = await auth.login(credentials);
      await new Promise(resolve => setTimeout(resolve, 100));
      const state = await auth.getAuthState();
      setUser(state.user);
      setIsAuthenticated(state.isAuthenticated);
      log.info('✅ [AuthContext] Login completed');
      return result;
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Échec de connexion';
      setError(message);
      setIsAuthenticated(false);
      setUser(null);
      throw err;
    } finally {
      setIsLoading(false);
    }
  }, []);

  const register = useCallback(async (data: RegisterData) => {
    try {
      setIsLoading(true);
      setError(null);
      const result = await auth.register(data);
      await new Promise(resolve => setTimeout(resolve, 100));
      const state = await auth.getAuthState();
      setUser(state.user);
      setIsAuthenticated(state.isAuthenticated);
      log.info('✅ [AuthContext] Registration completed');
      return result;
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Échec de l\'inscription';
      setError(message);
      setIsAuthenticated(false);
      setUser(null);
      throw err;
    } finally {
      setIsLoading(false);
    }
  }, []);

  const logout = useCallback(async () => {
    try {
      setIsLoading(true);
      setError(null);
      await auth.logout();
      setUser(null);
      setIsAuthenticated(false);
      log.info('✅ [AuthContext] Logout completed');
     router.replace('/login');
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Échec de déconnexion';
      setError(message);
      setUser(null);
      setIsAuthenticated(false);
    } finally {
      setIsLoading(false);
    }
  }, []);

  const refreshAuth = useCallback(async () => {
    await checkAuth();
  }, [checkAuth]);

  const updateUser = useCallback(async (updates: Partial<User>) => {
    try {
      const updatedUser = await auth.updateProfile(updates);
      setUser(updatedUser);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Échec de mise à jour';
      setError(message);
      throw err;
    }
  }, []);

  const clearError = useCallback(() => {
    setError(null);
  }, []);

  return (
    <AuthContext.Provider
      value={{
        user,
        isLoading,
        isAuthenticated,
        error,
        login,
        register,
        logout,
        refreshAuth,
        updateUser,
        clearError,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

export default AuthContext;