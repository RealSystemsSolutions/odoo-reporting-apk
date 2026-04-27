import { View, StyleSheet, TouchableOpacity } from 'react-native';
import Text from '@/components/ui/Text';
import Logo from '@/components/ui/Logo';
import { Ionicons } from '@expo/vector-icons';
import { useAppStore } from '@/store/app.store';
import type { ReportingPeriod } from '@/types/odoo.types';
import { useTheme } from '@/theme/ThemeContext';

interface Props {
  onRefresh: () => void;
}

const PERIODS: { key: ReportingPeriod; label: string }[] = [
  { key: 'today', label: 'Hoy' },
  { key: 'week', label: 'Semana' },
  { key: 'month', label: 'Mes' },
];

export default function DashboardHeader({ onRefresh }: Props) {
  const user = useAppStore((s) => s.user);
  const period = useAppStore((s) => s.period);
  const setPeriod = useAppStore((s) => s.setPeriod);
  const { colors, themeName, toggleTheme } = useTheme();
  const greeting = getGreeting();
  const firstName = user?.name?.split(' ')[0] ?? 'Usuario';

  return (
    <View style={styles.container}>
      <View style={styles.topRow}>
        <View style={{ flex: 1 }}>
          <Logo width={130} height={30} />
          <View style={{ flexDirection: 'row', alignItems: 'baseline', marginTop: 8 }}>
            <Text style={[styles.greeting, { color: colors.textSecondary }]}>{greeting}, </Text>
            <Text style={[styles.name, { color: colors.textPrimary }]}>{firstName} 👋</Text>
          </View>
        </View>
        <View style={styles.headerActions}>
          <TouchableOpacity
            style={[styles.refreshBtn, { backgroundColor: colors.primaryLight, borderColor: 'rgba(59,130,246,0.25)' }]}
            onPress={toggleTheme}
            accessibilityLabel="Cambiar tema"
          >
            <Ionicons name={themeName === 'light' ? 'moon-outline' : 'sunny-outline'} size={20} color={colors.primary} />
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.refreshBtn, { backgroundColor: colors.primaryLight, borderColor: 'rgba(59,130,246,0.25)' }]}
            onPress={onRefresh}
            accessibilityLabel="Actualizar datos"
          >
            <Ionicons name="refresh-outline" size={20} color={colors.primary} />
          </TouchableOpacity>
        </View>
      </View>

      {/* Period chips */}
      <View style={styles.chipRow}>
        {PERIODS.map((p) => (
          <TouchableOpacity
            key={p.key}
            style={[
              styles.chip,
              { backgroundColor: colors.inputBackground, borderColor: colors.inputBorder },
              period === p.key && { backgroundColor: colors.primary, borderColor: colors.primary }
            ]}
            onPress={() => setPeriod(p.key)}
            accessibilityRole="button"
            accessibilityLabel={`Ver datos de ${p.label}`}
          >
            <Text style={[
              styles.chipText,
              { color: colors.textSecondary },
              period === p.key && styles.chipTextActive
            ]}>
              {p.label}
            </Text>
          </TouchableOpacity>
        ))}
      </View>
    </View>
  );
}

function getGreeting(): string {
  const h = new Date().getHours();
  if (h < 12) return 'Buenos días';
  if (h < 18) return 'Buenas tardes';
  return 'Buenas noches';
}

const styles = StyleSheet.create({
  container: {
    paddingTop: 8,
    paddingBottom: 16,
    gap: 16,
  },
  topRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  headerActions: {
    flexDirection: 'row',
    gap: 8,
  },
  greeting: { fontSize: 14 },
  name: { fontSize: 22, fontWeight: '700', marginTop: 2 },
  refreshBtn: {
    width: 44,
    height: 44,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
  },
  chipRow: { flexDirection: 'row', gap: 8 },
  chip: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 1,
  },
  chipText: { fontSize: 13, fontWeight: '600' },
  chipTextActive: { color: '#fff' },
});
