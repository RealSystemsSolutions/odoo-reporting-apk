import React from 'react';
import { View, StyleSheet } from 'react-native';
import Text from '@/components/ui/Text';
import { useTheme } from '@/theme/ThemeContext';
import { MasterReportData } from '@/types/odoo.types';
import { Ionicons } from '@expo/vector-icons';

interface MasterReportViewProps {
  data: MasterReportData;
}

export default function MasterReportView({ data }: MasterReportViewProps) {
  const { colors } = useTheme();

  const renderTable = (title: string, icon: string, columns: string[], rows: any[], rowRenderer: (item: any, index: number) => React.ReactNode) => (
    <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.cardBorder }]}>
      <View style={styles.cardHeader}>
        <Ionicons name={icon as any} size={20} color={colors.primary} />
        <Text style={[styles.cardTitle, { color: colors.textPrimary }]}>{title}</Text>
      </View>
      
      <View style={[styles.tableHeader, { borderBottomColor: colors.cardBorder + '40' }]}>
        {columns.map((col, i) => (
          <Text key={i} style={[styles.headerCell, { color: colors.textSecondary, flex: i === 0 ? 2 : 1, textAlign: i === 0 ? 'left' : 'right' }]}>
            {col}
          </Text>
        ))}
      </View>
      
      {(rows || []).map((item, index) => (
        <View key={index} style={[styles.tableRow, { borderBottomColor: colors.cardBorder + '20' }]}>
          {rowRenderer(item, index)}
        </View>
      ))}
      
      {(!rows || rows.length === 0) && (
        <Text style={{ textAlign: 'center', color: colors.textSecondary, padding: 20 }}>No data available</Text>
      )}
    </View>
  );

  return (
    <View style={styles.container}>
      <View style={styles.infoSummary}>
        <Text style={{ color: colors.textSecondary, fontSize: 11 }}>
          Report ID: {data.id} · Generated: {data.report_generated}
        </Text>
      </View>

      {/* Financial Summary */}
      {renderTable(
        'Financial Summary',
        'cash-outline',
        ['Description', 'Count', 'Amount'],
        data.financial_line_ids,
        (item) => (
          <>
            <Text style={[styles.cell, { color: colors.textPrimary, flex: 2 }]}>{item.description}</Text>
            <Text style={[styles.cell, { color: colors.textSecondary, textAlign: 'right' }]}>{item.count}</Text>
            <Text style={[styles.cell, { color: colors.primary, fontWeight: '700', textAlign: 'right' }]}>
              ${(item.amount || 0).toFixed(2)}
            </Text>
          </>
        )
      )}

      {/* Sales by Category */}
      {renderTable(
        'Sales by Category',
        'pricetag-outline',
        ['Category', 'Qty', 'Revenue', '%'],
        data.category_line_ids,
        (item) => (
          <>
            <Text style={[styles.cell, { color: colors.textPrimary, flex: 2 }]} numberOfLines={1}>{item.category_name}</Text>
            <Text style={[styles.cell, { color: colors.textSecondary, textAlign: 'right' }]}>{item.number_sold}</Text>
            <Text style={[styles.cell, { color: colors.textPrimary, textAlign: 'right' }]}>${(item.gross_revenue || 0).toFixed(2)}</Text>
            <Text style={[styles.cell, { color: colors.textSecondary, textAlign: 'right', fontSize: 10 }]}>{(item.gross_revenue_percent || 0).toFixed(1)}%</Text>
          </>
        )
      )}

      {/* Payment Summary */}
      {renderTable(
        'Payment Summary',
        'wallet-outline',
        ['Method', 'Count', 'Total'],
        data.payment_line_ids,
        (item) => (
          <>
            <Text style={[styles.cell, { color: colors.textPrimary, flex: 2 }]}>{item.name}</Text>
            <Text style={[styles.cell, { color: colors.textSecondary, textAlign: 'right' }]}>{item.count_payment}</Text>
            <Text style={[styles.cell, { color: colors.primary, fontWeight: '600', textAlign: 'right' }]}>
              ${(item.total || 0).toFixed(2)}
            </Text>
          </>
        )
      )}

      {/* Detailed Payment Methods */}
      {renderTable(
        'Payment Methods (Detail)',
        'list-outline',
        ['Method', 'Count', 'Total'],
        data.payment_methods_line_ids,
        (item) => (
          <>
            <Text style={[styles.cell, { color: colors.textPrimary, flex: 2 }]}>{item.name}</Text>
            <Text style={[styles.cell, { color: colors.textSecondary, textAlign: 'right' }]}>{item.count_payment}</Text>
            <Text style={[styles.cell, { color: colors.textPrimary, textAlign: 'right' }]}>
              ${(item.total || 0).toFixed(2)}
            </Text>
          </>
        )
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    gap: 16,
  },
  infoSummary: {
    marginBottom: 4,
    paddingHorizontal: 4,
  },
  card: {
    borderRadius: 16,
    borderWidth: 1,
    padding: 16,
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginBottom: 16,
  },
  cardTitle: {
    fontSize: 16,
    fontWeight: '700',
  },
  tableHeader: {
    flexDirection: 'row',
    paddingBottom: 8,
    borderBottomWidth: 1,
    marginBottom: 8,
  },
  headerCell: {
    fontSize: 11,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  tableRow: {
    flexDirection: 'row',
    paddingVertical: 10,
    borderBottomWidth: 1,
    alignItems: 'center',
  },
  cell: {
    fontSize: 13,
    flex: 1,
  },
});
