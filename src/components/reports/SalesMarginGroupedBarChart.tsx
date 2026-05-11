import { View, StyleSheet, Dimensions } from 'react-native';
import Text from '@/components/ui/Text';
import {
  VictoryChart,
  VictoryBar,
  VictoryAxis,
  VictoryTheme,
  VictoryTooltip,
  VictoryLabel,
  VictoryLegend,
  VictoryVoronoiContainer,
} from 'victory-native';
import type { SalesMarginDataPoint } from '@/types/odoo.types';
import { useResponsive } from '@/hooks/useResponsive';
import { useTheme } from '@/theme/ThemeContext';

interface Props {
  data: SalesMarginDataPoint[];
  title?: string;
}

export default function SalesMarginGroupedBarChart({
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
  }));

  const revenueData = chartData.map((d) => ({
    x: d.x,
    y: d.revenue,
  }));

  const cogsData = chartData.map((d) => ({
    x: d.x,
    y: d.cogs,
  }));

  return (
    <View
      style={[
        styles.card,
        { backgroundColor: colors.card, borderColor: colors.cardBorder },
      ]}
    >
      <Text style={[styles.title, { color: colors.textPrimary }]}>{title}</Text>

      <VictoryChart
        width={chartWidth}
        height={isTablet ? 260 : 220}
        theme={VictoryTheme.grayscale}
        padding={{ top: 20, bottom: 40, left: 52, right: 16 }}
        /* containerComponent={
          <VictoryVoronoiContainer
            voronoiDimension="x"
            labels={({ datum }) =>
              datum.label || `${datum.y ? `$${(datum.y / 1000).toFixed(0)}k` : ''}`
            }
            labelComponent={
              <VictoryTooltip
                flyoutStyle={{ fill: colors.card, stroke: colors.cardBorder }}
                style={{ fill: colors.textPrimary, fontSize: 10 }}
              />
            }
          />
        } */
      >
        {/* Revenue bars */}
        <VictoryBar
          data={revenueData}
          style={{
            data: {
              fill: colors.primary,
              width: 12,
            },
          }}
          labelComponent={<VictoryLabel />}
          x="x"
          y="y"
        />

        {/* COGS bars */}
        <VictoryBar
          data={cogsData}
          style={{
            data: {
              fill: colors.warning,
              width: 12,
            },
          }}
          labelComponent={<VictoryLabel />}
          x="x"
          y="y"
        />

        {/* X axis */}
        <VictoryAxis
          tickLabelComponent={<VictoryLabel />}
          style={{
            axis: { stroke: colors.cardBorder },
            tickLabels: { fill: colors.textSecondary, fontSize: 10 },
            grid: { stroke: 'transparent' },
          }}
        />

        {/* Y axis */}
        <VictoryAxis
          dependentAxis
          tickLabelComponent={<VictoryLabel />}
          tickFormat={(t: number) => `$${(t / 1000).toFixed(0)}k`}
          style={{
            axis: { stroke: colors.cardBorder },
            tickLabels: { fill: colors.textSecondary, fontSize: 10 },
            grid: { stroke: colors.cardBorder, strokeDasharray: '4,4' },
          }}
        />

        {/* Legend */}
        <VictoryLegend
          x={chartWidth / 2 - 80}
          y={-10}
          orientation="horizontal"
          gutter={20}
          data={[
            { name: 'Revenue', symbol: { fill: colors.primary } },
            { name: 'COGS', symbol: { fill: colors.warning } },
          ]}
          style={{
            labels: { fill: colors.textSecondary, fontSize: 11, marginRight: 10 },
          }}
        />
      </VictoryChart>
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
    marginBottom: 4,
  },
});

