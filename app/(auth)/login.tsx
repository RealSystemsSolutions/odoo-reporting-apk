import React, { useState } from 'react';
import { View, TextInput, TouchableOpacity, StyleSheet, KeyboardAvoidingView, ScrollView, Platform, ActivityIndicator, Alert } from 'react-native';
import Text from '@/components/ui/Text';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { authenticate } from '@/services/auth.service';
import { useAppStore } from '@/store/app.store';
import { useRouter } from 'expo-router';
import { useTheme } from '@/theme/ThemeContext';
import Logo from '@/components/ui/Logo';

interface FormState {
  tenantUrl: string;
  db: string;
  login: string;
  password: string;
}

interface FieldErrors {
  tenantUrl?: string;
  db?: string;
  login?: string;
  password?: string;
}

type FieldKey = keyof FormState;

export default function LoginScreen() {
  const router = useRouter();
  const storeLogin = useAppStore((s) => s.login);

  const [form, setForm] = useState<FormState>({
    tenantUrl: '',
    db: '',
    login: '',
    password: '',
  });
  const [errors, setErrors] = useState<FieldErrors>({});
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const { colors, themeName } = useTheme();

  const set = (key: FieldKey) => (value: string) => {
    setForm((prev) => ({ ...prev, [key]: value }));
    if (errors[key]) setErrors((prev) => ({ ...prev, [key]: undefined }));
  };

  const validate = (): boolean => {
    const next: FieldErrors = {};
    if (!form.tenantUrl.trim()) next.tenantUrl = 'Server URL is required';
    else if (!form.tenantUrl.startsWith('http'))
      next.tenantUrl = 'Must start with http:// or https://';
    if (!form.db.trim()) next.db = 'Database name is required';
    if (!form.login.trim()) next.login = 'Email is required';
    if (!form.password) next.password = 'Password is required';
    setErrors(next);
    return Object.keys(next).length === 0;
  };

  const handleLogin = async () => {
    if (!validate()) return;
    setLoading(true);
    try {
      const user = await authenticate({
        tenantUrl: form.tenantUrl.trim(),
        db: form.db.trim(),
        login: form.login.trim(),
        password: form.password,
      });
      await storeLogin(user);
      router.replace('/(tabs)');
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Unknown error';
      Alert.alert('Authentication Error', msg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <LinearGradient
      colors={themeName === 'light' ? ['#F3F4F6', '#E5E7EB', '#F3F4F6'] : ['#0D1B2A', '#1A2F4A', '#0D1B2A']}
      style={styles.gradient}
    >
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.kav}
      >
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          {/* Logo / Header */}
          <View style={styles.logoContainer}>
            <View style={styles.logoCircle}>
              <Logo width={80} height={80} />
            </View>
            <Text style={[styles.appTitle, { color: colors.primary }]}>SwicPOS Pocket</Text>
            <Text style={[styles.appSubtitle, { color: colors.textSecondary }]}>Business Intelligence Dashboard</Text>
          </View>

          {/* Glass Card */}
          <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.cardBorder }]}>
            <Text style={[styles.cardTitle, { color: colors.textPrimary }]}>Sign In</Text>
            <Text style={[styles.cardSubtitle, { color: colors.textSecondary }]}>Connect to your Odoo instance</Text>

            {/* Tenant URL */}
            <InputField
              label="Server URL"
              icon="link-outline"
              placeholder="https://miempresa.odoo.com"
              value={form.tenantUrl}
              onChangeText={set('tenantUrl')}
              error={errors.tenantUrl}
              autoCapitalize="none"
              keyboardType="url"
            />

            {/* Database */}
            <InputField
              label="Database"
              icon="server-outline"
              placeholder="nombre_db"
              value={form.db}
              onChangeText={set('db')}
              error={errors.db}
              autoCapitalize="none"
            />

            {/* Email */}
            <InputField
              label="Email Address"
              icon="mail-outline"
              placeholder="admin@empresa.com"
              value={form.login}
              onChangeText={set('login')}
              error={errors.login}
              autoCapitalize="none"
              keyboardType="email-address"
            />

            {/* Password */}
            <InputField
              label="Password"
              icon="lock-closed-outline"
              placeholder="••••••••"
              value={form.password}
              onChangeText={set('password')}
              error={errors.password}
              secureTextEntry={!showPassword}
              rightElement={
                <TouchableOpacity
                  onPress={() => setShowPassword((v) => !v)}
                  style={styles.eyeBtn}
                  accessibilityLabel={showPassword ? 'Hide password' : 'Show password'}
                >
                  <Ionicons
                    name={showPassword ? 'eye-off-outline' : 'eye-outline'}
                    size={20}
                    color={colors.icon}
                  />
                </TouchableOpacity>
              }
            />

            {/* Submit */}
            <TouchableOpacity
              style={[
                styles.loginBtn,
                { backgroundColor: colors.primary },
                loading && styles.loginBtnDisabled
              ]}
              onPress={handleLogin}
              disabled={loading}
              accessibilityRole="button"
              accessibilityLabel="Sign In"
            >
              {loading ? (
                <ActivityIndicator color="#fff" size="small" />
              ) : (
                <>
                  <Text style={styles.loginBtnText}>Login</Text>
                  <Ionicons name="arrow-forward" size={18} color="#fff" />
                </>
              )}
            </TouchableOpacity>
          </View>

          <Text style={[styles.footer, { color: colors.textSecondary }]}>
            Multi-tenant · Real-time data · Secure
          </Text>
        </ScrollView>
      </KeyboardAvoidingView>
    </LinearGradient>
  );
}

// ─── Input Field Sub-component ────────────────────────────────────────────────

interface InputFieldProps {
  label: string;
  icon: React.ComponentProps<typeof Ionicons>['name'];
  placeholder: string;
  value: string;
  onChangeText: (v: string) => void;
  error?: string;
  secureTextEntry?: boolean;
  autoCapitalize?: 'none' | 'sentences' | 'words' | 'characters';
  keyboardType?: 'default' | 'email-address' | 'url';
  rightElement?: React.ReactNode;
}

const InputField = React.memo(function InputField({
  label,
  icon,
  placeholder,
  value,
  onChangeText,
  error,
  secureTextEntry,
  autoCapitalize = 'sentences',
  keyboardType = 'default',
  rightElement,
}: InputFieldProps) {
  const { colors } = useTheme();

  return (
    <View style={styles.fieldGroup}>
      <Text style={[styles.label, { color: colors.textSecondary }]}>{label}</Text>
      <View style={[styles.inputWrapper, { backgroundColor: colors.inputBackground, borderColor: colors.inputBorder }, !!error && { borderColor: colors.danger }]}>
        <Ionicons name={icon} size={18} color={colors.icon} style={styles.inputIcon} />
        <TextInput
          style={[styles.input, { color: colors.inputText }]}
          placeholder={placeholder}
          placeholderTextColor={colors.placeholder}
          value={value}
          onChangeText={onChangeText}
          secureTextEntry={secureTextEntry}
          autoCapitalize={autoCapitalize}
          keyboardType={keyboardType}
          autoCorrect={false}
          selectionColor={colors.primary}
        />
        {rightElement}
      </View>
      {!!error && (
        <Text style={[styles.errorText, { color: colors.danger }]}>
          <Ionicons name="alert-circle-outline" size={12} color={colors.danger} /> {error}
        </Text>
      )}
    </View>
  );
});

// ─── Styles ───────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  gradient: { flex: 1 },
  kav: { flex: 1 },
  scrollContent: {
    flexGrow: 1,
    justifyContent: 'center',
    padding: 20,
    paddingBottom: 40,
  },

  // Logo
  logoContainer: { alignItems: 'center', marginBottom: 32 },
  logoCircle: {
    width: 100,
    height: 100,
    alignItems: 'center',
    justifyContent: 'center',
   
  },
  appTitle: {
    fontSize: 34,
    fontWeight: '700',
    color: '#F9FAFB',
    letterSpacing: -0.5,
  },
  appSubtitle: {
    fontSize: 13,
    color: '#6B7280',
    marginTop: 4,
  },

  // Glass card
  card: {
    borderRadius: 20,
    padding: 24,
    borderWidth: 1,
  },
  cardTitle: {
    fontSize: 20,
    fontWeight: '700',
    marginBottom: 4,
  },
  cardSubtitle: {
    fontSize: 13,
    marginBottom: 24,
  },

  // Fields
  fieldGroup: { marginBottom: 16 },
  label: {
    fontSize: 12,
    fontWeight: '600',
    marginBottom: 6,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  inputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 12,
    borderWidth: 1,
    paddingHorizontal: 12,
    minHeight: 52,
  },
  inputIcon: { marginRight: 8 },
  input: {
    flex: 1,
    fontSize: 15,
    paddingVertical: 0,
  },
  eyeBtn: { padding: 4 },
  errorText: { fontSize: 12, marginTop: 4 },

  // Login button
  loginBtn: {
    borderRadius: 12,
    height: 52,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    marginTop: 8,
  },
  loginBtnDisabled: { opacity: 0.7 },
  loginBtnText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '700',
  },

  footer: {
    textAlign: 'center',
    fontSize: 11,
    marginTop: 20,
  },
});
