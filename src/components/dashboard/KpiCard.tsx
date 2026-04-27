import React from 'react';
import { View, StyleSheet } from 'react-native';
import Text from '@/components/ui/Text';
import { Ionicons } from '@expo/vector-icons';
import type { KpiData } from '@/types/odoo.types';
import { useTheme } from '@/theme/ThemeContext';

interface Props {
  kpi: KpiData;
}

function formatValue(value: number, unit: KpiData['unit']): string {
  if (unit === '$') {
    return value >= 1_000
      ? `$${(value / 1_000).toFixed(1)}k`
      : `$${value.toLocaleString('es')}`;
  }
  if (unit === '%') return `${value.toFixed(1)}%`;
  return value.toLocaleString('es');
}

export const KpiCard = React.memo(function KpiCard({ kpi }: Props) {
  const { colors } = useTheme();
  const isPositive = kpi.change >= 0;
  const changeColor = isPositive ? colors.success : colors.danger;
  const changeIcon = isPositive ? 'trending-up' : 'trending-down';

  return (
    <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.cardBorder }]}>
      {/* Accent bar */}
      <View style={[styles.accentBar, { backgroundColor: kpi.accentColor }]} />

      {/* Icon */}
      <View style={[styles.iconBadge, { backgroundColor: `${kpi.accentColor}20` }]}>
        <Ionicons
          name={kpi.icon as React.ComponentProps<typeof Ionicons>['name']}
          size={20}
          color={kpi.accentColor}
        />
      </View>

      <Text style={[styles.label, { color: colors.textSecondary }]} numberOfLines={2}>
        {kpi.label}
      </Text>
      <Text style={[styles.value, { color: colors.textPrimary }]}>{formatValue(kpi.value, kpi.unit)}</Text>

      {/* Change indicator */}
      <View style={styles.changeRow}>
        <Ionicons name={changeIcon} size={13} color={changeColor} />
        <Text style={[styles.changeText, { color: changeColor }]}>
          {Math.abs(kpi.change).toFixed(1)}% vs anterior
        </Text>
      </View>
    </View>
  );
});

const styles = StyleSheet.create({
  card: {
    flex: 1,
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    overflow: 'hidden',
    gap: 8,
  },
  accentBar: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: 3,
    borderTopLeftRadius: 16,
    borderTopRightRadius: 16,
  },
  iconBadge: {
    width: 40,
    height: 40,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 8,
  },
  label: { fontSize: 12, lineHeight: 16 },
  value: { fontSize: 22, fontWeight: '700', letterSpacing: -0.5 },
  changeRow: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  changeText: { fontSize: 11, fontWeight: '600' },
});
