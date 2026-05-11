import React, { useState } from 'react';
import {
  Modal, View, StyleSheet, TouchableOpacity, FlatList,
} from 'react-native';
import Text from '@/components/ui/Text';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '@/theme/ThemeContext';
import {
  format, startOfMonth, endOfMonth, eachDayOfInterval,
  getDay, addMonths, subMonths, isSameDay, isWithinInterval,
  parseISO, isValid,
} from 'date-fns';

interface DatePickerModalProps {
  visible: boolean;
  onClose: () => void;
  onSelect: (date: string) => void; // returns 'YYYY-MM-DD'
  title?: string;
  selectedDate?: string;   // 'YYYY-MM-DD'
  rangeFrom?: string;      // for highlighting the range
  rangeTo?: string;
}

const WEEKDAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

export default function DatePickerModal({
  visible,
  onClose,
  onSelect,
  title = 'Select Date',
  selectedDate,
  rangeFrom,
  rangeTo,
}: DatePickerModalProps) {
  const { colors } = useTheme();
  const [currentMonth, setCurrentMonth] = useState(() => {
    if (selectedDate) {
      const d = parseISO(selectedDate);
      return isValid(d) ? d : new Date();
    }
    return new Date();
  });

  const goToPrev = () => setCurrentMonth(m => subMonths(m, 1));
  const goToNext = () => setCurrentMonth(m => addMonths(m, 1));

  // Build calendar grid
  const monthStart = startOfMonth(currentMonth);
  const monthEnd = endOfMonth(currentMonth);
  const days = eachDayOfInterval({ start: monthStart, end: monthEnd });

  // Pad with empty slots for the starting weekday
  const startPad = getDay(monthStart); // 0=Sun
  const cells: (Date | null)[] = [
    ...Array(startPad).fill(null),
    ...days,
  ];
  // Pad end to complete last row
  while (cells.length % 7 !== 0) cells.push(null);

  const selectedParsed = selectedDate && isValid(parseISO(selectedDate)) ? parseISO(selectedDate) : null;
  const fromParsed = rangeFrom && isValid(parseISO(rangeFrom)) ? parseISO(rangeFrom) : null;
  const toParsed = rangeTo && isValid(parseISO(rangeTo)) ? parseISO(rangeTo) : null;

  const isSelected = (d: Date) => !!selectedParsed && isSameDay(d, selectedParsed);
  const isRangeStart = (d: Date) => !!fromParsed && isSameDay(d, fromParsed);
  const isRangeEnd = (d: Date) => !!toParsed && isSameDay(d, toParsed);
  const isInRange = (d: Date) => {
    if (!fromParsed || !toParsed) return false;
    return isWithinInterval(d, { start: fromParsed, end: toParsed });
  };

  const rows: (Date | null)[][] = [];
  for (let i = 0; i < cells.length; i += 7) {
    rows.push(cells.slice(i, i + 7));
  }

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <View style={styles.overlay}>
        <View style={[styles.container, { backgroundColor: colors.card }]}>
          {/* Header */}
          <View style={[styles.header, { borderBottomColor: colors.cardBorder }]}>
            <Text style={[styles.title, { color: colors.textPrimary }]}>{title}</Text>
            <TouchableOpacity onPress={onClose} style={styles.closeBtn}>
              <Ionicons name="close" size={22} color={colors.textPrimary} />
            </TouchableOpacity>
          </View>

          {/* Month navigation */}
          <View style={styles.navRow}>
            <TouchableOpacity onPress={goToPrev} style={styles.navBtn}>
              <Ionicons name="chevron-back" size={22} color={colors.textPrimary} />
            </TouchableOpacity>
            <Text style={[styles.monthLabel, { color: colors.textPrimary }]}>
              {format(currentMonth, 'MMMM yyyy')}
            </Text>
            <TouchableOpacity onPress={goToNext} style={styles.navBtn}>
              <Ionicons name="chevron-forward" size={22} color={colors.textPrimary} />
            </TouchableOpacity>
          </View>

          {/* Weekday headers */}
          <View style={styles.weekRow}>
            {WEEKDAYS.map(d => (
              <Text key={d} style={[styles.weekDay, { color: colors.textSecondary }]}>{d}</Text>
            ))}
          </View>

          {/* Day grid */}
          {rows.map((row, ri) => (
            <View key={ri} style={styles.weekRow}>
              {row.map((day, di) => {
                if (!day) return <View key={di} style={styles.dayCell} />;

                const sel = isSelected(day);
                const rangeS = isRangeStart(day);
                const rangeE = isRangeEnd(day);
                const inRange = isInRange(day);
                const highlighted = sel || rangeS || rangeE;
                const today = isSameDay(day, new Date());

                return (
                  <TouchableOpacity
                    key={di}
                    style={[
                      styles.dayCell,
                      inRange && { backgroundColor: colors.primary + '25' },
                      highlighted && { backgroundColor: colors.primary, borderRadius: 20 },
                    ]}
                    onPress={() => {
                      onSelect(format(day, 'yyyy-MM-dd'));
                      onClose();
                    }}
                    activeOpacity={0.7}
                  >
                    <Text style={[
                      styles.dayText,
                      { color: highlighted ? '#fff' : today ? colors.primary : colors.textPrimary },
                      today && !highlighted && styles.todayText,
                    ]}>
                      {format(day, 'd')}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>
          ))}

          {/* Clear button */}
          {selectedDate && (
            <TouchableOpacity
              style={[styles.clearDate, { borderColor: colors.cardBorder }]}
              onPress={() => { onSelect(''); onClose(); }}
            >
              <Ionicons name="close-circle-outline" size={16} color={colors.textSecondary} />
              <Text style={[styles.clearDateText, { color: colors.textSecondary }]}>Clear date</Text>
            </TouchableOpacity>
          )}
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end',
  },
  container: {
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingBottom: 32,
    paddingHorizontal: 16,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 16,
    borderBottomWidth: 1,
    marginBottom: 8,
  },
  title: { fontSize: 17, fontWeight: '700' },
  closeBtn: { padding: 4 },
  navRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 8,
  },
  navBtn: { padding: 8 },
  monthLabel: { fontSize: 16, fontWeight: '700' },
  weekRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginBottom: 2,
  },
  weekDay: {
    width: 40,
    textAlign: 'center',
    fontSize: 12,
    fontWeight: '600',
    paddingVertical: 6,
  },
  dayCell: {
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 20,
  },
  dayText: { fontSize: 14, fontWeight: '500' },
  todayText: { fontWeight: '800' },
  clearDate: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    alignSelf: 'center',
    marginTop: 12,
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 20,
    borderWidth: 1,
  },
  clearDateText: { fontSize: 14 },
});
