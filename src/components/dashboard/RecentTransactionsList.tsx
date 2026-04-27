import React, { useCallback } from 'react';
import { View, FlatList, StyleSheet } from 'react-native';
import Text from '@/components/ui/Text';
import { Ionicons } from '@expo/vector-icons';
import type { Transaction, TransactionState } from '@/types/odoo.types';
import { useTheme } from '@/theme/ThemeContext';

interface Props {
  transactions: Transaction[];
}

const STATE_CONFIG: Record<
  TransactionState,
  { label: string; color: string; icon: React.ComponentProps<typeof Ionicons>['name'] }
> = {
  paid: { label: 'Pagado', color: '#10B981', icon: 'checkmark-circle' },
  pending: { label: 'Pendiente', color: '#F59E0B', icon: 'time' },
  overdue: { label: 'Vencida', color: '#EF4444', icon: 'alert-circle' },
  draft: { label: 'Borrador', color: '#6B7280', icon: 'document-text-outline' },
};

// ─── Row component (memoized for FlatList performance) ────────────────────────

interface RowProps {
  item: Transaction;
}

const TransactionRow = React.memo(function TransactionRow({ item }: RowProps) {
  const { colors } = useTheme();
  const cfg = STATE_CONFIG[item.state];

  return (
    <View style={styles.row}>
      <View style={[styles.iconBadge, { backgroundColor: `${cfg.color}18` }]}>
        <Ionicons name={cfg.icon} size={18} color={cfg.color} />
      </View>

      <View style={styles.info}>
        <Text style={[styles.invoiceNumber, { color: colors.textPrimary }]}>{item.name}</Text>
        <Text style={[styles.partner, { color: colors.textSecondary }]} numberOfLines={1}>
          {item.partner}
        </Text>
        <Text style={[styles.date, { color: colors.textSecondary }]}>{item.date}</Text>
      </View>

      <View style={styles.rightCol}>
        <Text style={[styles.amount, { color: colors.textPrimary }]}>
          ${item.amount.toLocaleString('es')}
        </Text>
        <View style={[styles.stateBadge, { borderColor: cfg.color }]}>
          <Text style={[styles.stateText, { color: cfg.color }]}>{cfg.label}</Text>
        </View>
      </View>
    </View>
  );
});

// ─── List component ───────────────────────────────────────────────────────────

export default function RecentTransactionsList({ transactions }: Props) {
  const { colors } = useTheme();

  const renderItem = useCallback(
    ({ item }: { item: Transaction }) => <TransactionRow item={item} />,
    []
  );

  const keyExtractor = useCallback((item: Transaction) => String(item.id), []);

  const ItemSeparator = useCallback(
    () => <View style={[styles.separator, { backgroundColor: colors.cardBorder }]} />,
    [colors.cardBorder]
  );

  return (
    <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.cardBorder }]}>
      <Text style={[styles.title, { color: colors.textPrimary }]}>Últimos Movimientos</Text>
      <FlatList
        data={transactions}
        keyExtractor={keyExtractor}
        renderItem={renderItem}
        ItemSeparatorComponent={ItemSeparator}
        scrollEnabled={false}
        removeClippedSubviews={false}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
  },
  title: {
    fontSize: 15,
    fontWeight: '700',
    marginBottom: 16,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingVertical: 4,
  },
  iconBadge: {
    width: 40,
    height: 40,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  info: { flex: 1, gap: 2 },
  invoiceNumber: { fontSize: 13, fontWeight: '600' },
  partner: { fontSize: 12 },
  date: { fontSize: 11 },
  rightCol: { alignItems: 'flex-end', gap: 4 },
  amount: { fontSize: 14, fontWeight: '700' },
  stateBadge: {
    borderWidth: 1,
    borderRadius: 6,
    paddingHorizontal: 6,
    paddingVertical: 2,
  },
  stateText: { fontSize: 10, fontWeight: '700', textTransform: 'uppercase' },
  separator: { height: 1, marginVertical: 8 },
});
