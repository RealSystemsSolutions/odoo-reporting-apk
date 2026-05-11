import { View, StyleSheet, Dimensions } from 'react-native';
import Text from '@/components/ui/Text';
import {
  VictoryChart,
  VictoryArea,
  VictoryAxis,
  VictoryTheme,
  VictoryTooltip,
  VictoryLabel,
  VictoryVoronoiContainer,
} from 'victory-native';
import type { PosShiftReport } from '@/types/odoo.types';
import { useResponsive } from '@/hooks/useResponsive';
import { useTheme } from '@/theme/ThemeContext';
import { Ionicons } from '@expo/vector-icons';

interface Props {
  data: PosShiftReport;
}

export default function PosShiftAnalysis({ data }: Props) {
  const { width, contentPadding, isTablet } = useResponsive();
  const chartWidth = width - contentPadding * 2 - 32;
  const { colors } = useTheme();

  if (!data) {
    return (
      <View
        style={[
          styles.card,
          {
            backgroundColor: colors.card,
            borderColor: colors.cardBorder,
            minHeight: 200,
            justifyContent: 'center',
            alignItems: 'center',
          },
        ]}
      >
        <Text style={[styles.title, { color: colors.textPrimary }]}>
          POS Analysis
        </Text>
        <Text style={{ color: colors.textSecondary, marginTop: 16 }}>
          No data available
        </Text>
      </View>
    );
  }

  const chartData = data.todayHourlySales
    .filter((h) => h.sales > 0)
    .map((h) => ({
      x: h.hour,
      y: h.sales,
      label: `${h.label}\n$${(h.sales / 1000).toFixed(1)}k`,
    }));

  const victoryData =
    chartData.length > 0
      ? chartData
      : [{ x: 0, y: 0, label: 'No data' }];

  return (
    <View
      style={[
        styles.card,
        { backgroundColor: colors.card, borderColor: colors.cardBorder },
      ]}
    >
      <Text style={[styles.title, { color: colors.textPrimary }]}>
        POS Analysis
      </Text>

      {/* Metric cards grid */}
      <View style={styles.metricsGrid}>
        <View
          style={[
            styles.metricCard,
            { backgroundColor: colors.inputBackground },
          ]}
        >
          <View style={styles.metricIconWrapper}>
            <Ionicons
              name="cash-outline"
              size={20}
              color={colors.primary}
            />
          </View>
          <Text style={[styles.metricLabel, { color: colors.textSecondary }]}>
            Total Sales
          </Text>
          <Text style={[styles.metricValue, { color: colors.textPrimary }]}>
            ${(data.totalDaySales / 1000).toFixed(1)}k
          </Text>
        </View>

        <View
          style={[
            styles.metricCard,
            { backgroundColor: colors.inputBackground },
          ]}
        >
          <View style={styles.metricIconWrapper}>
            <Ionicons
              name="document-outline"
              size={20}
              color={colors.warning}
            />
          </View>
          <Text style={[styles.metricLabel, { color: colors.textSecondary }]}>
            Transactions
          </Text>
          <Text style={[styles.metricValue, { color: colors.textPrimary }]}>
            {data.totalTransactions}
          </Text>
        </View>

        <View
          style={[
            styles.metricCard,
            { backgroundColor: colors.inputBackground },
          ]}
        >
          <View style={styles.metricIconWrapper}>
            <Ionicons
              name="trending-up-outline"
              size={20}
              color={colors.success}
            />
          </View>
          <Text style={[styles.metricLabel, { color: colors.textSecondary }]}>
            Avg. Ticket
          </Text>
          <Text style={[styles.metricValue, { color: colors.textPrimary }]}>
            ${(data.averageTicket / 1000).toFixed(2)}k
          </Text>
        </View>
      </View>

      {/* Hourly sales area chart */}
      <View style={{ marginTop: 16 }}>
        <Text
          style={[
            styles.chartTitle,
            { color: colors.textSecondary, marginBottom: 8 },
          ]}
        >
          Sales by Hour - Today
        </Text>

        {chartData.length > 0 ? (
          <VictoryChart
            width={chartWidth}
            height={isTablet ? 240 : 200}
            theme={VictoryTheme.grayscale}
            padding={{ top: 20, bottom: 40, left: 52, right: 16 }}
            containerComponent={
              <VictoryVoronoiContainer
                voronoiDimension="x"
                labels={({ datum }) => datum.label}
                labelComponent={
                  <VictoryTooltip
                    flyoutStyle={{ fill: colors.card, stroke: colors.cardBorder }}
                    style={{ fill: colors.textPrimary, fontSize: 10 }}
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
              interpolation="monotoneX"
            />

            {/* X axis */}
            <VictoryAxis
              tickLabelComponent={<VictoryLabel />}
              tickFormat={(t: number) => {
                const hour = chartData[t - 1]?.x;
                return hour !== undefined
                  ? `${String(hour).padStart(2, '0')}:00`
                  : '';
              }}
              tickValues={chartData.map((_, i) => i + 1)}
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
        ) : (
          <Text
            style={{
              textAlign: 'center',
              color: colors.textSecondary,
              paddingVertical: 40,
            }}
          >
            No hourly sales data
          </Text>
        )}
      </View>

      {/* POS Sessions summary */}
      {data.metrics && data.metrics.length > 0 && (
        <View style={{ marginTop: 16 }}>
          <Text
            style={[
              styles.chartTitle,
              { color: colors.textSecondary, marginBottom: 8 },
            ]}
          >
            POS Sessions
          </Text>

          <View style={{ gap: 8 }}>
            {data.metrics.slice(0, 3).map((session) => (
              <View
                key={session.sessionId}
                style={[
                  styles.sessionRow,
                  { backgroundColor: colors.inputBackground },
                ]}
              >
                <View style={{ flex: 1 }}>
                  <Text
                    style={{
                      fontSize: 13,
                      fontWeight: '600',
                      color: colors.textPrimary,
                    }}
                  >
                    {session.sessionName}
                  </Text>
                  <Text
                    style={{
                      fontSize: 11,
                      color: colors.textSecondary,
                      marginTop: 2,
                    }}
                  >
                    {session.status === 'closed' ? '✓ Closed' : '⏱ Open'}
                  </Text>
                </View>
                <View style={{ alignItems: 'flex-end' }}>
                  <Text
                    style={{
                      fontSize: 14,
                      fontWeight: '700',
                      color: colors.primary,
                    }}
                  >
                    ${(session.totalSales / 1000).toFixed(1)}k
                  </Text>
                  {Math.abs(session.discrepancyPercent) > 1 && (
                    <Text
                      style={{
                        fontSize: 11,
                        color:
                          session.discrepancyPercent > 0
                            ? colors.success
                            : colors.danger,
                        marginTop: 2,
                      }}
                    >
                      {session.discrepancyPercent > 0 ? '+' : ''}
                      {session.discrepancyPercent.toFixed(1)}%
                    </Text>
                  )}
                </View>
              </View>
            ))}
          </View>
        </View>
      )}
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
    marginBottom: 12,
  },
  chartTitle: {
    fontSize: 13,
    fontWeight: '600',
  },
  metricsGrid: {
    flexDirection: 'row',
    gap: 10,
    marginBottom: 12,
  },
  metricCard: {
    flex: 1,
    borderRadius: 12,
    padding: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  metricIconWrapper: {
    marginBottom: 8,
  },
  metricLabel: {
    fontSize: 11,
    marginBottom: 4,
    textAlign: 'center',
  },
  metricValue: {
    fontSize: 15,
    fontWeight: '700',
    textAlign: 'center',
  },
  sessionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: 10,
  },
});

