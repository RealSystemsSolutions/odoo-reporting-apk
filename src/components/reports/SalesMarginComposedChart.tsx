import { View, StyleSheet } from 'react-native';
import Text from '@/components/ui/Text';
import {
  VictoryChart,
  VictoryArea,
  VictoryLine,
  VictoryAxis,
  VictoryTheme,
  VictoryTooltip,
  VictoryLabel,
  VictoryLegend,
  VictoryVoronoiContainer,
  VictoryScatter,
} from 'victory-native';
import type { SalesMarginDataPoint } from '@/types/odoo.types';
import { useResponsive } from '@/hooks/useResponsive';
import { useTheme } from '@/theme/ThemeContext';

interface Props {
  data: SalesMarginDataPoint[];
  title?: string;
}

export default function SalesMarginComposedChart({
  data,
  title = 'Revenue vs Sales Cost',
}: Props) {
  const { width, contentPadding, isTablet } = useResponsive();
  const chartWidth = width - contentPadding * 2 - 32;
  const { colors } = useTheme();

  if (!data || data.length === 0) {
    return (
      <View
        style={[
          styles.card,
          {
            backgroundColor: colors.card,
            borderColor: colors.cardBorder,
            minHeight: 240,
            justifyContent: 'center',
            alignItems: 'center',
          },
        ]}
      >
        <Text style={[styles.title, { color: colors.textPrimary }]}>{title}</Text>
        <Text style={{ color: colors.textSecondary, marginTop: 16 }}>
          No data available
        </Text>
      </View>
    );
  }

  const chartData = data.map((d) => ({
    x: d.month.substring(0, 3),
    revenue: d.revenue,
    cogs: d.cogs,
    margin: d.revenue - d.cogs,
    label: `${d.month}\nRev: $${(d.revenue / 1000).toFixed(1)}k\nCOGS: $${(d.cogs / 1000).toFixed(1)}k`,
  }));

  const revenueData = chartData.map((d) => ({ x: d.x, y: d.revenue }));
  const cogsData = chartData.map((d) => ({ x: d.x, y: d.cogs }));

  return (
    <View
      style={[
        styles.card,
        { backgroundColor: colors.card, borderColor: colors.cardBorder },
      ]}
    >
      <View style={styles.header}>
        <View>
          <Text style={[styles.title, { color: colors.textPrimary }]}>{title}</Text>
          <Text style={[styles.subtitle, { color: colors.textSecondary }]}>
            Trends and profitability analysis
          </Text>
        </View>
      </View>

      <View style={{ height: isTablet ? 300 : 260 }}>
        <VictoryChart
          width={chartWidth}
          height={isTablet ? 260 : 220}
          theme={VictoryTheme.grayscale}
          padding={{ top: 10, bottom: 40, left: 52, right: 16 }}
        >
          {/* Revenue Area */}
          <VictoryArea
            data={revenueData}
            interpolation="monotoneX"
            style={{
              data: {
                fill: colors.primary || '#3B82F6',
                fillOpacity: 0.2,
                stroke: colors.primary || '#3B82F6',
                strokeWidth: 3,
              },
            }}
          />

          {/* COGS Line */}
          <VictoryLine
            data={cogsData}
            interpolation="monotoneX"
            style={{
              data: {
                stroke: colors.warning || '#F59E0B',
                strokeWidth: 2,
                strokeDasharray: '4,4',
              },
            }}
          />

          <VictoryAxis
            style={{
              axis: { stroke: colors.cardBorder || '#EEE' },
              tickLabels: { fill: colors.textSecondary || '#666', fontSize: 10 },
            }}
          />

          <VictoryAxis
            dependentAxis
            tickFormat={(t: number) => `$${(t / 1000).toFixed(0)}k`}
            style={{
              axis: { stroke: colors.cardBorder || '#EEE' },
              tickLabels: { fill: colors.textSecondary || '#666', fontSize: 10 },
              grid: { stroke: colors.cardBorder || '#EEE', strokeDasharray: '4,4' },
            }}
          />
        </VictoryChart>

        {/* Legend outside */}
        <View style={styles.legendContainer}>
          <View style={styles.legendItem}>
            <View style={[styles.legendBullet, { backgroundColor: colors.primary || '#3B82F6' }]} />
            <Text style={[styles.legendText, { color: colors.textSecondary }]}>Revenue</Text>
          </View>
          <View style={styles.legendItem}>
            <View style={[styles.legendBullet, { backgroundColor: colors.warning || '#F59E0B', borderRadius: 0, height: 2 }]} />
            <Text style={[styles.legendText, { color: colors.textSecondary }]}>COGS</Text>
          </View>
        </View>
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
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 8,
  },
  title: {
    fontSize: 15,
    fontWeight: '700',
  },
  subtitle: {
    fontSize: 11,
    marginTop: 2,
  },
  legendContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 20,
    marginTop: -10,
  },
  legendItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  legendBullet: {
    width: 10,
    height: 10,
    borderRadius: 5,
  },
  legendText: {
    fontSize: 11,
    fontWeight: '600',
  },
});
