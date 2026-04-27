export type ThemeColors = {
  background: string;
  card: string;
  cardBorder: string;
  textPrimary: string;
  textSecondary: string;
  primary: string;
  primaryLight: string;
  danger: string;
  success: string;
  warning: string;
  inputBackground: string;
  inputBorder: string;
  inputText: string;
  icon: string;
  placeholder: string;
};

export const lightTheme: ThemeColors = {
  background: '#F3F4F6', // Light gray background
  card: '#FFFFFF',
  cardBorder: '#E5E7EB',
  textPrimary: '#111827',
  textSecondary: '#6B7280',
  primary: '#50D1AA',
  primaryLight: 'rgba(80,209,170,0.15)',
  danger: '#EF4444',
  success: '#10B981',
  warning: '#F59E0B',
  inputBackground: '#F9FAFB',
  inputBorder: '#D1D5DB',
  inputText: '#111827',
  icon: '#6B7280',
  placeholder: '#9CA3AF',
};

export const darkTheme: ThemeColors = {
  background: '#0D1B2A',
  card: 'rgba(17,24,39,0.85)',
  cardBorder: 'rgba(255,255,255,0.08)',
  textPrimary: '#F9FAFB',
  textSecondary: '#6B7280',
  primary: '#50D1AA',
  primaryLight: 'rgba(80,209,170,0.15)',
  danger: '#EF4444',
  success: '#10B981',
  warning: '#F59E0B',
  inputBackground: 'rgba(31,41,55,0.9)',
  inputBorder: 'rgba(255,255,255,0.08)',
  inputText: '#F9FAFB',
  icon: '#6B7280',
  placeholder: '#4B5563',
};
