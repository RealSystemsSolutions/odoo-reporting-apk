import React, { useState, useCallback, useMemo } from "react";
import {
  View,
  ScrollView,
  StyleSheet,
  RefreshControl,
  StatusBar,
  TouchableOpacity,
  Dimensions,
} from "react-native";
import Text from "@/components/ui/Text";
import Logo from "@/components/ui/Logo";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useTheme } from "@/theme/ThemeContext";
import { useResponsive } from "@/hooks/useResponsive";
import { useReportsStore } from "@/store/reports.store";
import { useAppStore } from "@/store/app.store";
import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import DatePickerModal from "@/components/DatePickerModal";

// Report components
import SalesMarginComposedChart from "@/components/reports/SalesMarginComposedChart";
import SalesMarginDonutChart from "@/components/reports/SalesMarginDonutChart";
import InventoryStatusTable from "@/components/reports/InventoryStatusTable";

import PosShiftAnalysis from "@/components/reports/PosShiftAnalysis";
import MasterReportView from "@/components/reports/MasterReportView";

// ─── Constants ────────────────────────────────────────────────────────────────

type ReportTab = "sales" | "inventory" | "pos" | "master";

interface ReportMeta {
  id: ReportTab;
  title: string;
  description: string;
  icon: string;
  gradient: [string, string];
}

const REPORTS: ReportMeta[] = [
  {
    id: "sales",
    title: "Sales & Margin",
    description: "Revenue, costs, and profit margins analysis.",
    icon: "trending-up",
    gradient: ["#6366F1", "#4F46E5"],
  },
  {
    id: "inventory",
    title: "Inventory Status",
    description: "Stock levels, critical alerts, and rotation.",
    icon: "cube",
    gradient: ["#F59E0B", "#D97706"],
  },

  {
    id: "master",
    title: "Master Financial",
    description: "Global financial overview and summary.",
    icon: "bar-chart",
    gradient: ["#8B5CF6", "#7C3AED"],
  },
];

// ─── Components ───────────────────────────────────────────────────────────────

function SectionTitle({ children }: { children: string }) {
  const { colors } = useTheme();
  return (
    <View style={styles.sectionHeader}>
      <View
        style={[styles.sectionAccent, { backgroundColor: colors.primary }]}
      />
      <Text style={[styles.sectionTitle, { color: colors.textSecondary }]}>
        {children}
      </Text>
    </View>
  );
}

// ─── Main Reports Screen ──────────────────────────────────────────────────────

export default function ReportsScreen() {
  const insets = useSafeAreaInsets();
  const { contentPadding, width } = useResponsive();
  const { colors, themeName } = useTheme();
  const [refreshing, setRefreshing] = useState(false);
  const [selectedReportId, setSelectedReportId] = useState<ReportTab | null>(
    null,
  );

  const [showDatePickerFrom, setShowDatePickerFrom] = useState(false);
  const [showDatePickerTo, setShowDatePickerTo] = useState(false);

  // Zustand stores
  const user = useAppStore((s) => s.user);
  const period = useAppStore((s) => s.period);
  const setPeriod = useAppStore((s) => s.setPeriod);

  const salesMarginReport = useReportsStore((s) => s.salesMarginReport);
  const inventoryReport = useReportsStore((s) => s.inventoryReport);

  const posShiftReport = useReportsStore((s) => s.posShiftReport);
  const masterReport = useReportsStore((s) => s.masterReport);

  const isLoadingSalesMargin = useReportsStore((s) => s.isLoadingSalesMargin);
  const isLoadingInventory = useReportsStore((s) => s.isLoadingInventory);

  const isLoadingPosShift = useReportsStore((s) => s.isLoadingPosShift);
  const isLoadingMaster = useReportsStore((s) => s.isLoadingMaster);

  const startDate = useReportsStore((s) => s.startDate);
  const endDate = useReportsStore((s) => s.endDate);
  const setDateRange = useReportsStore((s) => s.setDateRange);
  const loadAllReports = useReportsStore((s) => s.loadAllReports);

  // Load reports only on initial mount if needed, or wait for manual trigger
  React.useEffect(() => {
    // Initial load for current month defaults
    if (!startDate && !endDate) {
      const now = new Date();
      const start = new Date(now.getFullYear(), now.getMonth(), 1)
        .toISOString()
        .split("T")[0];
      const end = now.toISOString().split("T")[0];
      setDateRange(start, end);
      // We don't auto-load here anymore, user must press "Generate"
    }
  }, []);

  const handleGenerate = useCallback(async () => {
    if (!selectedReportId) return;

    if (selectedReportId === "sales")
      await useReportsStore.getState().loadSalesMarginReport();
    else if (selectedReportId === "inventory")
      await useReportsStore.getState().loadInventoryReport();
    else if (selectedReportId === "pos")
      await useReportsStore.getState().loadPosShiftReport();
    else if (selectedReportId === "master")
      await useReportsStore.getState().loadMasterReport();
  }, [selectedReportId]);

  const calculateDatesForPeriod = (p: "today" | "week" | "month") => {
    const now = new Date();
    let start = "";
    let end = now.toISOString().split("T")[0];

    if (p === "today") {
      start = end;
    } else if (p === "week") {
      const d = new Date(now);
      d.setDate(now.getDate() - now.getDay());
      start = d.toISOString().split("T")[0];
    } else if (p === "month") {
      start = new Date(now.getFullYear(), now.getMonth(), 1)
        .toISOString()
        .split("T")[0];
    }
    return { start, end };
  };

  const handleRefresh = useCallback(async () => {
    setRefreshing(true);
    await loadAllReports();
    setRefreshing(false);
  }, [loadAllReports]);

  const selectedReport = useMemo(
    () => REPORTS.find((r) => r.id === selectedReportId),
    [selectedReportId],
  );

  const isLoadingTab = useMemo(() => {
    if (!selectedReportId) return false;
    return {
      sales: isLoadingSalesMargin,
      inventory: isLoadingInventory,

      pos: isLoadingPosShift,
      master: isLoadingMaster,
    }[selectedReportId];
  }, [
    selectedReportId,
    isLoadingSalesMargin,
    isLoadingInventory,

    isLoadingPosShift,
    isLoadingMaster,
  ]);

  const renderSelectionMenu = () => (
    <View style={styles.menuGrid}>
      {REPORTS.map((report) => (
        <TouchableOpacity
          key={report.id}
          activeOpacity={0.8}
          onPress={() => setSelectedReportId(report.id)}
          style={[
            styles.reportCardWrapper,
            { width: (width - contentPadding * 2 - 16) / 2 },
          ]}
        >
          <LinearGradient
            colors={report.gradient}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={styles.reportCard}
          >
            <View style={styles.cardIconCircle}>
              <Ionicons name={report.icon as any} size={24} color="#FFF" />
            </View>
            <View style={{ flex: 1, justifyContent: "flex-end" }}>
              <Text style={styles.cardTitle}>{report.title}</Text>
              <Text style={styles.cardDesc} numberOfLines={2}>
                {report.description}
              </Text>
            </View>
          </LinearGradient>
        </TouchableOpacity>
      ))}
    </View>
  );

  const renderDateSelector = () => (
    <View style={styles.filterSection}>
      <View style={styles.periodRow}>
        {(["today", "week", "month"] as const).map((p) => (
          <TouchableOpacity
            key={p}
            onPress={() => {
              setPeriod(p);
              const { start, end } = calculateDatesForPeriod(p);
              setDateRange(start, end);
            }}
            style={[
              styles.periodBtn,
              {
                backgroundColor:
                  period === p ? colors.primary : colors.inputBackground,
                borderColor: period === p ? colors.primary : colors.cardBorder,
              },
            ]}
          >
            <Text
              style={{
                fontSize: 11,
                fontWeight: "600",
                color: period === p ? "#FFF" : colors.textSecondary,
              }}
            >
              {p === "today" ? "Today" : p === "week" ? "Week" : "Month"}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      <View style={styles.dateRangeRow}>
        <View style={{ flex: 1, flexDirection: "row", gap: 8 }}>
          <TouchableOpacity
            style={[
              styles.dateInput,
              {
                backgroundColor: colors.inputBackground,
                borderColor: colors.cardBorder,
              },
            ]}
            onPress={() => setShowDatePickerFrom(true)}
          >
            <Ionicons
              name="calendar-outline"
              size={14}
              color={colors.textSecondary}
            />
            <Text
              style={[
                styles.dateInputText,
                {
                  color: startDate ? colors.textPrimary : colors.textSecondary,
                },
              ]}
            >
              {startDate || "From"}
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[
              styles.dateInput,
              {
                backgroundColor: colors.inputBackground,
                borderColor: colors.cardBorder,
              },
            ]}
            onPress={() => setShowDatePickerTo(true)}
          >
            <Ionicons
              name="calendar-outline"
              size={14}
              color={colors.textSecondary}
            />
            <Text
              style={[
                styles.dateInputText,
                { color: endDate ? colors.textPrimary : colors.textSecondary },
              ]}
            >
              {endDate || "To"}
            </Text>
          </TouchableOpacity>
        </View>

        <TouchableOpacity
          onPress={handleGenerate}
          disabled={!startDate || !endDate || isLoadingTab}
          style={[
            styles.generateBtn,
            {
              backgroundColor:
                !startDate || !endDate ? colors.cardBorder : colors.primary,
              opacity: !startDate || !endDate || isLoadingTab ? 0.6 : 1,
            },
          ]}
        >
          <Text style={styles.generateBtnText}>
            {isLoadingTab ? "Loading..." : "Generate"}
          </Text>
        </TouchableOpacity>

        {(startDate || endDate) && (
          <TouchableOpacity
            style={styles.clearDatesBtn}
            onPress={() => setDateRange(null, null)}
          >
            <Ionicons name="close-circle" size={20} color={colors.danger} />
          </TouchableOpacity>
        )}
      </View>
    </View>
  );

  const renderReportContent = () => {
    switch (selectedReportId) {
      case "sales":
        return (
          <>
            <SectionTitle>Revenue vs Sales Cost</SectionTitle>
            {salesMarginReport && (
              <View style={{ gap: 16 }}>
                <SalesMarginComposedChart
                  data={salesMarginReport.monthlyComparison}
                />
                <SalesMarginDonutChart
                  data={salesMarginReport.categoryBreakdown}
                />
              </View>
            )}
          </>
        );
      case "inventory":
        return (
          <>
            <SectionTitle>Alerts & Stock Rotation</SectionTitle>
            {inventoryReport && (
              <InventoryStatusTable
                data={inventoryReport.items}
                criticalCount={inventoryReport.criticalCount}
                warningCount={inventoryReport.warningCount}
                healthyCount={inventoryReport.healthyCount}
              />
            )}
          </>
        );

      case "pos":
        return (
          <>
            <SectionTitle>POS Performance</SectionTitle>
            {posShiftReport && <PosShiftAnalysis data={posShiftReport} />}
          </>
        );
      case "master":
        return (
          <>
            <SectionTitle>Financial Summary</SectionTitle>
            {masterReport ? (
              <MasterReportView data={masterReport} />
            ) : (
              <View style={styles.emptyState}>
                <Ionicons
                  name="document-text-outline"
                  size={48}
                  color={colors.cardBorder}
                />
                <Text
                  style={{
                    color: colors.textSecondary,
                    textAlign: "center",
                    marginTop: 12,
                  }}
                >
                  No data found for the selected period.
                </Text>
              </View>
            )}
          </>
        );
      default:
        return null;
    }
  };

  return (
    <View style={[styles.root, { backgroundColor: colors.background }]}>
      <StatusBar
        barStyle={themeName === "light" ? "dark-content" : "light-content"}
        backgroundColor={colors.background}
      />

      <ScrollView
        contentContainerStyle={[
          styles.scroll,
          {
            paddingHorizontal: contentPadding,
            paddingTop: insets.top + 12,
            paddingBottom: insets.bottom + 24,
            gap: 20,
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
        <View style={styles.headerRow}>
          {selectedReportId && (
            <TouchableOpacity
              onPress={() => setSelectedReportId(null)}
              style={[
                styles.backBtn,
                { backgroundColor: colors.inputBackground },
              ]}
            >
              <Ionicons
                name="chevron-back"
                size={24}
                color={colors.textPrimary}
              />
            </TouchableOpacity>
          )}
          <View style={{ flex: 1 }}>
            <Text style={[styles.pageTitle, { color: colors.textPrimary }]}>
              {selectedReport ? selectedReport.title : "Executive Reports"}
            </Text>
            <Text
              style={[styles.pageSubtitle, { color: colors.textSecondary }]}
            >
              {selectedReport
                ? selectedReport.description
                : "Real-time analysis connected to Odoo"}
            </Text>
          </View>
        </View>

        {!selectedReportId ? (
          renderSelectionMenu()
        ) : (
          <View style={{ gap: 20 }}>
            <View
              style={{
                flexDirection: "row",
                justifyContent: "space-between",
                alignItems: "center",
                marginBottom: 12,
              }}
            >
              <Logo width={110} height={25} />
              <Text
                style={{
                  fontSize: 14,
                  fontWeight: "700",
                  color: colors.textSecondary,
                  textTransform: "capitalize",
                }}
              >
                {user?.tenant?.db || ""}
              </Text>
            </View>
            {selectedReportId !== "inventory" ? (
              renderDateSelector()
            ) : (
              <TouchableOpacity
                onPress={handleGenerate}
                style={[
                  styles.generateBtn,
                  {
                    backgroundColor:
                      !startDate || !endDate
                        ? colors.cardBorder
                        : colors.primary,
                    opacity: !startDate || !endDate || isLoadingTab ? 0.6 : 1,
                  },
                ]}
              >
                <Text style={styles.generateBtnText}>
                  {isLoadingTab ? "Loading..." : "Generate"}
                </Text>
              </TouchableOpacity>
            )}

            {isLoadingTab ? (
              <View style={{ paddingVertical: 40, alignItems: "center" }}>
                <Text style={{ color: colors.textSecondary }}>
                  Loading report data...
                </Text>
              </View>
            ) : (
              renderReportContent()
            )}
          </View>
        )}
      </ScrollView>

      {selectedReportId !== "inventory" && (
        <>
          <DatePickerModal
            visible={showDatePickerFrom}
            onClose={() => setShowDatePickerFrom(false)}
            onSelect={(date) => setDateRange(date, endDate)}
            title="Select Start Date"
            selectedDate={startDate || undefined}
            rangeTo={endDate || undefined}
          />

          <DatePickerModal
            visible={showDatePickerTo}
            onClose={() => setShowDatePickerTo(false)}
            onSelect={(date) => setDateRange(startDate, date)}
            title="Select End Date"
            selectedDate={endDate || undefined}
            rangeFrom={startDate || undefined}
          />
        </>
      )}
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
  headerRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  backBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: "center",
    justifyContent: "center",
  },
  pageTitle: {
    fontSize: 24,
    fontWeight: "700",
  },
  pageSubtitle: {
    fontSize: 13,
    marginTop: 4,
  },
  menuGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 16,
  },
  reportCardWrapper: {
    height: 180,
  },
  reportCard: {
    flex: 1,
    borderRadius: 24,
    padding: 16,
    elevation: 4,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
  },
  cardIconCircle: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: "rgba(255,255,255,0.2)",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 12,
  },
  cardTitle: {
    color: "#FFF",
    fontSize: 16,
    fontWeight: "700",
    marginBottom: 4,
  },
  cardDesc: {
    color: "rgba(255,255,255,0.8)",
    fontSize: 11,
    lineHeight: 14,
  },
  filterSection: {
    gap: 10,
  },
  periodRow: {
    flexDirection: "row",
    gap: 8,
  },
  periodBtn: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
    borderWidth: 1,
  },
  dateRangeRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  dateInput: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: 10,
    borderWidth: 1,
  },
  dateInputText: {
    fontSize: 12,
    fontWeight: "500",
  },
  clearDatesBtn: {
    padding: 4,
  },
  emptyState: {
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 60,
    borderRadius: 16,
    borderWidth: 1,
    borderStyle: "dashed",
    borderColor: "rgba(0,0,0,0.1)",
  },
  sectionHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginBottom: 12,
  },
  sectionAccent: {
    width: 4,
    height: 18,
    borderRadius: 2,
  },
  sectionTitle: {
    fontSize: 14,
    fontWeight: "700",
    textTransform: "uppercase",
    letterSpacing: 1,
  },
  generateBtn: {
    paddingHorizontal: 5,
    paddingVertical: 10,
    borderRadius: 10,
    justifyContent: "center",
    alignItems: "center",
    minWidth: 80,
  },
  generateBtnText: {
    color: "#FFF",
    fontSize: 12,
    fontWeight: "700",
  },
});
