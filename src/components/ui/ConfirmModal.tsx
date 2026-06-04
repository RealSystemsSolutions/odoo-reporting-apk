import React from 'react';
import { Modal, View, StyleSheet, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import Text from './Text';
import { useTheme } from '@/theme/ThemeContext';
import { useConfirmStore } from '@/store/confirm.store';

export default function ConfirmModal() {
  const { visible, config, _answer } = useConfirmStore();
  const { colors } = useTheme();

  if (!config) return null;

  const isDestructive = !!config.destructive;
  const accentColor = isDestructive ? '#EF4444' : colors.primary;
  const iconName = config.icon ?? (isDestructive ? 'warning-outline' : 'help-circle-outline');

  return (
    <Modal visible={visible} transparent animationType="fade" statusBarTranslucent>
      <TouchableOpacity style={styles.overlay} activeOpacity={1} onPress={() => _answer(false)}>
        <TouchableOpacity
          style={[styles.card, { backgroundColor: colors.card, borderColor: colors.cardBorder }]}
          activeOpacity={1}
        >
          {/* Icon badge */}
          <View style={[styles.iconBadge, { backgroundColor: accentColor + '18' }]}>
            <Ionicons name={iconName as any} size={32} color={accentColor} />
          </View>

          <Text style={[styles.title, { color: colors.textPrimary }]}>{config.title}</Text>
          <Text style={[styles.message, { color: colors.textSecondary }]}>{config.message}</Text>

          <View style={styles.buttons}>
            <TouchableOpacity
              style={[styles.cancelBtn, { borderColor: colors.cardBorder, backgroundColor: colors.background }]}
              onPress={() => _answer(false)}
            >
              <Text style={[styles.cancelText, { color: colors.textSecondary }]}>
                {config.cancelText ?? 'Cancel'}
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.confirmBtn, { backgroundColor: accentColor }]}
              onPress={() => _answer(true)}
            >
              <Text style={styles.confirmText}>
                {config.confirmText ?? 'Confirm'}
              </Text>
            </TouchableOpacity>
          </View>
        </TouchableOpacity>
      </TouchableOpacity>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.55)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  card: {
    width: '100%',
    borderRadius: 24,
    borderWidth: 1,
    padding: 28,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.2,
    shadowRadius: 16,
    elevation: 10,
  },
  iconBadge: {
    width: 68,
    height: 68,
    borderRadius: 34,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 18,
  },
  title: {
    fontSize: 18,
    fontWeight: '700',
    textAlign: 'center',
    marginBottom: 10,
  },
  message: {
    fontSize: 14,
    textAlign: 'center',
    lineHeight: 21,
    marginBottom: 28,
  },
  buttons: {
    flexDirection: 'row',
    gap: 12,
    width: '100%',
  },
  cancelBtn: {
    flex: 1,
    height: 50,
    borderRadius: 14,
    borderWidth: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  cancelText: {
    fontSize: 15,
    fontWeight: '600',
  },
  confirmBtn: {
    flex: 1,
    height: 50,
    borderRadius: 14,
    justifyContent: 'center',
    alignItems: 'center',
  },
  confirmText: {
    color: '#fff',
    fontSize: 15,
    fontWeight: '700',
  },
});