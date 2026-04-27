import { View, StyleSheet } from 'react-native';
import Text from '@/components/ui/Text';
import { VictoryPie, VictoryLabel } from 'victory-native';
import type { CategorySlice } from '@/types/odoo.types';
import { useResponsive } from '@/hooks/useResponsive';
import { useTheme } from '@/theme/ThemeContext';

interface Props {
  data: CategorySlice[];
  title?: string;
}

export default function CategoryDonutChart({
  data,
  title = 'Distribución por Categoría',
}: Props) {
  const { width, contentPadding, isTablet, chartColumns } = useResponsive();
  const availableSpace = chartColumns === 2 ? (width - contentPadding * 2 - 16) / 2 : width - contentPadding * 2;
  const size = Math.max(Math.min(availableSpace - 32, isTablet ? 280 : 220), 150);
  const { colors } = useTheme();

  const victoryData = data.map((d) => ({
    x: d.category,
    y: d.value,
    color: d.color,
    label: `${d.value}%`,
  }));

  const total = data.reduce((sum, d) => sum + d.value, 0);

  if (!data || data.length === 0) {
    return (
      <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.cardBorder, minHeight: 220, justifyContent: 'center', alignItems: 'center' }]}>
        <Text style={[styles.title, { color: colors.textPrimary }]}>{title}</Text>
        <Text style={{ color: colors.textSecondary, marginTop: 16 }}>No hay datos disponibles</Text>
      </View>
    );
  }

  return (
    <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.cardBorder }]}>
      <Text style={[styles.title, { color: colors.textPrimary }]}>{title}</Text>

      <View style={styles.chartWrapper}>
        <VictoryPie
          data={victoryData}
          labelComponent={<VictoryLabel />}
          width={size}
          height={size}
          innerRadius={size * 0.28}
          padAngle={2}
          colorScale={data.map((d) => d.color)}
          style={{
            labels: { fill: colors.textSecondary, fontSize: 12, fontWeight: '600' },
          }}
          labelRadius={({ innerRadius }) =>
            typeof innerRadius === 'number' ? innerRadius + size * 0.13 : size * 0.35
          }
        />

        {/* Center label */}
        <View style={[styles.centerLabel, { backgroundColor: colors.card, width: size * 0.38, height: size * 0.38, borderRadius: size * 0.19, marginTop: -(size * 0.69) }]}>
          <Text style={[styles.centerValue, { color: colors.textPrimary }]}>{total}%</Text>
          <Text style={[styles.centerSub, { color: colors.textSecondary }]}>Total</Text>
        </View>
      </View>

      {/* Legend */}
      <View style={styles.legend}>
        {data.map((d) => (
          <View key={d.id} style={styles.legendItem}>
            <View style={[styles.dot, { backgroundColor: d.color }]} />
            <Text style={[styles.legendCategory, { color: colors.textSecondary }]}>{d.category}</Text>
            <Text style={[styles.legendValue, { color: colors.textPrimary }]}>{d.value}%</Text>
          </View>
        ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    overflow: 'hidden',
  },
  title: {
    fontSize: 15,
    fontWeight: '700',
    marginBottom: 8,
  },
  chartWrapper: { alignItems: 'center' },
  centerLabel: {
    alignSelf: 'center',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 10,
  },
  centerValue: { fontSize: 18, fontWeight: '700' },
  centerSub: { fontSize: 11 },
  legend: { gap: 10, marginTop: 60 },
  legendItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  dot: { width: 10, height: 10, borderRadius: 5 },
  legendCategory: { flex: 1, fontSize: 13 },
  legendValue: { fontSize: 13, fontWeight: '700' },
});
