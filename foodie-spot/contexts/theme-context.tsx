import React, { createContext, ReactNode, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { useColorScheme as useSystemColorScheme } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';

const STORAGE_KEY = 'theme_preference';

export type ThemePreference = 'system' | 'light' | 'dark';
export type Theme = 'light' | 'dark';

interface ThemeContextType {
  theme: Theme;
  preference: ThemePreference;
  setPreference: (value: ThemePreference) => Promise<void>;
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

export const ThemeProvider = ({ children }: { children: ReactNode }) => {
  const systemScheme = useSystemColorScheme();
  const [preference, setPreferenceState] = useState<ThemePreference>('system');
  const [hasLoaded, setHasLoaded] = useState(false);

  useEffect(() => {
    const loadPreference = async () => {
      try {
        const stored = await AsyncStorage.getItem(STORAGE_KEY);
        if (stored === 'light' || stored === 'dark' || stored === 'system') {
          setPreferenceState(stored);
        }
      } catch (error) {
        console.error('Failed to load theme preference', error);
      } finally {
        setHasLoaded(true);
      }
    };
    loadPreference();
  }, []);

  const setPreference = useCallback(async (value: ThemePreference) => {
    setPreferenceState(value);
    try {
      await AsyncStorage.setItem(STORAGE_KEY, value);
    } catch (error) {
      console.error('Failed to save theme preference', error);
    }
  }, []);

  const theme: Theme = useMemo(() => {
    if (preference === 'light' || preference === 'dark') {
      return preference;
    }
    return systemScheme === 'dark' ? 'dark' : 'light';
  }, [preference, systemScheme]);

  if (!hasLoaded) {
    return null;
  }

  return (
    <ThemeContext.Provider value={{ theme, preference, setPreference }}>
      {children}
    </ThemeContext.Provider>
  );
};

export const useTheme = () => {
  const context = useContext(ThemeContext);
  if (!context) {
    throw new Error('useTheme must be used within ThemeProvider');
  }
  return context;
};
