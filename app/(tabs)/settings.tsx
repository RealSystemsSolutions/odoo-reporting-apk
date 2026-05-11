import { View, StyleSheet, TouchableOpacity, Alert, ScrollView } from 'react-native';
import Text from '@/components/ui/Text';
import { Ionicons } from '@expo/vector-icons';
import { useAppStore } from '@/store/app.store';
import { useRouter } from 'expo-router';
import { useTheme } from '@/theme/ThemeContext';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

export default function SettingsScreen() {
  const user = useAppStore((s) => s.user);
  const logout = useAppStore((s) => s.logout);
  const router = useRouter();
  const { themeName, colors, setTheme } = useTheme();
  const insets = useSafeAreaInsets();

  const handleLogout = () => {
    Alert.alert(
      'Logout',
      'Are you sure you want to log out?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Logout',
          style: 'destructive',
          onPress: async () => {
            await logout();
            router.replace('/(auth)/login');
          },
        },
      ]
    );
  };

  return (
    <ScrollView 
      style={[styles.container, { backgroundColor: colors.background }]}
      contentContainerStyle={{ paddingTop: insets.top + 20, paddingBottom: 100, paddingHorizontal: 20 }}
    >
      <Text style={[styles.title, { color: colors.textPrimary }]}>Settings</Text>

      {/* User info card */}
      <View style={[styles.userCard, { backgroundColor: colors.card, borderColor: colors.cardBorder }]}>
        <View style={[styles.avatar, { backgroundColor: colors.primary }]}>
          <Text style={styles.avatarText}>
            {user?.name?.charAt(0)?.toUpperCase() ?? 'U'}
          </Text>
        </View>
        <View style={styles.userInfo}>
          <Text style={[styles.userName, { color: colors.textPrimary }]}>{user?.name ?? 'User'}</Text>
          <Text style={[styles.userTenant, { color: colors.textSecondary }]} numberOfLines={1}>
            {user?.tenant.url ?? '—'}
          </Text>
          <Text style={[styles.userDb, { color: colors.textSecondary }]}>DB: {user?.tenant.db ?? '—'}</Text>
        </View>
      </View>

      {/* Theme Section */}
      <View style={styles.section}>
        <Text style={[styles.sectionTitle, { color: colors.textSecondary }]}>APPEARANCE</Text>
        <View style={[styles.optionsCard, { backgroundColor: colors.card, borderColor: colors.cardBorder }]}>
          <TouchableOpacity 
            style={[styles.optionItem, { borderBottomWidth: 1, borderBottomColor: colors.cardBorder }]} 
            onPress={() => setTheme('light')}
          >
            <View style={styles.optionLeft}>
              <Ionicons name="sunny-outline" size={20} color={themeName === 'light' ? colors.primary : colors.textSecondary} />
              <Text style={[styles.optionText, { color: colors.textPrimary }]}>Light Mode</Text>
            </View>
            {themeName === 'light' && <Ionicons name="checkmark" size={20} color={colors.primary} />}
          </TouchableOpacity>

          <TouchableOpacity 
            style={styles.optionItem} 
            onPress={() => setTheme('dark')}
          >
            <View style={styles.optionLeft}>
              <Ionicons name="moon-outline" size={20} color={themeName === 'dark' ? colors.primary : colors.textSecondary} />
              <Text style={[styles.optionText, { color: colors.textPrimary }]}>Dark Mode</Text>
            </View>
            {themeName === 'dark' && <Ionicons name="checkmark" size={20} color={colors.primary} />}
          </TouchableOpacity>
        </View>
      </View>

      {/* Account Section */}
      <View style={styles.section}>
        <Text style={[styles.sectionTitle, { color: colors.textSecondary }]}>ACCOUNT</Text>
        <TouchableOpacity 
          style={[styles.logoutBtn, { backgroundColor: colors.danger + '10', borderColor: colors.danger + '30' }]} 
          onPress={handleLogout}
        >
          <Ionicons name="log-out-outline" size={20} color={colors.danger || '#EF4444'} />
          <Text style={[styles.logoutText, { color: colors.danger || '#EF4444' }]}>Logout</Text>
        </TouchableOpacity>
      </View>

      <View style={styles.versionInfo}>
        <Text style={[styles.versionText, { color: colors.textSecondary }]}>Version 1.0.0 (Odoo v18 compatible)</Text>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  title: {
    fontSize: 28,
    fontWeight: '700',
    marginBottom: 24,
  },
  userCard: {
    borderRadius: 16,
    padding: 20,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
    borderWidth: 1,
    marginBottom: 32,
  },
  avatar: {
    width: 60,
    height: 60,
    borderRadius: 30,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarText: { fontSize: 24, fontWeight: '700', color: '#fff' },
  userInfo: { flex: 1, gap: 2 },
  userName: { fontSize: 18, fontWeight: '700' },
  userTenant: { fontSize: 13 },
  userDb: { fontSize: 12 },
  section: {
    marginBottom: 32,
  },
  sectionTitle: {
    fontSize: 12,
    fontWeight: '700',
    letterSpacing: 1,
    marginBottom: 12,
    paddingLeft: 4,
  },
  optionsCard: {
    borderRadius: 16,
    borderWidth: 1,
    overflow: 'hidden',
  },
  optionItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 16,
  },
  optionLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  optionText: {
    fontSize: 16,
    fontWeight: '500',
  },
  logoutBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
  },
  logoutText: { fontSize: 16, fontWeight: '600' },
  versionInfo: {
    alignItems: 'center',
    marginTop: 'auto',
  },
  versionText: {
    fontSize: 12,
  },
});
