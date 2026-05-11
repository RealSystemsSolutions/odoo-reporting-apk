import React, { useState } from 'react';
import {
  View,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Modal,
  SafeAreaView,
} from 'react-native';
import Text from '@/components/ui/Text';
import type { InventoryItem } from '@/types/odoo.types';
import { useTheme } from '@/theme/ThemeContext';
import { Ionicons } from '@expo/vector-icons';

interface Props {
  data: InventoryItem[];
  criticalCount: number;
  warningCount: number;
  healthyCount: number;
}

export default function InventoryStatusTable({
  data,
  criticalCount,
  warningCount,
  healthyCount,
}: Props) {
  const { colors } = useTheme();
  const [filterMode, setFilterMode] = useState<'all' | 'critical'>('all');
  const [selectedItem, setSelectedItem] = useState<InventoryItem | null>(null);

  const statusColors = {
    critical: '#EF4444',
    warning: '#F59E0B',
    healthy: '#10B981',
  };

  const statusLabels = {
    critical: 'Critical',
    warning: 'Warning',
    healthy: 'Ok',
  };

  const filteredData =
    filterMode === 'critical'
      ? data.filter((item) => item.status === 'critical')
      : data;

  if (!data || data.length === 0) {
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
          Inventory: Alerts & Rotation
        </Text>
        <Text style={{ color: colors.textSecondary, marginTop: 16 }}>
          No data available
        </Text>
      </View>
    );
  }

  return (
    <>
      <View
        style={[
          styles.card,
          { backgroundColor: colors.card, borderColor: colors.cardBorder },
        ]}
      >
        <Text style={[styles.title, { color: colors.textPrimary }]}>
          Inventory: Alerts & Rotation
        </Text>

        {/* Summary badges */}
        <View style={styles.summaryRow}>
          <View
            style={[
              styles.badge,
              { backgroundColor: 'rgba(239, 68, 68, 0.1)', borderColor: statusColors.critical },
            ]}
          >
            <Text style={[styles.badgeText, { color: statusColors.critical }]}>
              🔴 {criticalCount}
            </Text>
          </View>
          <View
            style={[
              styles.badge,
              { backgroundColor: 'rgba(245, 158, 11, 0.1)', borderColor: statusColors.warning },
            ]}
          >
            <Text style={[styles.badgeText, { color: statusColors.warning }]}>
              🟡 {warningCount}
            </Text>
          </View>
          <View
            style={[
              styles.badge,
              { backgroundColor: 'rgba(16, 185, 129, 0.1)', borderColor: statusColors.healthy },
            ]}
          >
            <Text style={[styles.badgeText, { color: statusColors.healthy }]}>
              🟢 {healthyCount}
            </Text>
          </View>
        </View>

        {/* Filter buttons */}
        <View style={styles.filterRow}>
          <TouchableOpacity
            onPress={() => setFilterMode('all')}
            style={[
              styles.filterBtn,
              {
                backgroundColor:
                  filterMode === 'all'
                    ? colors.primary
                    : colors.inputBackground,
                borderColor:
                  filterMode === 'all' ? colors.primary : colors.cardBorder,
              },
            ]}
          >
            <Text
              style={{
                color:
                  filterMode === 'all'
                    ? colors.card
                    : colors.textSecondary,
                fontWeight: '600',
                fontSize: 12,
              }}
            >
              All
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            onPress={() => setFilterMode('critical')}
            style={[
              styles.filterBtn,
              {
                backgroundColor:
                  filterMode === 'critical'
                    ? '#EF4444'
                    : colors.inputBackground,
                borderColor:
                  filterMode === 'critical'
                    ? '#EF4444'
                    : colors.cardBorder,
              },
            ]}
          >
            <Text
              style={{
                color:
                  filterMode === 'critical'
                    ? '#FFF'
                    : colors.textSecondary,
                fontWeight: '600',
                fontSize: 12,
              }}
            >
              Critical only
            </Text>
          </TouchableOpacity>
        </View>

        {/* Simplified table for mobile with vertical scroll */}
        <ScrollView
          style={[styles.tableScrollContainer, { borderColor: colors.cardBorder }]}
          showsVerticalScrollIndicator={true}
          nestedScrollEnabled={true}
        >
          <View style={styles.tableContainer}>
            {/* Table Header */}
            <View
              style={[
                styles.tableRow,
                styles.tableHeader,
                { backgroundColor: colors.inputBackground, borderBottomColor: colors.cardBorder },
              ]}
            >
              <Text style={[styles.tableCell, styles.headerCell, { flex: 2, color: colors.textSecondary }]}>
                Product
              </Text>
              <Text style={[styles.tableCell, styles.headerCell, { width: 60, textAlign: 'center', color: colors.textSecondary }]}>
                Stock
              </Text>
              <Text style={[styles.tableCell, styles.headerCell, { width: 70, textAlign: 'center', color: colors.textSecondary }]}>
                Status
              </Text>
              <Text style={[styles.tableCell, styles.headerCell, { width: 40, color: colors.textSecondary }]}>
                {/* Details icon space */}
              </Text>
            </View>

            {/* Table Rows */}
            {filteredData.map((item, idx) => (
              <TouchableOpacity
                key={item.id}
                onPress={() => setSelectedItem(item)}
                style={[
                  styles.tableRow,
                  {
                    backgroundColor:
                      idx % 2 === 0
                        ? colors.card
                        : colors.inputBackground,
                    borderBottomColor: colors.cardBorder,
                  },
                ]}
              >
                <Text style={[styles.tableCell, { flex: 2, color: colors.textPrimary }]} numberOfLines={1}>
                  {item.productName}
                </Text>
                <Text
                  style={[
                    styles.tableCell,
                    { width: 60, textAlign: 'center', fontWeight: '600', color: colors.textPrimary },
                  ]}
                >
                  {item.currentStock}
                </Text>
                <View
                  style={[
                    styles.tableCell,
                    { width: 70, alignItems: 'center', justifyContent: 'center' },
                  ]}
                >
                  <View
                    style={[
                      styles.statusBadge,
                      {
                        backgroundColor: statusColors[item.status],
                      },
                    ]}
                  >
                    <Text style={styles.statusText}>
                      {statusLabels[item.status]}
                    </Text>
                  </View>
                </View>
                <View
                  style={[
                    styles.tableCell,
                    { width: 40, alignItems: 'center', justifyContent: 'center' },
                  ]}
                >
                  <Ionicons
                    name="chevron-forward"
                    size={16}
                    color={colors.textSecondary}
                  />
                </View>
              </TouchableOpacity>
            ))}
          </View>
        </ScrollView>

        <Text
          style={{
            textAlign: 'center',
            color: colors.textSecondary,
            marginTop: 12,
            fontSize: 12,
          }}
        >
          {filteredData.length} product{filteredData.length !== 1 ? 's' : ''}
        </Text>

        {filteredData.length === 0 && filterMode === 'critical' && (
          <Text
            style={{
              textAlign: 'center',
              color: colors.textSecondary,
              marginTop: 16,
              fontSize: 13,
            }}
          >
            Excellent! There are no critical products in stock.
          </Text>
        )}
      </View>

      {/* Details Modal */}
      <Modal
        visible={selectedItem !== null}
        transparent
        animationType="slide"
        onRequestClose={() => setSelectedItem(null)}
      >
        <SafeAreaView
          style={{
            flex: 1,
            backgroundColor: colors.background,
          }}
        >
          {/* Header */}
          <View
            style={{
              flexDirection: 'row',
              justifyContent: 'space-between',
              alignItems: 'center',
              paddingHorizontal: 16,
              paddingVertical: 12,
              borderBottomWidth: 1,
              borderBottomColor: colors.cardBorder,
            }}
          >
            <Text
              style={{
                fontSize: 18,
                fontWeight: '700',
                color: colors.textPrimary,
              }}
            >
              Product Details
            </Text>
            <TouchableOpacity
              onPress={() => setSelectedItem(null)}
              style={{ padding: 8 }}
            >
              <Ionicons name="close" size={24} color={colors.textPrimary} />
            </TouchableOpacity>
          </View>

          {/* Product Details */}
          {selectedItem && (
            <ScrollView
              style={{ flex: 1 }}
              contentContainerStyle={{ padding: 16 }}
            >
              <View
                style={[
                  styles.detailCard,
                  {
                    backgroundColor: colors.card,
                    borderColor: colors.cardBorder,
                  },
                ]}
              >
                <Text
                  style={{
                    fontSize: 20,
                    fontWeight: '700',
                    color: colors.textPrimary,
                    marginBottom: 8,
                  }}
                >
                  {selectedItem.productName}
                </Text>

                <View
                  style={[
                    styles.statusBadgeLarge,
                    {
                      backgroundColor: statusColors[selectedItem.status],
                      alignSelf: 'flex-start',
                      marginBottom: 16,
                    },
                  ]}
                >
                  <Text style={styles.statusTextLarge}>
                    {statusLabels[selectedItem.status]}
                  </Text>
                </View>

                <View style={styles.detailGrid}>
                  <View style={styles.detailItem}>
                    <Text style={[styles.detailLabel, { color: colors.textSecondary }]}>
                      SKU
                    </Text>
                    <Text style={[styles.detailValue, { color: colors.textPrimary }]}>
                      {selectedItem.sku}
                    </Text>
                  </View>

                  <View style={styles.detailItem}>
                    <Text style={[styles.detailLabel, { color: colors.textSecondary }]}>
                      Current Stock
                    </Text>
                    <Text style={[styles.detailValue, { color: colors.textPrimary, fontWeight: '700' }]}>
                      {selectedItem.currentStock} units
                    </Text>
                  </View>

                  <View style={styles.detailItem}>
                    <Text style={[styles.detailLabel, { color: colors.textSecondary }]}>
                      Minimum Stock
                    </Text>
                    <Text style={[styles.detailValue, { color: colors.textPrimary }]}>
                      {selectedItem.minStockLevel} units
                    </Text>
                  </View>

                  <View style={styles.detailItem}>
                    <Text style={[styles.detailLabel, { color: colors.textSecondary }]}>
                      Reorder Point
                    </Text>
                    <Text style={[styles.detailValue, { color: colors.textPrimary }]}>
                      {selectedItem.reorderPoint} units
                    </Text>
                  </View>

                  <View style={styles.detailItem}>
                    <Text style={[styles.detailLabel, { color: colors.textSecondary }]}>
                      Warehouse
                    </Text>
                    <Text style={[styles.detailValue, { color: colors.textPrimary }]}>
                      {selectedItem.warehouse}
                    </Text>
                  </View>

                  <View style={styles.detailItem}>
                    <Text style={[styles.detailLabel, { color: colors.textSecondary }]}>
                      Last Movement
                    </Text>
                    <Text style={[styles.detailValue, { color: colors.textPrimary }]}>
                      {selectedItem.lastMovement}
                    </Text>
                  </View>

                  <View style={styles.detailItem}>
                    <Text style={[styles.detailLabel, { color: colors.textSecondary }]}>
                      Turnover Rate
                    </Text>
                    <Text style={[styles.detailValue, { color: colors.textPrimary }]}>
                      {selectedItem.turnoverRate.toFixed(1)} turnovers
                    </Text>
                  </View>
                </View>

                {/* Stock Level Indicator */}
                <View style={{ marginTop: 20 }}>
                  <Text style={[styles.detailLabel, { color: colors.textSecondary, marginBottom: 8 }]}>
                    Stock Level
                  </Text>
                  <View style={[styles.stockIndicator, { backgroundColor: colors.cardBorder }]}>
                    <View
                      style={[
                        styles.stockBar,
                        {
                          width: `${Math.min((selectedItem.currentStock / selectedItem.reorderPoint) * 100, 100)}%`,
                          backgroundColor: statusColors[selectedItem.status],
                        },
                      ]}
                    />
                  </View>
                  <View style={styles.stockLabels}>
                    <Text style={[styles.stockLabel, { color: colors.textSecondary }]}>
                      0
                    </Text>
                    <Text style={[styles.stockLabel, { color: colors.textSecondary }]}>
                      {selectedItem.reorderPoint}
                    </Text>
                  </View>
                </View>
              </View>
            </ScrollView>
          )}
        </SafeAreaView>
      </Modal>
    </>
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
  summaryRow: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 12,
    flexWrap: 'wrap',
  },
  badge: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
    borderWidth: 1,
  },
  badgeText: {
    fontSize: 11,
    fontWeight: '600',
  },
  filterRow: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 12,
  },
  filterBtn: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
    borderWidth: 1,
  },
  tableScrollContainer: {
    maxHeight: 400,
    borderRadius: 8,
    overflow: 'hidden',
    borderWidth: 1,
  },
  tableContainer: {
    borderRadius: 8,
    overflow: 'hidden',
  },
  tableRow: {
    flexDirection: 'row',
    alignItems: 'center',
    borderBottomWidth: 1,
  },
  tableHeader: {
    paddingVertical: 8,
  },
  tableCell: {
    paddingVertical: 12,
    paddingHorizontal: 8,
    fontSize: 12,
  },
  headerCell: {
    fontWeight: '700',
    fontSize: 11,
  },
  statusBadge: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  statusText: {
    color: '#FFF',
    fontSize: 10,
    fontWeight: '600',
  },
  detailCard: {
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
  },
  statusBadgeLarge: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
  },
  statusTextLarge: {
    color: '#FFF',
    fontSize: 12,
    fontWeight: '600',
  },
  detailGrid: {
    gap: 16,
  },
  detailItem: {
    marginBottom: 12,
  },
  detailLabel: {
    fontSize: 12,
    fontWeight: '600',
    marginBottom: 4,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  detailValue: {
    fontSize: 16,
  },
  stockIndicator: {
    height: 8,
    borderRadius: 4,
    marginBottom: 8,
  },
  stockBar: {
    height: '100%',
    borderRadius: 4,
  },
  stockLabels: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  stockLabel: {
    fontSize: 11,
  },
});

