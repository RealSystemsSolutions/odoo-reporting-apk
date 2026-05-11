import { View, StyleSheet, Dimensions } from 'react-native';
import Text from '@/components/ui/Text';
import { VictoryLine, VictoryArea, VictoryChart, VictoryAxis, VictoryTheme, VictoryTooltip, VictoryVoronoiContainer, VictoryLabel } from 'victory-native';
import type { SalesPoint } from '@/types/odoo.types';
import { useResponsive } from '@/hooks/useResponsive';
import { useTheme } from '@/theme/ThemeContext';

interface Props {
  data: SalesPoint[];
  title?: string;
}

export default function SalesLineChart({ data, title = 'Sales Evolution' }: Props) {
  const { width, contentPadding, isTablet, chartColumns } = useResponsive();
  const availableSpace = chartColumns === 2 ? (width - contentPadding * 2 - 16) / 2 : width - contentPadding * 2;
  const chartWidth = Math.max(availableSpace - 32, 150);
  const { colors } = useTheme();

  // Sample data for x-axis labels (every 5 days or all if very few)
  const labeledData = data.filter((_, i) => data.length <= 5 || i % 5 === 0 || i === data.length - 1);

  // If there's only 1 point, Victory's monotoneX and domain scaling break/look infinite. 
  // We pad it with 2 invisible anchor points.
  const victoryData = data.length === 1
    ? [
        { x: 0, y: data[0].amount, tooltipText: '' },
        { x: 1, y: data[0].amount, tooltipText: `${data[0].date}\n$${(data[0].amount / 1000).toFixed(1)}k` },
        { x: 2, y: data[0].amount, tooltipText: '' },
      ]
    : data.map((d, i) => ({ x: i + 1, y: d.amount, tooltipText: `${d.date}\n$${(d.amount / 1000).toFixed(1)}k` }));

  const interpolationType = data.length > 2 ? 'monotoneX' : 'linear';

  if (!data || data.length === 0) {
    return (
      <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.cardBorder, minHeight: 200, maxHeight: 350, justifyContent: 'center', alignItems: 'center' }]}>
        <Text style={[styles.title, { color: colors.textPrimary }]}>{title}</Text>
        <Text style={{ color: colors.textSecondary, marginTop: 16 }}>No data available</Text>
      </View>
    );
  }

  return (
    <View style={[styles.card, { backgroundColor: colors.card, maxHeight: 350, borderColor: colors.cardBorder }]}>
      <Text style={[styles.title, { color: colors.textPrimary }]}>{title}</Text>
      <VictoryChart
        width={chartWidth}
        height={isTablet ? 240 : 200}
        theme={VictoryTheme.grayscale}
        padding={{ top: 20, bottom: 40, left: 52, right: 16 }}
        containerComponent={
          <VictoryVoronoiContainer
            voronoiDimension="x"
            labels={({ datum }) => datum.tooltipText}
            labelComponent={
              <VictoryTooltip
                flyoutStyle={{ fill: colors.card, stroke: colors.cardBorder }}
                style={{ fill: colors.textPrimary, fontSize: 11 }}
              />
            }
          />
        }
      >
        {/* Area fill */}
        <VictoryArea
          data={victoryData}
          labelComponent={<VictoryLabel />}
          style={{
            data: {
              fill: colors.primaryLight,
              stroke: 'transparent',
            },
          }}
          interpolation={interpolationType}
        />

        {/* Line */}
        <VictoryLine
          data={victoryData}
          labelComponent={<VictoryLabel />}
          style={{
            data: {
              stroke: colors.primary,
              strokeWidth: 2.5,
            },
          }}
          interpolation={interpolationType}
        />

        {/* X axis */}
        <VictoryAxis
          tickLabelComponent={<VictoryLabel />}
          tickValues={labeledData.map((d) => data.indexOf(d) + 1)}
          tickFormat={(t: number) =>
            data[t - 1]?.date.replace(' Feb', '') ?? t
          }
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
