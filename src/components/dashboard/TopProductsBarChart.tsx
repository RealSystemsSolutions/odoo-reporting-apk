import { View, StyleSheet } from 'react-native';
import Text from '@/components/ui/Text';
import {
  VictoryChart,
  VictoryBar,
  VictoryAxis,
  VictoryTheme,
  VictoryLabel,
} from 'victory-native';
import type { TopProduct } from '@/types/odoo.types';
import { useResponsive } from '@/hooks/useResponsive';
import { useTheme } from '@/theme/ThemeContext';

interface Props {
  data: TopProduct[];
  title?: string;
}

const BAR_COLORS = ['#3B82F6', '#10B981', '#F59E0B', '#8B5CF6', '#EC4899'];

export default function TopProductsBarChart({
  data,
  title = 'Top Products / Services',
}: Props) {
  const { width, contentPadding, isTablet, chartColumns } = useResponsive();
  const availableSpace = width - contentPadding * 2; // Always full width in layout
  const chartWidth = Math.max(availableSpace - 32, 150);
  const { colors } = useTheme();

  // Shorten product names for display
  const chartData = data.map((p, i) => ({
    x: p.name.length > 20 ? p.name.slice(0, 20) + '…' : p.name,
    y: p.qty,
    fill: BAR_COLORS[i % BAR_COLORS.length],
    label: `${p.qty} units`,
  }));

  if (!data || data.length === 0) {
    return (
      <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.cardBorder, minHeight: 240, justifyContent: 'center', alignItems: 'center' }]}>
        <Text style={[styles.title, { color: colors.textPrimary }]}>{title}</Text>
        <Text style={{ color: colors.textSecondary, marginTop: 16 }}>No data available</Text>
      </View>
    );
  }

  return (
    <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.cardBorder }]}>
      <Text style={[styles.title, { color: colors.textPrimary }]}>{title}</Text>

      <VictoryChart
        width={chartWidth}
        height={isTablet ? 280 : 240}
        theme={VictoryTheme.grayscale}
        domainPadding={{ x: 20 }}
        padding={{ top: 16, bottom: 80, left: 24, right: 48 }}
      >
        <VictoryBar
          data={chartData}
          horizontal={false}
          style={{
            data: {
              fill: ({ datum }) => datum.fill as string,
              borderRadius: 4,
            },
            labels: {
              fill: colors.textSecondary,
              fontSize: 11,
              fontWeight: '600',
            },
          }}
          barWidth={isTablet ? 36 : 28}
          cornerRadius={{ top: 4 }}
          labels={({ datum }) => datum.label}
          labelComponent={<VictoryLabel dy={-6} />}
        />

        {/* X axis — product names */}
        <VictoryAxis
          tickLabelComponent={<VictoryLabel />}
          style={{
            axis: { stroke: colors.cardBorder },
            tickLabels: {
              fill: colors.textSecondary,
              fontSize: 9,
              angle: -35,
              textAnchor: 'end',
            },
            grid: { stroke: 'transparent' },
          }}
        />

        {/* Y axis — quantity */}
        <VictoryAxis
          dependentAxis
          tickLabelComponent={<VictoryLabel />}
          tickFormat={(t: number) => (t % 50 === 0 ? String(t) : '')}
          style={{
            axis: { stroke: colors.cardBorder },
            tickLabels: { fill: colors.textSecondary, fontSize: 10 },
            grid: { stroke: colors.cardBorder, strokeDasharray: '4,4' },
          }}
        />
      </VictoryChart>

      {/* Color legend */}
      <View style={styles.legend}>
        {data.map((p, i) => (
          <View key={p.id} style={styles.legendItem}>
            <View style={[styles.dot, { backgroundColor: BAR_COLORS[i % BAR_COLORS.length] }]} />
            <Text style={[styles.legendText, { color: colors.textSecondary }]} numberOfLines={1}>
              {p.name}
            </Text>
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
    marginBottom: 25,
  },
  legend: { gap: 6, marginTop: 8 },
  legendItem: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  dot: { width: 8, height: 8, borderRadius: 4 },
  legendText: { fontSize: 11, flex: 1 },
});
