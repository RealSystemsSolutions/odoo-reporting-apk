import React, { useState, useCallback } from 'react';
import { ScrollView, View, StyleSheet, RefreshControl, StatusBar, Platform, SafeAreaView } from 'react-native';
import Text from '@/components/ui/Text';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import DashboardHeader from '@/components/dashboard/DashboardHeader';
import KpiCardGrid from '@/components/dashboard/KpiCardGrid';
import SalesLineChart from '@/components/dashboard/SalesLineChart';
import TopProductsBarChart from '@/components/dashboard/TopProductsBarChart';
import CategoryDonutChart from '@/components/dashboard/CategoryDonutChart';
import RecentTransactionsList from '@/components/dashboard/RecentTransactionsList';
import { useResponsive } from '@/hooks/useResponsive';
import { useTheme } from '@/theme/ThemeContext';
import { useAppStore } from '@/store/app.store';

// ─── Section title helper ──────────────────────────────────────────────────────

function SectionTitle({ children }: { children: string }) {
  const { colors } = useTheme();
  return (
    <View style={styles.sectionHeader}>
      <View style={[styles.sectionAccent, { backgroundColor: colors.primary }]} />
      <Text style={[styles.sectionTitle, { color: colors.textSecondary }]}>{children}</Text>
    </View>
  );
}

// ─── Dashboard Screen ─────────────────────────────────────────────────────────

export default function DashboardScreen() {
  const insets = useSafeAreaInsets();
  const { contentPadding, chartColumns } = useResponsive();
  const [refreshing, setRefreshing] = useState(false);
  const { colors, themeName } = useTheme();

  const dashboardData = useAppStore((s) => s.dashboardData);
  const loadDashboardData = useAppStore((s) => s.loadDashboardData);
  const isLoadingDashboard = useAppStore((s) => s.isLoadingDashboard);
  const period = useAppStore((s) => s.period);

  React.useEffect(() => {
    loadDashboardData();
  }, [loadDashboardData, period]);

  const handleRefresh = useCallback(async () => {
    setRefreshing(true);
    await loadDashboardData();
    setRefreshing(false);
  }, [loadDashboardData]);

  const gap = 16;

  return (
    <View style={[styles.root, { backgroundColor: colors.background }]}>
      <StatusBar barStyle={themeName === 'light' ? 'dark-content' : 'light-content'} backgroundColor={colors.background} />
      <ScrollView
        contentContainerStyle={[
          styles.scroll,
          {
            paddingHorizontal: contentPadding,
            paddingTop: insets.top + 12,
            paddingBottom: insets.bottom + 24,
            gap,
          },
        ]}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={handleRefresh}
            tintColor={colors.primary}
            colors={[colors.primary]}
          />
        }
        showsVerticalScrollIndicator={false}
      >
        {/* ── Header ───────────────────────────────────────────────────────── */}
        <DashboardHeader onRefresh={handleRefresh} />

        {/* ── KPIs ─────────────────────────────────────────────────────────── */}
        <SectionTitle>Indicadores Clave</SectionTitle>
        {isLoadingDashboard && !dashboardData ? (
          <Text style={{ textAlign: 'center', color: colors.textSecondary, marginTop: 16 }}>Cargando datos...</Text>
        ) : (
          <KpiCardGrid kpis={dashboardData?.kpis ?? []} />
        )}

        {/* ── Charts row (responsive: 1 col on phone, 2 cols on tablet) ────── */}
        <SectionTitle>Análisis de Ventas</SectionTitle>

        {chartColumns === 2 ? (
          // Tablet: line + donut side by side
          <View style={[styles.chartRow, { gap }]}>
            <View style={styles.chartFlex}>
              <SalesLineChart data={dashboardData?.salesEvolution ?? []} />
            </View>
            <View style={styles.chartFlex}>
              <CategoryDonutChart data={dashboardData?.categoryDistribution ?? []} />
            </View>
          </View>
        ) : (
          // Phone: each chart full width
          <View style={{ gap }}>
            <SalesLineChart data={dashboardData?.salesEvolution ?? []} />
            <CategoryDonutChart data={dashboardData?.categoryDistribution ?? []} />
          </View>
        )}

        {/* ── Bar chart (always full row) ───────────────────────────────────── */}
        <SectionTitle>Productos Destacados</SectionTitle>
        <TopProductsBarChart data={dashboardData?.topProducts ?? []} />

        {/* ── Recent Transactions ────────────────────────────────────────────── */}
        <SectionTitle>Últimos Movimientos</SectionTitle>
        <RecentTransactionsList transactions={dashboardData?.recentTransactions ?? []} />
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
  },
  scroll: {
    flexGrow: 1,
  },

  // Section title
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  sectionAccent: {
    width: 3,
    height: 16,
    borderRadius: 2,
  },
  sectionTitle: {
    fontSize: 14,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 0.8,
  },

  // Tablet charts side by side
  chartRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
  },
  chartFlex: {
    flex: 1,
  },
});
