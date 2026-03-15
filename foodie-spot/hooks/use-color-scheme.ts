import { useTheme } from '@/contexts/theme-context';

export function useColorScheme() {
  const { theme } = useTheme();
  return theme;
}
