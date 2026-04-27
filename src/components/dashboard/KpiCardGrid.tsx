import { View, StyleSheet } from 'react-native';
import { KpiCard } from './KpiCard';
import { useResponsive } from '@/hooks/useResponsive';
import type { KpiData } from '@/types/odoo.types';

interface Props {
  kpis: KpiData[];
}

export default function KpiCardGrid({ kpis }: Props) {
  const { kpiColumns, contentPadding } = useResponsive();
  const gap = 12;

  // Build rows from kpis based on column count
  const rows: KpiData[][] = [];
  for (let i = 0; i < kpis.length; i += kpiColumns) {
    rows.push(kpis.slice(i, i + kpiColumns));
  }

  return (
    <View style={[styles.grid, { gap }]}>
      {rows.map((row, rowIdx) => (
        <View key={rowIdx} style={[styles.row, { gap }]}>
          {row.map((kpi) => (
            <KpiCard key={kpi.id} kpi={kpi} />
          ))}
          {/* Fill remaining empty cells */}
          {row.length < kpiColumns &&
            Array.from({ length: kpiColumns - row.length }).map((_, i) => (
              <View key={`empty-${i}`} style={styles.empty} />
            ))}
        </View>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  grid: { width: '100%' },
  row: { flexDirection: 'row' },
  empty: { flex: 1 },
});
