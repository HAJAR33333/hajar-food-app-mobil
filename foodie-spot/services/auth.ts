// services/auth.ts

import * as SecureStore from 'expo-secure-store';
import api from './api';
import log from './logger';
import { STORAGE_KEYS } from './storage';
import { cache } from './cache';

// ============================================
// Types
// ============================================
export interface User {
  id: string;
  email: string;
  firstName?: string;
  lastName?: string;
  name?: string;
  phone?: string;
  avatar?: string;
  addresses: Address[];
  favoriteRestaurants: string[];
  notificationsEnabled?: boolean;
  createdAt?: string;
}

export interface Address {
  id: string;
  label: string;
  street: string;
  apartment?: string;
  city: string;
  postalCode: string;
  country: string;
  latitude?: number;
  longitude?: number;
  isDefault: boolean;
  instructions?: string;
}

export interface LoginCredentials {
  email: string;
  password: string;
}

export interface RegisterData {
  email: string;
  password: string;
  firstName: string;
  lastName: string;
  phone?: string;
}

export interface AuthTokens {
  accessToken: string;
  refreshToken?: string;
  expiresIn: number;
}

export interface AuthState {
  user: User | null;
  isAuthenticated: boolean;
}



// ============================================
// Auth Service
// ============================================
class AuthService {
  async getAccessToken(): Promise<string | null> {
    try {
      return await SecureStore.getItemAsync(STORAGE_KEYS.ACCESS_TOKEN);
    } catch (error) {
      log.error('Failed to get access token:', error);
      return null;
    }
  }

  async setAccessToken(token: string): Promise<void> {
    try {
      await SecureStore.setItemAsync(STORAGE_KEYS.ACCESS_TOKEN, token);
    } catch (error) {
      log.error('Failed to set access token:', error);
      throw error;
    }
  }

  async getRefreshToken(): Promise<string | null> {
    try {
      return await SecureStore.getItemAsync(STORAGE_KEYS.REFRESH_TOKEN);
    } catch (error) {
      log.error('Failed to get refresh token:', error);
      return null;
    }
  }

  async setRefreshToken(token: string): Promise<void> {
    try {
      await SecureStore.setItemAsync(STORAGE_KEYS.REFRESH_TOKEN, token);
    } catch (error) {
      log.error('Failed to set refresh token:', error);
      throw error;
    }
  }

  async clearTokens(): Promise<void> {
    try {
      await SecureStore.deleteItemAsync(STORAGE_KEYS.ACCESS_TOKEN);
      await SecureStore.deleteItemAsync(STORAGE_KEYS.REFRESH_TOKEN);
      await SecureStore.deleteItemAsync(STORAGE_KEYS.USER);
    } catch (error) {
      log.error('Failed to clear tokens:', error);
    }
  }

  async getStoredUser(): Promise<User | null> {
    try {
      const userJson = await SecureStore.getItemAsync(STORAGE_KEYS.USER);
      if (userJson) {
        return JSON.parse(userJson);
      }
      return null;
    } catch (error) {
      log.error('Failed to get stored user:', error);
      return null;
    }
  }

  async setStoredUser(user: User): Promise<void> {
    try {
      await SecureStore.setItemAsync(STORAGE_KEYS.USER, JSON.stringify(user));
    } catch (error) {
      log.error('Failed to set stored user:', error);
      throw error;
    }
  }

  async getAuthState(): Promise<AuthState> {
    try {
      const [token, user] = await Promise.all([
        this.getAccessToken(),
        this.getStoredUser(),
      ]);
      const isAuthenticated = !!token && !!user;
      return { user: isAuthenticated ? user : null, isAuthenticated };
    } catch (error) {
      log.error('Failed to get auth state:', error);
      return { user: null, isAuthenticated: false };
    }
  }

  async login(credentials: LoginCredentials): Promise<{ user: User; tokens: AuthTokens }> {
    try {
      log.info('🔐 [Auth] Attempting login for:', credentials.email);

      const response = await api.post('/auth/login', credentials);
      const data = response.data.data || response.data;

      const user: User = {
        ...data.user,
        name: data.user.name || `${data.user.firstName || ''} ${data.user.lastName || ''}`.trim(),
        addresses: data.user.addresses || [],
        favoriteRestaurants: data.user.favoriteRestaurants || [],
      };

      const tokens: AuthTokens = {
        accessToken: data.accessToken || data.token,
        refreshToken: data.refreshToken,
        expiresIn: data.expiresIn || 3600,
      };

      await this.setAccessToken(tokens.accessToken);
      if (tokens.refreshToken) {
        await this.setRefreshToken(tokens.refreshToken);
      }
      await this.setStoredUser(user);

      log.info('✅ [Auth] Login successful for:', user.email);
      log.debug('Received tokens:', tokens);
      return { user, tokens };
    } catch (error: any) {
      log.error('❌ [Auth] Login failed:', error.message);
      if (error.response?.status === 401) {
        throw new Error('Email ou mot de passe incorrect');
      }
      throw new Error('Erreur de connexion. Veuillez réessayer.');
    }
  }

  async register(data: RegisterData): Promise<{ user: User; tokens: AuthTokens }> {
    try {
      log.info('📝 [Auth] Attempting registration for:', data.email);

      const response = await api.post('/auth/register', {
        email: data.email,
        password: data.password,
        firstName: data.firstName,
        lastName: data.lastName,
        phone: data.phone || '',
      });

      const resData = response.data.data || response.data;

      const user: User = {
        ...resData.user,
        name: resData.user.name || `${resData.user.firstName || ''} ${resData.user.lastName || ''}`.trim(),
        addresses: resData.user.addresses || [],
        favoriteRestaurants: resData.user.favoriteRestaurants || [],
      };

      const tokens: AuthTokens = {
        accessToken: resData.accessToken || resData.token,
        refreshToken: resData.refreshToken,
        expiresIn: resData.expiresIn || 3600,
      };

      await this.setAccessToken(tokens.accessToken);
      if (tokens.refreshToken) {
        await this.setRefreshToken(tokens.refreshToken);
      }
      await this.setStoredUser(user);

      log.info('✅ [Auth] Registration successful for:', user.email);
      return { user, tokens };
    } catch (error: any) {
      log.error('❌ [Auth] Registration failed:', error.message);
      if (error.response?.status === 409) {
        throw new Error('Cet email est déjà utilisé');
      }
      throw new Error('Erreur lors de l\'inscription. Veuillez réessayer.');
    }
  }

  async logout(): Promise<void> {
    try {
      log.info('🚪 [Auth] Logging out...');
      try {
        await api.post('/auth/logout');
      } catch (error) {
        // Ignorer les erreurs de l'API logout
        log.warn('⚠️ [Auth] Logout API call failed (ignoring):', error);
      }
      await this.clearTokens();
      cache.clearAll();
      
      log.info('✅ [Auth] Logout successful');
    } catch (error) {
      log.error('❌ [Auth] Logout error:', error);
      await this.clearTokens();
    }
  }

  async updateProfile(updates: Partial<User>): Promise<User> {
    try {
      const response = await api.patch('/user/profile', updates);
      const user = response.data.data || response.data;
      const currentUser = await this.getStoredUser();
      const updatedUser = { ...currentUser, ...user };
      await this.setStoredUser(updatedUser);
      return updatedUser;
    } catch (error) {
      log.error('Failed to update profile:', error);
      throw error;
    }
  }
}

export const auth = new AuthService();
export default auth;