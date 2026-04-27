import { View, StyleSheet, TouchableOpacity, Alert } from 'react-native';
import Text from '@/components/ui/Text';
import { Ionicons } from '@expo/vector-icons';
import { useAppStore } from '@/store/app.store';
import { useRouter } from 'expo-router';

export default function SettingsScreen() {
  const user = useAppStore((s) => s.user);
  const logout = useAppStore((s) => s.logout);
  const router = useRouter();

  const handleLogout = () => {
    Alert.alert(
      'Cerrar Sesión',
      '¿Estás seguro de que deseas cerrar la sesión?',
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Salir',
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
    <View style={styles.container}>
      {/* User info card */}
      <View style={styles.userCard}>
        <View style={styles.avatar}>
          <Text style={styles.avatarText}>
            {user?.name?.charAt(0)?.toUpperCase() ?? 'U'}
          </Text>
        </View>
        <View style={styles.userInfo}>
          <Text style={styles.userName}>{user?.name ?? 'Usuario'}</Text>
          <Text style={styles.userTenant} numberOfLines={1}>
            {user?.tenant.url ?? '—'}
          </Text>
          <Text style={styles.userDb}>DB: {user?.tenant.db ?? '—'}</Text>
        </View>
      </View>

      {/* Logout */}
      <TouchableOpacity style={styles.logoutBtn} onPress={handleLogout}>
        <Ionicons name="log-out-outline" size={20} color="#EF4444" />
        <Text style={styles.logoutText}>Cerrar Sesión</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0D1B2A',
    padding: 20,
    paddingTop: 60,
    gap: 24,
  },
  userCard: {
    backgroundColor: '#111827',
    borderRadius: 16,
    padding: 20,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.06)',
  },
  avatar: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: '#3B82F6',
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarText: { fontSize: 22, fontWeight: '700', color: '#fff' },
  userInfo: { flex: 1, gap: 2 },
  userName: { fontSize: 17, fontWeight: '700', color: '#F9FAFB' },
  userTenant: { fontSize: 12, color: '#6B7280' },
  userDb: { fontSize: 11, color: '#4B5563' },
  logoutBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    backgroundColor: 'rgba(239,68,68,0.1)',
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: 'rgba(239,68,68,0.2)',
  },
  logoutText: { fontSize: 15, fontWeight: '600', color: '#EF4444' },
});
