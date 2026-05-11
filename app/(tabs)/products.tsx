import React, { useEffect, useCallback } from 'react';
import { View, StyleSheet, FlatList, RefreshControl, TouchableOpacity, TextInput, ActivityIndicator, Platform, Image } from 'react-native';
import Text from '@/components/ui/Text';
import Logo from '@/components/ui/Logo';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useTheme } from '@/theme/ThemeContext';
import { useProductsStore } from '@/store/products.store';
import { useAppStore } from '@/store/app.store';
import { OdooProduct } from '@/types/odoo.types';
import ScannerModal from '@/components/ScannerModal';

export default function ProductsScreen() {
  const insets = useSafeAreaInsets();
  const { colors } = useTheme();
  const router = useRouter();
  const { user } = useAppStore();
  const [isScannerVisible, setIsScannerVisible] = React.useState(false);

  const {
    products,
    isLoading,
    error,
    searchQuery,
    setSearchQuery,
    fetchProducts,
    hasMore,
  } = useProductsStore();

  useEffect(() => {
    fetchProducts(true);
  }, []);

  const handleRefresh = useCallback(() => {
    fetchProducts(true);
  }, [fetchProducts]);

  const handleLoadMore = () => {
    if (!isLoading && hasMore) {
      fetchProducts();
    }
  };

  const handleAddProduct = (barcode?: string) => {
    router.push({
      pathname: '/product-details' as any,
      params: { id: 'new', barcode: barcode || '' },
    });
  };

  const handleEditProduct = (product: OdooProduct) => {
    router.push({
      pathname: '/product-details' as any,
      params: { id: product.id.toString(), productData: JSON.stringify(product) },
    });
  };

  const renderItem = ({ item }: { item: OdooProduct }) => (
    <TouchableOpacity
      style={[styles.card, { backgroundColor: colors.card, borderColor: colors.cardBorder }]}
      onPress={() => handleEditProduct(item)}
      activeOpacity={0.7}
    >
      <View style={styles.cardRow}>
        <View style={[styles.imageContainer, { backgroundColor: colors.background, borderColor: colors.cardBorder }]}>
          {item.image_128 ? (
            <Image source={{ uri: `data:image/png;base64,${item.image_128}` }} style={styles.image} />
          ) : (
            <Ionicons name="image-outline" size={32} color={colors.primary} style={{ opacity: 0.5 }} />
          )}
        </View>

        <View style={styles.cardInfo}>
          <View style={styles.cardHeader}>
            <Text style={[styles.productName, { color: colors.textPrimary }]} numberOfLines={1}>
              {item.name}
            </Text>
            <Text style={[styles.productPrice, { color: colors.primary }]}>
              ${item.list_price.toFixed(2)}
            </Text>
          </View>
          <View style={styles.cardBody}>
            {item.default_code ? (
              <Text style={[styles.infoText, { color: colors.textSecondary }]}>
                <Ionicons name="pricetag-outline" size={14} color={colors.textSecondary} /> {item.default_code}
              </Text>
            ) : null}
            {item.barcode ? (
              <Text style={[styles.infoText, { color: colors.textSecondary }]}>
                <Ionicons name="barcode-outline" size={14} color={colors.textSecondary} /> {item.barcode}
              </Text>
            ) : null}
          </View>
          <View style={styles.cardFooter}>
            <View style={styles.qtyBadge}>
              <Text style={styles.qtyText}>{item.qty_available} units</Text>
            </View>
          </View>
        </View>
      </View>
    </TouchableOpacity>
  );

  return (
    <View style={[styles.root, { backgroundColor: colors.background }]}>
      <View style={[styles.header, { paddingTop: insets.top + 12, paddingHorizontal: 16 }]}>
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
          <Logo width={110} height={25} />
          <Text style={{ fontSize: 14, fontWeight: '700', color: colors.textSecondary, textTransform: 'capitalize' }}>
            {user?.tenant?.db || ''}
          </Text>
        </View>
        <Text style={[styles.title, { color: colors.textPrimary }]}>Products</Text>
        <View style={[styles.searchContainer, { backgroundColor: colors.card, borderColor: colors.cardBorder }]}>
          <Ionicons name="search" size={20} color={colors.textSecondary} style={styles.searchIcon} />
          <TextInput
            style={[styles.searchInput, { color: colors.textPrimary }]}
            placeholder="Search by name or code..."
            placeholderTextColor={colors.textSecondary}
            value={searchQuery}
            onChangeText={setSearchQuery}
            returnKeyType="search"
          />
          <TouchableOpacity onPress={() => setIsScannerVisible(true)} style={styles.scannerIcon}>
            <Ionicons name="barcode-outline" size={22} color={colors.primary} />
          </TouchableOpacity>
          {searchQuery.length > 0 && (
            <TouchableOpacity onPress={() => setSearchQuery('')} style={{ marginLeft: 8 }}>
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
        data={products}
        keyExtractor={(item) => item.id.toString()}
        renderItem={renderItem}
        contentContainerStyle={[
          styles.listContent,
          { paddingBottom: insets.bottom + 80 },
        ]}
        refreshControl={
          <RefreshControl
            refreshing={isLoading && products.length === 0}
            onRefresh={handleRefresh}
            tintColor={colors.primary}
          />
        }
        onEndReached={handleLoadMore}
        onEndReachedThreshold={0.5}
        ListFooterComponent={
          isLoading && products.length > 0 ? (
            <View style={styles.loaderFooter}>
              <ActivityIndicator size="small" color={colors.primary} />
            </View>
          ) : null
        }
        ListEmptyComponent={
          !isLoading ? (
            <View style={styles.emptyContainer}>
              <Ionicons name="cube-outline" size={64} color={colors.cardBorder} />
              <Text style={[styles.emptyText, { color: colors.textSecondary }]}>
                {searchQuery ? `No products found for "${searchQuery}"` : 'No products found'}
              </Text>
              {searchQuery.length > 0 && (
                <TouchableOpacity
                  style={[styles.createBtn, { backgroundColor: colors.primary }]}
                  onPress={() => handleAddProduct(searchQuery)}
                >
                  <Ionicons name="add-circle-outline" size={20} color="#FFF" />
                  <Text style={styles.createBtnText}>Create Product</Text>
                </TouchableOpacity>
              )}
            </View>
          ) : null
        }
      />

      <TouchableOpacity
        style={[styles.fab, { backgroundColor: colors.primary, bottom: insets.bottom + 20 }]}
        onPress={handleAddProduct}
        activeOpacity={0.8}
      >
        <Ionicons name="add" size={30} color="#FFFFFF" />
      </TouchableOpacity>

      <ScannerModal
        visible={isScannerVisible}
        onClose={() => setIsScannerVisible(false)}
        onScan={(code) => {
          setSearchQuery(code);
          setIsScannerVisible(false);
        }}
      />
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
  },
  scannerIcon: {
    padding: 4,
    marginLeft: 8,
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
  cardRow: {
    flexDirection: 'row',
    gap: 12,
  },
  imageContainer: {
    width: 70,
    height: 70,
    borderRadius: 8,
    borderWidth: 1,
    justifyContent: 'center',
    alignItems: 'center',
    overflow: 'hidden',
  },
  image: {
    width: '100%',
    height: '100%',
  },
  cardInfo: {
    flex: 1,
    gap: 8,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    gap: 12,
  },
  productName: {
    flex: 1,
    fontSize: 16,
    fontWeight: '600',
  },
  productPrice: {
    fontSize: 16,
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
    justifyContent: 'flex-end',
    alignItems: 'center',
  },
  qtyBadge: {
    backgroundColor: '#10B98120',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
  },
  qtyText: {
    color: '#10B981',
    fontSize: 12,
    fontWeight: '600',
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
  createBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 12,
    marginTop: 16,
  },
  createBtnText: {
    color: '#FFF',
    fontSize: 16,
    fontWeight: '700',
  },
});
