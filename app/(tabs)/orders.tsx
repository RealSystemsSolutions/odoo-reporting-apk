import React, { useEffect, useCallback, useState, useRef } from 'react';
import {
  View, StyleSheet, FlatList, RefreshControl, TouchableOpacity,
  TextInput, ActivityIndicator, Platform, Animated, Modal,
  ScrollView,
} from 'react-native';
import Text from '@/components/ui/Text';
import Logo from '@/components/ui/Logo';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useTheme } from '@/theme/ThemeContext';
import { useOrdersStore } from '@/store/orders.store';
import { useAppStore } from '@/store/app.store';
import { OdooOrder } from '@/types/odoo.types';
import DatePickerModal from '@/components/DatePickerModal';

const STATE_OPTIONS = [
  { label: 'All', value: 'all' },
  { label: 'Draft', value: 'draft' },
  { label: 'Sent', value: 'sent' },
  { label: 'Sales Order', value: 'sale' },
  { label: 'Done', value: 'done' },
  { label: 'Cancelled', value: 'cancel' },
];

export default function OrdersScreen() {
  const insets = useSafeAreaInsets();
  const { colors } = useTheme();
  const router = useRouter();
  const { user } = useAppStore();
  const [filtersVisible, setFiltersVisible] = useState(false);
  const [showDatePickerFrom, setShowDatePickerFrom] = useState(false);
  const [showDatePickerTo, setShowDatePickerTo] = useState(false);
  const filterAnim = useRef(new Animated.Value(0)).current;

  const {
    orders,
    isLoading,
    error,
    searchQuery,
    dateFrom,
    dateTo,
    stateFilter,
    setSearchQuery,
    setDateFrom,
    setDateTo,
    setStateFilter,
    clearFilters,
    fetchOrders,
    hasMore,
  } = useOrdersStore();

  useEffect(() => {
    fetchOrders(true);
  }, []);

  // Refetch whenever filters change
  useEffect(() => {
    fetchOrders(true);
  }, [dateFrom, dateTo, stateFilter]);

  // Debounced search
  useEffect(() => {
    const timer = setTimeout(() => {
      fetchOrders(true);
    }, 500);
    return () => clearTimeout(timer);
  }, [searchQuery]);

  const toggleFilters = () => {
    const toValue = filtersVisible ? 0 : 1;
    setFiltersVisible(!filtersVisible);
    Animated.spring(filterAnim, { toValue, useNativeDriver: false, tension: 60, friction: 10 }).start();
  };

  const hasActiveFilters = dateFrom || dateTo || stateFilter !== 'all';

  const handleRefresh = useCallback(() => {
    fetchOrders(true);
  }, [fetchOrders]);

  const handleLoadMore = () => {
    if (!isLoading && hasMore) {
      fetchOrders();
    }
  };

  const handleAddOrder = () => {
    router.push({ pathname: '/order-details' as any, params: { id: 'new' } });
  };

  const handleEditOrder = (order: OdooOrder) => {
    router.push({
      pathname: '/order-details' as any,
      params: { id: order.id.toString(), orderData: JSON.stringify(order) },
    });
  };

  const getStateColor = (state: string) => {
    switch (state) {
      case 'draft': return colors.warning || '#F59E0B';
      case 'sent': return '#8B5CF6';
      case 'sale':
      case 'done': return colors.success || '#10B981';
      case 'cancel': return colors.danger || '#EF4444';
      default: return colors.textSecondary;
    }
  };

  const getStateLabel = (state: string) => {
    switch (state) {
      case 'draft': return 'Draft';
      case 'sent': return 'Sent';
      case 'sale': return 'Sales Order';
      case 'done': return 'Done';
      case 'cancel': return 'Cancelled';
      default: return state;
    }
  };

  const filterPanelHeight = filterAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [0, 280],
  });

  const transformedOrders = React.useMemo(() => {
    // 1. Sort ascending for calculation
    const sorted = [...orders].sort((a, b) => {
      const dateA = a.pos_payment_date || a.date_order || '';
      const dateB = b.pos_payment_date || b.date_order || '';
      return dateA.localeCompare(dateB);
    });

    // 2. Accumulate per day
    let currentDay = '';
    let dailySum = 0;
    const withAccumulated = sorted.map((order) => {
      const orderDate = (order.pos_payment_date || order.date_order || '').substring(0, 10);
      if (orderDate !== currentDay) {
        currentDay = orderDate;
        dailySum = 0;
      }
      dailySum += order.amount_total;
      return { ...order, dailyAccumulated: dailySum, dayGroup: currentDay };
    });

    // 3. Return descending for display (most recent first)
    return withAccumulated.reverse();
  }, [orders]);

  const renderItem = ({ item, index }: { item: OdooOrder & { dailyAccumulated: number, dayGroup: string }, index: number }) => {
    const prevItem = index > 0 ? transformedOrders[index - 1] : null;
    const showDivider = !prevItem || prevItem.dayGroup !== item.dayGroup;

    return (
      <View>
        {showDivider && (
          <View style={styles.dayDivider}>
            <Text style={[styles.dayDividerText, { color: colors.textSecondary }]}>
              {item.dayGroup ? new Date(item.dayGroup + 'T00:00:00').toLocaleDateString(undefined, { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' }) : 'Unknown Date'}
            </Text>
          </View>
        )}
        <TouchableOpacity
          style={[styles.card, { backgroundColor: colors.card, borderColor: colors.cardBorder }]}
          onPress={() => handleEditOrder(item)}
          activeOpacity={0.7}
        >
          <View style={styles.cardHeader}>
            <View style={{ flex: 1 }}>
              <Text style={[styles.orderName, { color: colors.textPrimary }]} numberOfLines={1}>
                {item.name}
              </Text>
              {item.pos_receipt_number ? (
                <Text style={[styles.receiptNumber, { color: colors.primary }]}>
                  <Ionicons name="receipt-outline" size={12} color={colors.primary} /> #{item.pos_receipt_number}
                </Text>
              ) : null}
            </View>
            <View style={[styles.stateBadge, { backgroundColor: getStateColor(item.state) + '20' }]}>
              <Text style={[styles.stateText, { color: getStateColor(item.state) }]}>
                {getStateLabel(item.state)}
              </Text>
            </View>
          </View>

          <View style={styles.cardBody}>
            <Text style={[styles.infoText, { color: colors.textSecondary }]} numberOfLines={1}>
              <Ionicons name="person-outline" size={14} color={colors.textSecondary} />{' '}
              {item.partner_id ? item.partner_id[1] : 'Unknown Customer'}
            </Text>
            <Text style={[styles.infoText, { color: colors.textSecondary }]}>
              <Ionicons name="calendar-outline" size={14} color={colors.textSecondary} />{' '}
              {item.date_order ? `${item.date_order.substring(0, 10)} ${item.date_order.substring(11, 16)}` : 'No date'}
            </Text>
          </View>

          <View style={[styles.cardFooter, { borderTopColor: colors.cardBorder }]}>
            <View>
              <Text style={[styles.orderTotal, { color: colors.primary }]}>
                ${item.amount_total.toFixed(2)}
              </Text>
              <Text style={[styles.accumulatedText, { color: colors.textSecondary }]}>
                Running Total: ${item.dailyAccumulated.toFixed(2)}
              </Text>
            </View>
            <Text style={[styles.infoText, { color: colors.textSecondary }]}>
              {item.order_line.length} {item.order_line.length === 1 ? 'line' : 'lines'}
            </Text>
          </View>
        </TouchableOpacity>
      </View>
    );
  };

  return (
    <View style={[styles.root, { backgroundColor: colors.background }]}>
      {/* Header */}
      <View style={[styles.header, { paddingTop: insets.top + 12, paddingHorizontal: 16, backgroundColor: colors.background }]}>
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
          <Logo width={110} height={25} />
          <Text style={{ fontSize: 14, fontWeight: '700', color: colors.textSecondary, textTransform: 'capitalize' }}>
            {user?.tenant?.db || ''}
          </Text>
        </View>
        <View style={styles.titleRow}>
          <Text style={[styles.title, { color: colors.textPrimary }]}>Quotations & Orders</Text>
          <TouchableOpacity
            style={[
              styles.filterToggle,
              { backgroundColor: hasActiveFilters ? colors.primary : colors.card, borderColor: colors.cardBorder }
            ]}
            onPress={toggleFilters}
          >
            <Ionicons
              name="options-outline"
              size={18}
              color={hasActiveFilters ? '#fff' : colors.textPrimary}
            />
            {hasActiveFilters && (
              <View style={styles.filterDot} />
            )}
          </TouchableOpacity>
        </View>

        {/* Search bar */}
        <View style={[styles.searchContainer, { backgroundColor: colors.card, borderColor: colors.cardBorder }]}>
          <Ionicons name="search" size={20} color={colors.textSecondary} style={styles.searchIcon} />
          <TextInput
            style={[styles.searchInput, { color: colors.textPrimary }]}
            placeholder="Search by number, customer, receipt..."
            placeholderTextColor={colors.textSecondary}
            value={searchQuery}
            onChangeText={setSearchQuery}
            returnKeyType="search"
          />
          {searchQuery.length > 0 && (
            <TouchableOpacity onPress={() => setSearchQuery('')}>
              <Ionicons name="close-circle" size={20} color={colors.textSecondary} />
            </TouchableOpacity>
          )}
        </View>
      </View>

      {/* Filter panel */}
      <Animated.View style={[styles.filterPanel, { maxHeight: filterPanelHeight, backgroundColor: colors.card, borderBottomColor: colors.cardBorder }]}>
        <ScrollView scrollEnabled={false} contentContainerStyle={styles.filterContent}>
          {/* Date range */}
          <Text style={[styles.filterLabel, { color: colors.textSecondary }]}>DATE RANGE</Text>
          <View style={styles.filterRow}>
            <TouchableOpacity 
              style={[styles.dateInput, { backgroundColor: colors.background, borderColor: colors.cardBorder }]}
              onPress={() => setShowDatePickerFrom(true)}
            >
              <Ionicons name="calendar-outline" size={16} color={colors.textSecondary} />
              <Text style={[styles.dateText, { color: dateFrom ? colors.textPrimary : colors.textSecondary }]}>
                {dateFrom || 'From'}
              </Text>
            </TouchableOpacity>
            <TouchableOpacity 
              style={[styles.dateInput, { backgroundColor: colors.background, borderColor: colors.cardBorder }]}
              onPress={() => setShowDatePickerTo(true)}
            >
              <Ionicons name="calendar-outline" size={16} color={colors.textSecondary} />
              <Text style={[styles.dateText, { color: dateTo ? colors.textPrimary : colors.textSecondary }]}>
                {dateTo || 'To'}
              </Text>
            </TouchableOpacity>
          </View>

          {/* State filter */}
          <View style={{ marginTop: 16 }}>
            <Text style={[styles.filterLabel, { color: colors.textSecondary }]}>STATUS</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.stateScroll}>
              {STATE_OPTIONS.map((opt) => (
                <TouchableOpacity
                  key={opt.value}
                  style={[
                    styles.stateChip,
                    {
                      backgroundColor: stateFilter === opt.value ? colors.primary : colors.background,
                      borderColor: stateFilter === opt.value ? colors.primary : colors.cardBorder,
                    }
                  ]}
                  onPress={() => setStateFilter(opt.value)}
                >
                  <Text style={[styles.stateChipText, { color: stateFilter === opt.value ? '#fff' : colors.textSecondary }]}>
                    {opt.label}
                  </Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
          </View>

             {/* Clear button */}
          {hasActiveFilters && (
            <TouchableOpacity
              style={[styles.clearBtn, { borderColor: colors.danger || '#EF4444' }]}
              onPress={() => { clearFilters(); fetchOrders(true); }}
            >
              <Ionicons name="close-circle-outline" size={16} color={colors.danger || '#EF4444'} />
              <Text style={[styles.clearBtnText, { color: colors.danger || '#EF4444' }]}>Clear all filters</Text>
            </TouchableOpacity>
          )}
        </ScrollView>
      </Animated.View>

      {error && (
        <View style={[styles.errorContainer, { backgroundColor: colors.cardBorder }]}>
          <Text style={[styles.errorText, { color: colors.danger || '#EF4444' }]}>{error}</Text>
        </View>
      )}

      <FlatList
        data={transformedOrders}
        keyExtractor={(item) => item.id.toString()}
        renderItem={renderItem}
        contentContainerStyle={[styles.listContent, { paddingBottom: insets.bottom + 80 }]}
        refreshControl={
          <RefreshControl
            refreshing={isLoading && orders.length === 0}
            onRefresh={handleRefresh}
            tintColor={colors.primary}
          />
        }
        onEndReached={handleLoadMore}
        onEndReachedThreshold={0.5}
        ListFooterComponent={
          isLoading && orders.length > 0 ? (
            <View style={styles.loaderFooter}>
              <ActivityIndicator size="small" color={colors.primary} />
            </View>
          ) : null
        }
        ListEmptyComponent={
          !isLoading ? (
            <View style={styles.emptyContainer}>
              <Ionicons name="document-text-outline" size={64} color={colors.cardBorder} />
              <Text style={[styles.emptyText, { color: colors.textSecondary }]}>No orders found</Text>
              {hasActiveFilters && (
                <TouchableOpacity onPress={() => { clearFilters(); fetchOrders(true); }}>
                  <Text style={[styles.emptyText, { color: colors.primary, marginTop: 4 }]}>Clear filters</Text>
                </TouchableOpacity>
              )}
            </View>
          ) : null
        }
      />

      <TouchableOpacity
        style={[styles.fab, { backgroundColor: colors.primary, bottom: insets.bottom + 20 }]}
        onPress={handleAddOrder}
        activeOpacity={0.8}
      >
        <Ionicons name="add" size={30} color="#FFFFFF" />
      </TouchableOpacity>

      <DatePickerModal
        visible={showDatePickerFrom}
        onClose={() => setShowDatePickerFrom(false)}
        onSelect={setDateFrom}
        title="Select Start Date"
        selectedDate={dateFrom}
        rangeTo={dateTo}
      />

      <DatePickerModal
        visible={showDatePickerTo}
        onClose={() => setShowDatePickerTo(false)}
        onSelect={setDateTo}
        title="Select End Date"
        selectedDate={dateTo}
        rangeFrom={dateFrom}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  header: { paddingBottom: 12 },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  title: { fontSize: 28, fontWeight: '700' },
  filterToggle: {
    width: 40,
    height: 40,
    borderRadius: 12,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  filterDot: {
    position: 'absolute',
    top: 6,
    right: 6,
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#EF4444',
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 12,
    borderWidth: 1,
    paddingHorizontal: 12,
    height: 48,
    marginHorizontal: 0,
  },
  searchIcon: { marginRight: 8 },
  searchInput: {
    flex: 1,
    fontSize: 16,
    height: '100%',
    fontFamily: 'Montserrat_400Regular',
  },
  filterPanel: {
    overflow: 'hidden',
    borderBottomWidth: 1,
  },
  filterContent: {
    padding: 16,
  },
  filterLabel: {
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 0.5,
    marginBottom: 8,
  },
  filterRow: {
    flexDirection: 'row',
    gap: 8,
  },
  dateInput: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: 10,
    height: 40,
  },
  dateText: {
    flex: 1,
    fontSize: 13,
  },
  stateScroll: { marginHorizontal: -4 },
  stateChip: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    borderWidth: 1,
    marginHorizontal: 4,
  },
  stateChipText: { fontSize: 13, fontWeight: '600' },
  clearBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: 12,
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 8,
    borderWidth: 1,
    alignSelf: 'flex-start',
  },
  clearBtnText: { fontSize: 13, fontWeight: '600' },
  listContent: { paddingHorizontal: 16, gap: 12, paddingTop: 12 },
  card: {
    borderRadius: 16,
    borderWidth: 1,
    padding: 16,
    gap: 10,
    ...Platform.select({
      ios: { shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.05, shadowRadius: 8 },
      android: { elevation: 2 },
    }),
  },
  dayDivider: {
    paddingVertical: 12,
    alignItems: 'center',
    marginBottom: 4,
  },
  dayDividerText: {
    fontSize: 13,
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    gap: 12,
  },
  orderName: { fontSize: 16, fontWeight: '700' },
  receiptNumber: { fontSize: 12, fontWeight: '600', marginTop: 2 },
  stateBadge: { paddingHorizontal: 8, paddingVertical: 4, borderRadius: 8 },
  stateText: { fontSize: 12, fontWeight: '700' },
  cardBody: { gap: 4 },
  infoText: { fontSize: 14 },
  cardFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingTop: 8,
    borderTopWidth: 1,
  },
  orderTotal: { fontSize: 18, fontWeight: '700' },
  accumulatedText: { fontSize: 12, fontStyle: 'italic', marginTop: 2 },
  fab: {
    position: 'absolute',
    right: 20,
    width: 60,
    height: 60,
    borderRadius: 30,
    justifyContent: 'center',
    alignItems: 'center',
    ...Platform.select({
      ios: { shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.3, shadowRadius: 8 },
      android: { elevation: 8 },
    }),
  },
  loaderFooter: { paddingVertical: 20, alignItems: 'center' },
  emptyContainer: { paddingTop: 60, alignItems: 'center', gap: 16 },
  emptyText: { fontSize: 16, textAlign: 'center' },
  errorContainer: { marginHorizontal: 16, marginBottom: 8, padding: 12, borderRadius: 8 },
  errorText: { fontSize: 14, textAlign: 'center' },
});
