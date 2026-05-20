import React, { useEffect, useCallback, useRef } from 'react';
import { useRouter } from 'expo-router';
import {
  View,
  StyleSheet,
  FlatList,
  RefreshControl,
  TouchableOpacity,
  ActivityIndicator,
  Platform,
  Animated,
  Modal,
  ScrollView,
  Alert,
} from 'react-native';
import Text from '@/components/ui/Text';
import Logo from '@/components/ui/Logo';
import { formatOdooDate } from '@/utils/dateUtils';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '@/theme/ThemeContext';
import { usePurchasesStore } from '@/store/purchases.store';
import type { OdooPurchaseOrder, PurchaseOrderState } from '@/types/purchase.types';

// ─── Helpers ─────────────────────────────────────────────────────────────────

function formatCurrency(value: number): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 2,
  }).format(value);
}


// ─── State badge config ───────────────────────────────────────────────────────

interface BadgeConfig {
  label: string;
  color: string;
  bg: string;
}

function getStateBadge(state: PurchaseOrderState): BadgeConfig {
  switch (state) {
    case 'draft':
      return { label: 'RFQ', color: '#6B7280', bg: 'rgba(107,114,128,0.12)' };
    case 'sent':
      return { label: 'Awaiting', color: '#F59E0B', bg: 'rgba(245,158,11,0.12)' };
    case 'purchase':
      return { label: 'Confirmed', color: '#10B981', bg: 'rgba(16,185,129,0.12)' };
    case 'done':
      return { label: 'Received', color: '#3B82F6', bg: 'rgba(59,130,246,0.12)' };
    case 'cancel':
      return { label: 'Cancelled', color: '#EF4444', bg: 'rgba(239,68,68,0.12)' };
    default:
      return { label: state, color: '#6B7280', bg: 'rgba(107,114,128,0.12)' };
  }
}

// ─── Sub-components ───────────────────────────────────────────────────────────

interface KpiCardProps {
  icon: React.ComponentProps<typeof Ionicons>['name'];
  label: string;
  value: string;
  accentColor: string;
  subLabel?: string;
}

function KpiCard({ icon, label, value, accentColor, subLabel }: KpiCardProps) {
  const { colors } = useTheme();
  return (
    <View
      style={[
        styles.kpiCard,
        { backgroundColor: colors.card, borderColor: colors.cardBorder },
      ]}
    >
      <View style={[styles.kpiIconWrap, { backgroundColor: accentColor + '18' }]}>
        <Ionicons name={icon} size={22} color={accentColor} />
      </View>
      <Text style={[styles.kpiLabel, { color: colors.textSecondary }]}>{label}</Text>
      <Text style={[styles.kpiValue, { color: colors.textPrimary }]}>{value}</Text>
      {subLabel ? (
        <Text style={[styles.kpiSub, { color: colors.textSecondary }]}>{subLabel}</Text>
      ) : null}
    </View>
  );
}

interface PurchaseCardProps {
  item: OdooPurchaseOrder;
  onPress: () => void;
}

function PurchaseCard({ item, onPress }: PurchaseCardProps) {
  const { colors } = useTheme();
  const badge = getStateBadge(item.state);
  const supplierName = item.partner_id ? item.partner_id[1] : 'Unknown Supplier';

  return (
    <TouchableOpacity
      style={[styles.card, { backgroundColor: colors.card, borderColor: colors.cardBorder }]}
      onPress={onPress}
      activeOpacity={0.72}
    >
      {/* Top Row */}
      <View style={styles.cardTop}>
        <View style={{ flex: 1, marginRight: 10 }}>
          <Text style={[styles.supplierName, { color: colors.textPrimary }]} numberOfLines={1}>
            {supplierName}
          </Text>
          <Text style={[styles.poRef, { color: colors.textSecondary }]}>{item.name}</Text>
        </View>
        <View style={[styles.badge, { backgroundColor: badge.bg }]}>
          <Text style={[styles.badgeText, { color: badge.color }]}>{badge.label}</Text>
        </View>
      </View>

      {/* Middle Row */}
      <View style={styles.cardMid}>
        <Ionicons name="calendar-outline" size={13} color={colors.textSecondary} />
        <Text style={[styles.cardMidText, { color: colors.textSecondary }]}>
          {formatOdooDate(item.date_order)}
        </Text>
        <Text style={[styles.cardMidDot, { color: colors.cardBorder }]}>·</Text>
        <Text style={[styles.cardMidText, { color: colors.textSecondary }]}>
          {item.order_line.length} {item.order_line.length === 1 ? 'item' : 'items'}
        </Text>
      </View>

      {/* Bottom Row */}
      <View style={[styles.cardBottom, { borderTopColor: colors.cardBorder }]}>
        <Text style={[styles.cardTotalLabel, { color: colors.textSecondary }]}>Total</Text>
        <Text style={[styles.cardTotal, { color: colors.textPrimary }]}>
          {formatCurrency(item.amount_total)}
        </Text>
      </View>
    </TouchableOpacity>
  );
}

// ─── Detail Modal ─────────────────────────────────────────────────────────────

interface DetailModalProps {
  visible: boolean;
  onClose: () => void;
}

function PurchaseDetailModal({ visible, onClose }: DetailModalProps) {
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  const slideAnim = useRef(new Animated.Value(400)).current;

  const {
    selectedOrder,
    selectedOrderLines,
    isLoadingLines,
    isConfirming,
    confirmPurchaseOrder,
  } = usePurchasesStore();

  useEffect(() => {
    if (visible) {
      Animated.spring(slideAnim, {
        toValue: 0,
        useNativeDriver: true,
        tension: 65,
        friction: 12,
      }).start();
    } else {
      slideAnim.setValue(400);
    }
  }, [visible]);

  if (!selectedOrder) return null;

  const badge = getStateBadge(selectedOrder.state);
  const supplierName = selectedOrder.partner_id
    ? selectedOrder.partner_id[1]
    : 'Unknown Supplier';
  const canConfirm =
    selectedOrder.state === 'draft' || selectedOrder.state === 'sent';

  const handleConfirm = () => {
    Alert.alert(
      'Confirm Purchase Order',
      `Are you sure you want to confirm ${selectedOrder.name}? This action cannot be undone.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Confirm Order',
          style: 'default',
          onPress: async () => {
            const ok = await confirmPurchaseOrder(selectedOrder.id);
            if (!ok) {
              Alert.alert('Error', 'Could not confirm the order. Please try again.');
            }
          },
        },
      ],
    );
  };

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onClose}
      statusBarTranslucent
    >
      <View style={styles.modalOverlay}>
        <TouchableOpacity style={StyleSheet.absoluteFillObject} onPress={onClose} />
        <Animated.View
          style={[
            styles.modalSheet,
            {
              backgroundColor: colors.card,
              paddingBottom: insets.bottom + 16,
              transform: [{ translateY: slideAnim }],
            },
          ]}
        >
          {/* Handle */}
          <View style={[styles.sheetHandle, { backgroundColor: colors.cardBorder }]} />

          {/* Header */}
          <View style={styles.sheetHeader}>
            <View style={{ flex: 1 }}>
              <Text style={[styles.sheetTitle, { color: colors.textPrimary }]} numberOfLines={1}>
                {supplierName}
              </Text>
              <Text style={[styles.sheetSubtitle, { color: colors.textSecondary }]}>
                {selectedOrder.name} · {formatOdooDate(selectedOrder.date_order)}
              </Text>
            </View>
            <View style={[styles.badge, { backgroundColor: badge.bg }]}>
              <Text style={[styles.badgeText, { color: badge.color }]}>{badge.label}</Text>
            </View>
          </View>

          {/* Totals strip */}
          <View style={[styles.totalStrip, { backgroundColor: colors.background }]}>
            <Text style={[styles.totalStripLabel, { color: colors.textSecondary }]}>
              Order Total
            </Text>
            <Text style={[styles.totalStripValue, { color: colors.textPrimary }]}>
              {formatCurrency(selectedOrder.amount_total)}
            </Text>
          </View>

          {/* Order lines */}
          <Text style={[styles.sectionLabel, { color: colors.textSecondary }]}>PRODUCTS</Text>

          {isLoadingLines ? (
            <View style={styles.linesLoader}>
              <ActivityIndicator size="small" color={colors.primary} />
            </View>
          ) : (
            <ScrollView
              style={{ maxHeight: 280 }}
              showsVerticalScrollIndicator={false}
              nestedScrollEnabled
            >
              {selectedOrderLines.length === 0 ? (
                <Text style={[styles.emptyLines, { color: colors.textSecondary }]}>
                  No order lines found.
                </Text>
              ) : (
                selectedOrderLines.map((line, idx) => {
                  const productName = line.product_id ? line.product_id[1] : line.name;
                  const uomLabel = line.product_uom ? line.product_uom[1] : '';
                  return (
                    <View
                      key={line.id}
                      style={[
                        styles.lineRow,
                        idx > 0 && { borderTopWidth: 1, borderTopColor: colors.cardBorder },
                      ]}
                    >
                      <View style={{ flex: 1, marginRight: 12 }}>
                        <Text
                          style={[styles.lineName, { color: colors.textPrimary }]}
                          numberOfLines={2}
                        >
                          {productName}
                        </Text>
                        <Text style={[styles.lineQty, { color: colors.textSecondary }]}>
                          {line.product_qty} {uomLabel} × {formatCurrency(line.price_unit)}
                        </Text>
                      </View>
                      <Text style={[styles.lineSubtotal, { color: colors.textPrimary }]}>
                        {formatCurrency(line.price_subtotal)}
                      </Text>
                    </View>
                  );
                })
              )}
            </ScrollView>
          )}

          {/* Confirm button */}
          {canConfirm && (
            <TouchableOpacity
              style={[
                styles.confirmBtn,
                { backgroundColor: colors.primary },
                isConfirming && { opacity: 0.7 },
              ]}
              onPress={handleConfirm}
              disabled={isConfirming}
              activeOpacity={0.8}
            >
              {isConfirming ? (
                <ActivityIndicator size="small" color="#fff" />
              ) : (
                <>
                  <Ionicons name="checkmark-circle-outline" size={20} color="#fff" />
                  <Text style={styles.confirmBtnText}>Confirm Order</Text>
                </>
              )}
            </TouchableOpacity>
          )}
        </Animated.View>
      </View>
    </Modal>
  );
}

// ─── Main Screen ──────────────────────────────────────────────────────────────

export default function PurchasesScreen() {
  const insets = useSafeAreaInsets();
  const { colors } = useTheme();
  const router = useRouter();

  const {
    kpis,
    orders,
    isLoading,
    error,
    selectedOrder,
    fetchData,
    selectOrder,
    clearSelection,
  } = usePurchasesStore();

  useEffect(() => {
    fetchData();
  }, []);

  const handleRefresh = useCallback(() => {
    fetchData();
  }, [fetchData]);

  const handleCardPress = useCallback(
    (order: OdooPurchaseOrder) => {
      selectOrder(order);
    },
    [selectOrder],
  );

  const renderItem = useCallback(
    ({ item }: { item: OdooPurchaseOrder }) => (
      <PurchaseCard item={item} onPress={() => handleCardPress(item)} />
    ),
    [handleCardPress],
  );

  return (
    <View style={[styles.root, { backgroundColor: colors.background }]}>
      {/* ── Header ── */}
      <View
        style={[
          styles.header,
          { paddingTop: insets.top + 12, backgroundColor: colors.background },
        ]}
      >
        <View style={styles.titleRow}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
            <Logo width={36} height={36} />
            <View>
              <Text style={[styles.title, { color: colors.textPrimary }]}>
                Purchases
              </Text>
              <Text style={[styles.titleSub, { color: colors.textSecondary }]}>
                Supply & Procurement
              </Text>
            </View>
          </View>

          <TouchableOpacity
            style={[styles.refreshBtn, { backgroundColor: colors.card, borderColor: colors.cardBorder }]}
            onPress={handleRefresh}
            disabled={isLoading}
          >
            <Ionicons
              name="refresh-outline"
              size={18}
              color={isLoading ? colors.textSecondary : colors.primary}
            />
          </TouchableOpacity>
        </View>

        {/* ── KPI Cards ── */}
        <View style={styles.kpiRow}>
          <KpiCard
            icon="time-outline"
            label="Pending Approval"
            value={String(kpis.pendingApprovals)}
            accentColor="#F59E0B"
            subLabel="RFQs awaiting action"
          />
          <KpiCard
            icon="wallet-outline"
            label="Committed (Month)"
            value={formatCurrency(kpis.committedSpendThisMonth)}
            accentColor="#3B82F6"
            subLabel="Confirmed orders"
          />
        </View>
      </View>

      {/* ── Error banner ── */}
      {error ? (
        <View
          style={[styles.errorBanner, { backgroundColor: 'rgba(239,68,68,0.08)', borderColor: '#EF4444' }]}
        >
          <Ionicons name="alert-circle-outline" size={16} color="#EF4444" />
          <Text style={[styles.errorText, { color: '#EF4444' }]}>{error}</Text>
        </View>
      ) : null}

      {/* ── Section header ── */}
      <View style={[styles.sectionHeaderRow, { borderBottomColor: colors.cardBorder }]}>
        <Text style={[styles.sectionTitle, { color: colors.textSecondary }]}>
          RECENT PURCHASE ORDERS
        </Text>
        <Text style={[styles.sectionCount, { color: colors.textSecondary }]}>
          {orders.length} orders
        </Text>
      </View>

      {/* ── List ── */}
      <FlatList
        data={orders}
        keyExtractor={(item) => item.id.toString()}
        renderItem={renderItem}
        contentContainerStyle={[
          styles.listContent,
          { paddingBottom: insets.bottom + 120 },
        ]}
        refreshControl={
          <RefreshControl
            refreshing={isLoading && orders.length === 0}
            onRefresh={handleRefresh}
            tintColor={colors.primary}
          />
        }
        showsVerticalScrollIndicator={false}
        ListEmptyComponent={
          !isLoading ? (
            <View style={styles.emptyContainer}>
              <Ionicons name="cart-outline" size={60} color={colors.cardBorder} />
              <Text style={[styles.emptyText, { color: colors.textSecondary }]}>
                No purchase orders found
              </Text>
            </View>
          ) : (
            <View style={styles.emptyContainer}>
              <ActivityIndicator size="large" color={colors.primary} />
            </View>
          )
        }
      />

      {/* ── Detail bottom sheet ── */}
      <PurchaseDetailModal
        visible={selectedOrder !== null}
        onClose={clearSelection}
      />

      {/* ── FAB: New Purchase Order ── */}
      <TouchableOpacity
        style={[
          styles.fab,
          { backgroundColor: colors.primary, bottom: insets.bottom + 16 },
        ]}
        onPress={() => router.push('/create-purchase-order' as any)}
        activeOpacity={0.85}
      >
        <Ionicons name="add" size={28} color="#fff" />
      </TouchableOpacity>
    </View>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  root: { flex: 1 },

  // Header
  header: { paddingHorizontal: 16, paddingBottom: 8 },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  title: { fontSize: 22, fontWeight: '700' },
  titleSub: { fontSize: 12, fontWeight: '500', marginTop: 1 },
  refreshBtn: {
    width: 40,
    height: 40,
    borderRadius: 12,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },

  // KPI
  kpiRow: { flexDirection: 'row', gap: 12, marginBottom: 8 },
  kpiCard: {
    flex: 1,
    borderRadius: 16,
    borderWidth: 1,
    padding: 14,
    gap: 4,
    ...Platform.select({
      ios: { shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.05, shadowRadius: 8 },
      android: { elevation: 2 },
    }),
  },
  kpiIconWrap: {
    width: 40,
    height: 40,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 4,
  },
  kpiLabel: { fontSize: 11, fontWeight: '600', letterSpacing: 0.3 },
  kpiValue: { fontSize: 20, fontWeight: '800' },
  kpiSub: { fontSize: 11, marginTop: 2 },

  // Section header
  sectionHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderBottomWidth: 1,
  },
  sectionTitle: { fontSize: 11, fontWeight: '700', letterSpacing: 0.6 },
  sectionCount: { fontSize: 12 },

  // List
  listContent: { paddingHorizontal: 16, paddingTop: 12, gap: 10 },

  // Purchase Card
  card: {
    borderRadius: 16,
    borderWidth: 1,
    padding: 14,
    ...Platform.select({
      ios: { shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.04, shadowRadius: 6 },
      android: { elevation: 1 },
    }),
  },
  cardTop: { flexDirection: 'row', alignItems: 'flex-start', marginBottom: 8 },
  supplierName: { fontSize: 15, fontWeight: '700' },
  poRef: { fontSize: 12, marginTop: 2 },
  badge: { paddingHorizontal: 9, paddingVertical: 4, borderRadius: 8 },
  badgeText: { fontSize: 11, fontWeight: '700' },
  cardMid: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    marginBottom: 10,
  },
  cardMidText: { fontSize: 13 },
  cardMidDot: { fontSize: 16, lineHeight: 16 },
  cardBottom: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingTop: 10,
    borderTopWidth: 1,
  },
  cardTotalLabel: { fontSize: 12, fontWeight: '500' },
  cardTotal: { fontSize: 20, fontWeight: '800' },

  // Error
  errorBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginHorizontal: 16,
    marginBottom: 8,
    padding: 10,
    borderRadius: 10,
    borderWidth: 1,
  },
  errorText: { fontSize: 13, flex: 1 },

  // Empty
  emptyContainer: { paddingTop: 80, alignItems: 'center', gap: 16 },
  emptyText: { fontSize: 15, textAlign: 'center' },

  // Modal / Bottom Sheet
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.45)',
    justifyContent: 'flex-end',
  },
  modalSheet: {
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: 20,
    paddingTop: 12,
    ...Platform.select({
      ios: { shadowColor: '#000', shadowOffset: { width: 0, height: -4 }, shadowOpacity: 0.12, shadowRadius: 20 },
      android: { elevation: 16 },
    }),
  },
  sheetHandle: {
    width: 40,
    height: 4,
    borderRadius: 2,
    alignSelf: 'center',
    marginBottom: 16,
  },
  sheetHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 14,
    gap: 10,
  },
  sheetTitle: { fontSize: 18, fontWeight: '700' },
  sheetSubtitle: { fontSize: 13, marginTop: 3 },
  totalStrip: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderRadius: 12,
    padding: 14,
    marginBottom: 18,
  },
  totalStripLabel: { fontSize: 13, fontWeight: '600' },
  totalStripValue: { fontSize: 22, fontWeight: '800' },
  sectionLabel: {
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 0.6,
    marginBottom: 10,
  },
  linesLoader: { paddingVertical: 30, alignItems: 'center' },
  emptyLines: { fontSize: 14, textAlign: 'center', paddingVertical: 20 },
  lineRow: { paddingVertical: 10, flexDirection: 'row', alignItems: 'center' },
  lineName: { fontSize: 14, fontWeight: '600' },
  lineQty: { fontSize: 12, marginTop: 2 },
  lineSubtotal: { fontSize: 14, fontWeight: '700' },

  // FAB
  fab: {
    position: 'absolute',
    right: 20,
    width: 58,
    height: 58,
    borderRadius: 29,
    alignItems: 'center',
    justifyContent: 'center',
    ...Platform.select({
      ios: { shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.28, shadowRadius: 10 },
      android: { elevation: 8 },
    }),
  },

  // Confirm button
  confirmBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    borderRadius: 14,
    paddingVertical: 15,
    marginTop: 18,
  },
  confirmBtnText: {
    fontSize: 16,
    fontWeight: '700',
    color: '#fff',
  },
});
