import React, { useEffect, useCallback } from 'react';
import { View, StyleSheet, FlatList, RefreshControl, TouchableOpacity, TextInput, ActivityIndicator, Platform } from 'react-native';
import Text from '@/components/ui/Text';
import Logo from '@/components/ui/Logo';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useTheme } from '@/theme/ThemeContext';
import { useOrdersStore } from '@/store/orders.store';
import { OdooOrder } from '@/types/odoo.types';

export default function OrdersScreen() {
  const insets = useSafeAreaInsets();
  const { colors } = useTheme();
  const router = useRouter();

  const {
    orders,
    isLoading,
    error,
    searchQuery,
    setSearchQuery,
    fetchOrders,
    hasMore,
  } = useOrdersStore();

  useEffect(() => {
    fetchOrders(true);
  }, []);

  const handleRefresh = useCallback(() => {
    fetchOrders(true);
  }, [fetchOrders]);

  const handleLoadMore = () => {
    if (!isLoading && hasMore) {
      fetchOrders();
    }
  };

  const handleAddOrder = () => {
    router.push({
      pathname: '/order-details' as any,
      params: { id: 'new' },
    });
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
      case 'draft': return 'Borrador';
      case 'sent': return 'Enviado';
      case 'sale': return 'Orden de Venta';
      case 'done': return 'Realizado';
      case 'cancel': return 'Cancelado';
      default: return state;
    }
  };

  const renderItem = ({ item }: { item: OdooOrder }) => (
    <TouchableOpacity
      style={[styles.card, { backgroundColor: colors.card, borderColor: colors.cardBorder }]}
      onPress={() => handleEditOrder(item)}
      activeOpacity={0.7}
    >
      <View style={styles.cardHeader}>
        <Text style={[styles.orderName, { color: colors.textPrimary }]} numberOfLines={1}>
          {item.name}
        </Text>
        <View style={[styles.stateBadge, { backgroundColor: getStateColor(item.state) + '20' }]}>
          <Text style={[styles.stateText, { color: getStateColor(item.state) }]}>
            {getStateLabel(item.state)}
          </Text>
        </View>
      </View>
      
      <View style={styles.cardBody}>
        <Text style={[styles.infoText, { color: colors.textSecondary }]} numberOfLines={1}>
          <Ionicons name="person-outline" size={14} color={colors.textSecondary} /> {item.partner_id ? item.partner_id[1] : 'Cliente Desconocido'}
        </Text>
        <Text style={[styles.infoText, { color: colors.textSecondary }]}>
          <Ionicons name="calendar-outline" size={14} color={colors.textSecondary} /> {item.date_order || 'Sin fecha'}
        </Text>
      </View>
      
      <View style={styles.cardFooter}>
        <Text style={[styles.orderTotal, { color: colors.primary }]}>
          ${item.amount_total.toFixed(2)}
        </Text>
        <Text style={[styles.infoText, { color: colors.textSecondary }]}>
          {item.order_line.length} {item.order_line.length === 1 ? 'línea' : 'líneas'}
        </Text>
      </View>
    </TouchableOpacity>
  );

  return (
    <View style={[styles.root, { backgroundColor: colors.background }]}>
      <View style={[styles.header, { paddingTop: insets.top + 12, paddingHorizontal: 16 }]}>
        <View style={{ marginBottom: 12 }}>
          <Logo width={130} height={30} />
        </View>
        <Text style={[styles.title, { color: colors.textPrimary }]}>Cotizaciones y Órdenes</Text>
        <View style={[styles.searchContainer, { backgroundColor: colors.card, borderColor: colors.cardBorder }]}>
          <Ionicons name="search" size={20} color={colors.textSecondary} style={styles.searchIcon} />
          <TextInput
            style={[styles.searchInput, { color: colors.textPrimary }]}
            placeholder="Buscar por número o cliente..."
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

      {error && (
        <View style={[styles.errorContainer, { backgroundColor: colors.cardBorder }]}>
          <Text style={[styles.errorText, { color: colors.danger || '#EF4444' }]}>{error}</Text>
        </View>
      )}

      <FlatList
        data={orders}
        keyExtractor={(item) => item.id.toString()}
        renderItem={renderItem}
        contentContainerStyle={[
          styles.listContent,
          { paddingBottom: insets.bottom + 80 },
        ]}
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
              <Text style={[styles.emptyText, { color: colors.textSecondary }]}>
                No se encontraron órdenes
              </Text>
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
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
  },
  header: {
    paddingBottom: 16,
  },
  title: {
    fontSize: 28,
    fontWeight: '700',
    marginBottom: 16,
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 12,
    borderWidth: 1,
    paddingHorizontal: 12,
    height: 48,
  },
  searchIcon: {
    marginRight: 8,
  },
  searchInput: {
    flex: 1,
    fontSize: 16,
    height: '100%',
    fontFamily: 'Montserrat_400Regular',
  },
  listContent: {
    paddingHorizontal: 16,
    gap: 12,
  },
  card: {
    borderRadius: 16,
    borderWidth: 1,
    padding: 16,
    gap: 12,
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.05,
        shadowRadius: 8,
      },
      android: {
        elevation: 2,
      },
    }),
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: 12,
  },
  orderName: {
    flex: 1,
    fontSize: 16,
    fontWeight: '700',
  },
  stateBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
  },
  stateText: {
    fontSize: 12,
    fontWeight: '700',
  },
  cardBody: {
    gap: 4,
  },
  infoText: {
    fontSize: 14,
  },
  cardFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: 'rgba(0,0,0,0.05)',
  },
  orderTotal: {
    fontSize: 18,
    fontWeight: '700',
  },
  fab: {
    position: 'absolute',
    right: 20,
    width: 60,
    height: 60,
    borderRadius: 30,
    justifyContent: 'center',
    alignItems: 'center',
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.3,
        shadowRadius: 8,
      },
      android: {
        elevation: 8,
      },
    }),
  },
  loaderFooter: {
    paddingVertical: 20,
    alignItems: 'center',
  },
  emptyContainer: {
    paddingTop: 60,
    alignItems: 'center',
    gap: 16,
  },
  emptyText: {
    fontSize: 16,
    textAlign: 'center',
  },
  errorContainer: {
    marginHorizontal: 16,
    marginBottom: 16,
    padding: 12,
    borderRadius: 8,
  },
  errorText: {
    fontSize: 14,
    textAlign: 'center',
  },
});
