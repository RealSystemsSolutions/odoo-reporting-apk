import React, { useEffect, useCallback, useState } from 'react';
import {
  View,
  StyleSheet,
  FlatList,
  RefreshControl,
  TouchableOpacity,
  TextInput,
  ActivityIndicator,
  Alert,
} from 'react-native';
import Text from '@/components/ui/Text';
import Logo from '@/components/ui/Logo';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '@/theme/ThemeContext';
import { useCategoriesStore } from '@/store/categories.store';
import { useAppStore } from '@/store/app.store';
import type { OdooProductCategory } from '@/types/odoo.types';
import CategoryModal from '@/components/management/CategoryModal';

export default function DepartmentsScreen() {
  const insets = useSafeAreaInsets();
  const { colors } = useTheme();
  const { user } = useAppStore();
  
  const {
    categories,
    isLoading,
    error,
    searchQuery,
    setSearchQuery,
    fetchCategories,
    hasMore,
    createCategory,
    updateCategory,
    deleteCategory,
  } = useCategoriesStore();

  const [modalVisible, setModalVisible] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState<OdooProductCategory | undefined>();

  useEffect(() => {
    fetchCategories(true);
  }, []);

  const handleRefresh = useCallback(() => {
    fetchCategories(true);
  }, [fetchCategories]);

  const handleLoadMore = () => {
    if (!isLoading && hasMore) {
      fetchCategories();
    }
  };

  const handleAddCategory = () => {
    setSelectedCategory(undefined);
    setModalVisible(true);
  };

  const handleEditCategory = (category: OdooProductCategory) => {
    setSelectedCategory(category);
    setModalVisible(true);
  };

  const handleSaveCategory = async (data: Partial<OdooProductCategory>) => {
    if (selectedCategory) {
      await updateCategory(selectedCategory.id, data);
    } else {
      await createCategory(data);
    }
  };

  const handleDeletePress = (id: number) => {
    Alert.alert(
      'Delete Category',
      'Are you sure you want to delete this category?',
      [
        { text: 'Cancel', style: 'cancel' },
        { 
          text: 'Delete', 
          style: 'destructive',
          onPress: async () => {
            try {
              await deleteCategory(id);
            } catch (e: any) {
              Alert.alert('Error', e.message || 'Failed to delete');
            }
          }
        },
      ]
    );
  };

  const renderItem = ({ item }: { item: OdooProductCategory }) => (
    <TouchableOpacity
      style={[styles.card, { backgroundColor: colors.card, borderColor: colors.cardBorder }]}
      onPress={() => handleEditCategory(item)}
      activeOpacity={0.7}
    >
      <View style={styles.cardContent}>
        <View style={styles.infoCol}>
          <Text style={[styles.catName, { color: colors.textPrimary }]}>{item.name}</Text>
          <View style={styles.badgeRow}>
            {item.taxable && (
              <View style={[styles.badge, { backgroundColor: colors.primary + '20' }]}>
                <Text style={[styles.badgeText, { color: colors.primary }]}>TAX</Text>
              </View>
            )}
            {item.food_stamp && (
              <View style={[styles.badge, { backgroundColor: '#10B98120' }]}>
                <Text style={[styles.badgeText, { color: '#10B981' }]}>SNAP/WIC</Text>
              </View>
            )}
            {item.age_verification && (
              <View style={[styles.badge, { backgroundColor: '#F59E0B20' }]}>
                <Text style={[styles.badgeText, { color: '#F59E0B' }]}>AGE</Text>
              </View>
            )}
          </View>
        </View>

        <TouchableOpacity 
          onPress={() => handleDeletePress(item.id)}
          style={styles.deleteBtn}
        >
          <Ionicons name="trash-outline" size={20} color={colors.danger} />
        </TouchableOpacity>
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
        <Text style={[styles.title, { color: colors.textPrimary }]}>Departments</Text>
        <View style={[styles.searchContainer, { backgroundColor: colors.card, borderColor: colors.cardBorder }]}>
          <Ionicons name="search" size={20} color={colors.textSecondary} style={styles.searchIcon} />
          <TextInput
            style={[styles.searchInput, { color: colors.textPrimary }]}
            placeholder="Search departments..."
            placeholderTextColor={colors.textSecondary}
            value={searchQuery}
            onChangeText={setSearchQuery}
          />
        </View>
      </View>

      <FlatList
        data={categories}
        keyExtractor={(item) => item.id.toString()}
        renderItem={renderItem}
        contentContainerStyle={[styles.listContent, { paddingBottom: insets.bottom + 80 }]}
        refreshControl={
          <RefreshControl
            refreshing={isLoading && categories.length === 0}
            onRefresh={handleRefresh}
            tintColor={colors.primary}
          />
        }
        onEndReached={handleLoadMore}
        onEndReachedThreshold={0.5}
        ListEmptyComponent={
          !isLoading ? (
            <View style={styles.emptyContainer}>
              <Ionicons name="file-tray-stacked-outline" size={64} color={colors.cardBorder} />
              <Text style={{ color: colors.textSecondary }}>No departments found</Text>
            </View>
          ) : null
        }
      />

      <TouchableOpacity
        style={[styles.fab, { backgroundColor: colors.primary, bottom: insets.bottom + 20 }]}
        onPress={handleAddCategory}
      >
        <Ionicons name="add" size={30} color="#FFF" />
      </TouchableOpacity>

      <CategoryModal
        visible={modalVisible}
        category={selectedCategory}
        onClose={() => setModalVisible(false)}
        onSave={handleSaveCategory}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  header: { paddingBottom: 16 },
  title: { fontSize: 28, fontWeight: '700', marginBottom: 16 },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 12,
    borderWidth: 1,
    paddingHorizontal: 12,
    height: 48,
  },
  searchIcon: { marginRight: 8 },
  searchInput: { flex: 1, fontSize: 16, height: '100%' },
  listContent: { paddingHorizontal: 16, gap: 12 },
  card: {
    borderRadius: 16,
    borderWidth: 1,
    padding: 16,
  },
  cardContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  infoCol: { flex: 1, gap: 8 },
  catName: { fontSize: 18, fontWeight: '600' },
  badgeRow: { flexDirection: 'row', gap: 6 },
  badge: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
  },
  badgeText: { fontSize: 10, fontWeight: '700' },
  deleteBtn: {
    padding: 8,
    borderRadius: 8,
    backgroundColor: 'rgba(239, 68, 68, 0.1)',
  },
  fab: {
    position: 'absolute',
    right: 20,
    width: 60,
    height: 60,
    borderRadius: 30,
    justifyContent: 'center',
    alignItems: 'center',
    elevation: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
  },
  emptyContainer: {
    paddingTop: 80,
    alignItems: 'center',
    gap: 16,
  },
});
