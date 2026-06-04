import { useEffect, useState } from 'react';
import {
  Modal,
  View,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Platform,
  Share,
  Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import Text from '@/components/ui/Text';
import { useLogStore, type LogEntry, type LogLevel } from '@/store/log.store';
import { useTheme } from '@/theme/ThemeContext';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { confirm } from '@/store/confirm.store';

interface Props {
  visible: boolean;
  onClose: () => void;
}

const LEVEL_COLORS: Record<LogLevel, string> = {
  info:  '#3B82F6',
  debug: '#8B5CF6',
  warn:  '#F59E0B',
  error: '#EF4444',
};

function LogRow({ entry, colors }: { entry: LogEntry; colors: ReturnType<typeof useTheme>['colors'] }) {
  const [expanded, setExpanded] = useState(false);
  const levelColor = LEVEL_COLORS[entry.level];
  const time = entry.timestamp.slice(11, 23); // HH:mm:ss.mmm

  return (
    <TouchableOpacity
      style={[styles.logRow, { borderBottomColor: colors.cardBorder }]}
      onPress={() => entry.data && setExpanded(!expanded)}
      activeOpacity={entry.data ? 0.7 : 1}
    >
      <View style={styles.logHeader}>
        <View style={[styles.levelBadge, { backgroundColor: levelColor + '20' }]}>
          <Text style={[styles.levelText, { color: levelColor }]}>{entry.level.toUpperCase()}</Text>
        </View>
        <Text style={[styles.contextText, { color: colors.textSecondary }]}>{entry.context}</Text>
        <Text style={[styles.timeText, { color: colors.textSecondary }]}>{time}</Text>
        {entry.data && (
          <Ionicons
            name={expanded ? 'chevron-up' : 'chevron-down'}
            size={14}
            color={colors.textSecondary}
          />
        )}
      </View>
      <Text style={[styles.messageText, { color: colors.textPrimary }]} numberOfLines={expanded ? undefined : 2}>
        {entry.message}
      </Text>
      {expanded && entry.data && (
        <Text style={[styles.dataText, { color: colors.textSecondary, backgroundColor: colors.background }]}>
          {JSON.stringify(entry.data, null, 2)}
        </Text>
      )}
    </TouchableOpacity>
  );
}

export default function LogsModal({ visible, onClose }: Props) {
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  const entries = useLogStore((s) => s.entries);
  const clearLogs = useLogStore((s) => s.clearLogs);
  const exportLogs = useLogStore((s) => s.exportLogs);

  const handleExport = async () => {
    const content = exportLogs();

    if (Platform.OS !== 'web') {
      try {
        await Share.share({ message: content, title: 'App Debug Logs' });
      } catch {}
      return;
    }

    // Web: try Web Share API first (works on iOS Safari)
    if (typeof navigator !== 'undefined' && (navigator as Navigator & { share?: (data: object) => Promise<void> }).share) {
      try {
        await (navigator as Navigator & { share: (data: object) => Promise<void> }).share({
          title: 'App Debug Logs',
          text: content,
        });
        return;
      } catch {}
    }

    // Web fallback: trigger file download
    try {
      const blob = new Blob([content], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `app-logs-${Date.now()}.json`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch {
      Alert.alert('Export failed', 'Could not export logs automatically.');
    }
  };

  const handleClear = async () => {
    const ok = await confirm({
      title: 'Clear Logs',
      message: 'This will permanently delete all captured logs.',
      confirmText: 'Clear',
      destructive: true,
      icon: 'trash-outline',
    });
    if (ok) clearLogs();
  };

  return (
    <Modal visible={visible} animationType="slide" presentationStyle="pageSheet" onRequestClose={onClose}>
      <View style={[styles.container, { backgroundColor: colors.background, paddingTop: insets.top + 12 }]}>
        {/* Header */}
        <View style={[styles.header, { borderBottomColor: colors.cardBorder }]}>
          <Text style={[styles.title, { color: colors.textPrimary }]}>Debug Logs</Text>
          <Text style={[styles.count, { color: colors.textSecondary }]}>{entries.length} entries</Text>
          <TouchableOpacity onPress={onClose} style={styles.closeBtn}>
            <Ionicons name="close" size={24} color={colors.textPrimary} />
          </TouchableOpacity>
        </View>

        {/* Actions */}
        <View style={[styles.actions, { borderBottomColor: colors.cardBorder }]}>
          <TouchableOpacity
            style={[styles.actionBtn, { backgroundColor: colors.primary }]}
            onPress={handleExport}
          >
            <Ionicons name="share-outline" size={16} color="#fff" />
            <Text style={styles.actionBtnText}>Export</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.actionBtn, { backgroundColor: colors.danger + 'CC' }]}
            onPress={handleClear}
          >
            <Ionicons name="trash-outline" size={16} color="#fff" />
            <Text style={styles.actionBtnText}>Clear</Text>
          </TouchableOpacity>
        </View>

        {/* Log list */}
        <ScrollView style={styles.list} contentContainerStyle={{ paddingBottom: insets.bottom + 20 }}>
          {entries.length === 0 ? (
            <View style={styles.empty}>
              <Ionicons name="document-text-outline" size={48} color={colors.textSecondary} />
              <Text style={[styles.emptyText, { color: colors.textSecondary }]}>No logs yet</Text>
            </View>
          ) : (
            [...entries].reverse().map((entry) => (
              <LogRow key={entry.id} entry={entry} colors={colors} />
            ))
          )}
        </ScrollView>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingBottom: 12,
    borderBottomWidth: 1,
    gap: 8,
  },
  title: { fontSize: 20, fontWeight: '700', flex: 1 },
  count: { fontSize: 13 },
  closeBtn: { padding: 4 },
  actions: {
    flexDirection: 'row',
    gap: 10,
    padding: 12,
    borderBottomWidth: 1,
  },
  actionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 8,
  },
  actionBtnText: { color: '#fff', fontWeight: '600', fontSize: 14 },
  list: { flex: 1 },
  logRow: {
    padding: 12,
    borderBottomWidth: 1,
    gap: 4,
  },
  logHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  levelBadge: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  levelText: { fontSize: 10, fontWeight: '700' },
  contextText: { fontSize: 11, fontWeight: '600', flex: 1 },
  timeText: { fontSize: 11 },
  messageText: { fontSize: 13, lineHeight: 18 },
  dataText: {
    fontSize: 11,
    fontFamily: 'monospace',
    padding: 8,
    borderRadius: 6,
    marginTop: 4,
  },
  empty: { alignItems: 'center', paddingTop: 80, gap: 12 },
  emptyText: { fontSize: 16 },
});
