import React, { useEffect, useCallback, useRef, useState } from 'react';
import { useRouter } from 'expo-router';
import {
  View,
  StyleSheet,
  FlatList,
  RefreshControl,
  TouchableOpacity,
  ActivityIndicator,
  Platform,
  Modal,
  ScrollView,
  Alert,
  TextInput,
  KeyboardAvoidingView,
  Keyboard,
} from 'react-native';
import Text from '@/components/ui/Text';
import Logo from '@/components/ui/Logo';
import { formatOdooDate, formatOdooDateTime } from '@/utils/dateUtils';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '@/theme/ThemeContext';
import { usePurchasesStore } from '@/store/purchases.store';
import { OdooPurchaseService } from '@/services/odoo.service';
import type {
  OdooPurchaseOrder,
  OdooPurchaseOrderLine,
  OdooStockPicking,
  OdooAccountMove,
  OdooMailMessage,
  LineOrmCommand,
  PurchaseOrderState,
} from '@/types/purchase.types';

// ─── Helpers ──────────────────────────────────────────────────────────────────

function fmt(value: number): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 2,
  }).format(value);
}

function stripHtml(html: string): string {
  return html
    .replace(/<br\s*\/?>/gi, '\n')
    .replace(/<p>/gi, '')
    .replace(/<\/p>/gi, '\n')
    .replace(/<[^>]+>/g, '')
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
}

function useDebounce(fn: (q: string) => void, delay = 400) {
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  return useCallback(
    (q: string) => {
      if (timer.current) clearTimeout(timer.current);
      timer.current = setTimeout(() => fn(q), delay);
    },
    [fn],
  );
}

// ─── State badge config ────────────────────────────────────────────────────────

interface BadgeConfig {
  label: string;
  color: string;
  bg: string;
}

function getStateBadge(state: PurchaseOrderState): BadgeConfig {
  switch (state) {
    case 'draft':
      return { label: 'RFQ', color: '#6B7280', bg: 'rgba(107,114,128,0.12)' };
    case 'sent':
      return { label: 'Awaiting', color: '#F59E0B', bg: 'rgba(245,158,11,0.12)' };
    case 'purchase':
      return { label: 'Confirmed', color: '#10B981', bg: 'rgba(16,185,129,0.12)' };
    case 'done':
      return { label: 'Locked', color: '#3B82F6', bg: 'rgba(59,130,246,0.12)' };
    case 'cancel':
      return { label: 'Cancelled', color: '#EF4444', bg: 'rgba(239,68,68,0.12)' };
    default:
      return { label: state, color: '#6B7280', bg: 'rgba(107,114,128,0.12)' };
  }
}

function getPickingStateBadge(state: OdooStockPicking['state']): BadgeConfig {
  switch (state) {
    case 'done':
      return { label: 'Done', color: '#10B981', bg: 'rgba(16,185,129,0.12)' };
    case 'assigned':
      return { label: 'Ready', color: '#3B82F6', bg: 'rgba(59,130,246,0.12)' };
    case 'cancel':
      return { label: 'Cancelled', color: '#EF4444', bg: 'rgba(239,68,68,0.12)' };
    default:
      return { label: 'Pending', color: '#F59E0B', bg: 'rgba(245,158,11,0.12)' };
  }
}

function getInvoiceStateBadge(state: OdooAccountMove['state'], payment: string): BadgeConfig {
  if (payment === 'paid') return { label: 'Paid', color: '#10B981', bg: 'rgba(16,185,129,0.12)' };
  if (state === 'posted') return { label: 'Posted', color: '#3B82F6', bg: 'rgba(59,130,246,0.12)' };
  if (state === 'cancel') return { label: 'Cancelled', color: '#EF4444', bg: 'rgba(239,68,68,0.12)' };
  return { label: 'Draft', color: '#6B7280', bg: 'rgba(107,114,128,0.12)' };
}

// ─── Local types for edit mode ─────────────────────────────────────────────────

interface EditableLine {
  key: string;
  id: number | null;
  product_id: number;
  product_name: string;
  uom_id: number | null;
  uom_label: string;
  qty: number;
  price_unit: number;
  isNew: boolean;
  deleted: boolean;
}

interface PickerProduct {
  id: number;
  name: string;
  standard_price: number;
  uom_id: [number, string] | false;
}

// ─── Sub-components ────────────────────────────────────────────────────────────

interface KpiCardProps {
  icon: React.ComponentProps<typeof Ionicons>['name'];
  label: string;
  value: string;
  accentColor: string;
  subLabel?: string;
}

function KpiCard({ icon, label, value, accentColor, subLabel }: KpiCardProps) {
  const { colors } = useTheme();
  return (
    <View style={[styles.kpiCard, { backgroundColor: colors.card, borderColor: colors.cardBorder }]}>
      <View style={[styles.kpiIconWrap, { backgroundColor: accentColor + '18' }]}>
        <Ionicons name={icon} size={22} color={accentColor} />
      </View>
      <Text style={[styles.kpiLabel, { color: colors.textSecondary }]}>{label}</Text>
      <Text style={[styles.kpiValue, { color: colors.textPrimary }]}>{value}</Text>
      {subLabel ? (
        <Text style={[styles.kpiSub, { color: colors.textSecondary }]}>{subLabel}</Text>
      ) : null}
    </View>
  );
}

interface PurchaseCardProps {
  item: OdooPurchaseOrder;
  onPress: () => void;
}

function PurchaseCard({ item, onPress }: PurchaseCardProps) {
  const { colors } = useTheme();
  const badge = getStateBadge(item.state);
  const supplierName = item.partner_id ? item.partner_id[1] : 'Unknown Supplier';

  return (
    <TouchableOpacity
      style={[styles.card, { backgroundColor: colors.card, borderColor: colors.cardBorder }]}
      onPress={onPress}
      activeOpacity={0.72}
    >
      <View style={styles.cardTop}>
        <View style={{ flex: 1, marginRight: 10 }}>
          <Text style={[styles.supplierName, { color: colors.textPrimary }]} numberOfLines={1}>
            {supplierName}
          </Text>
          <Text style={[styles.poRef, { color: colors.textSecondary }]}>{item.name}</Text>
        </View>
        <View style={[styles.badge, { backgroundColor: badge.bg }]}>
          <Text style={[styles.badgeText, { color: badge.color }]}>{badge.label}</Text>
        </View>
      </View>

      <View style={styles.cardMid}>
        <Ionicons name="calendar-outline" size={13} color={colors.textSecondary} />
        <Text style={[styles.cardMidText, { color: colors.textSecondary }]}>
          {formatOdooDate(item.date_order)}
        </Text>
        <Text style={[styles.cardMidDot, { color: colors.cardBorder }]}>·</Text>
        <Text style={[styles.cardMidText, { color: colors.textSecondary }]}>
          {item.order_line.length} {item.order_line.length === 1 ? 'item' : 'items'}
        </Text>
      </View>

      <View style={[styles.cardBottom, { borderTopColor: colors.cardBorder }]}>
        <Text style={[styles.cardTotalLabel, { color: colors.textSecondary }]}>Total</Text>
        <Text style={[styles.cardTotal, { color: colors.textPrimary }]}>
          {fmt(item.amount_total)}
        </Text>
      </View>
    </TouchableOpacity>
  );
}

// ─── Detail: Product Picker (for edit mode) ────────────────────────────────────

interface DetailProductPickerProps {
  visible: boolean;
  onClose: () => void;
  onAdd: (line: { product: PickerProduct; qty: number }) => void;
}

function DetailProductPicker({ visible, onClose, onAdd }: DetailProductPickerProps) {
  const { colors } = useTheme();
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<PickerProduct[]>([]);
  const [searching, setSearching] = useState(false);
  const [selected, setSelected] = useState<PickerProduct | null>(null);
  const [qty, setQty] = useState(1);

  const runSearch = useCallback(async (q: string) => {
    setSearching(true);
    try {
      const res = await OdooPurchaseService.searchPurchaseProducts(q);
      setResults(res);
    } catch {
      setResults([]);
    } finally {
      setSearching(false);
    }
  }, []);

  const debouncedSearch = useDebounce(runSearch);

  const handleClose = () => {
    setSelected(null);
    setQuery('');
    setResults([]);
    setQty(1);
    onClose();
  };

  const handleConfirm = () => {
    if (!selected) return;
    onAdd({ product: selected, qty });
    handleClose();
  };

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={handleClose}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={{ flex: 1 }}
      >
        <View style={styles.pickerOverlay}>
          <TouchableOpacity style={StyleSheet.absoluteFillObject} onPress={handleClose} />
          <View style={[styles.pickerSheet, { backgroundColor: colors.card }]}>
            <View style={[styles.pickerHandle, { backgroundColor: colors.cardBorder }]} />
            <Text style={[styles.pickerTitle, { color: colors.textPrimary }]}>Add Product</Text>

            <View
              style={[
                styles.searchBox,
                { backgroundColor: colors.background, borderColor: colors.cardBorder },
              ]}
            >
              <Ionicons name="search-outline" size={18} color={colors.textSecondary} />
              <TextInput
                style={[styles.searchInput, { color: colors.textPrimary }]}
                placeholder="Search product..."
                placeholderTextColor={colors.placeholder}
                value={query}
                onChangeText={(q) => {
                  setQuery(q);
                  debouncedSearch(q);
                }}
                autoFocus
              />
              {searching && <ActivityIndicator size="small" color={colors.primary} />}
            </View>

            {results.length > 0 && !selected && (
              <View
                style={[
                  styles.dropdown,
                  { backgroundColor: colors.card, borderColor: colors.cardBorder },
                ]}
              >
                {results.slice(0, 6).map((p) => (
                  <TouchableOpacity
                    key={p.id}
                    style={[styles.dropdownItem, { borderBottomColor: colors.cardBorder }]}
                    onPress={() => {
                      setSelected(p);
                      setResults([]);
                      setQuery('');
                    }}
                  >
                    <Text
                      style={[styles.dropdownName, { color: colors.textPrimary }]}
                      numberOfLines={1}
                    >
                      {p.name}
                    </Text>
                    <Text style={[styles.dropdownPrice, { color: colors.primary }]}>
                      {fmt(p.standard_price)}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            )}

            {selected && (
              <View
                style={[
                  styles.selectedCard,
                  { backgroundColor: colors.background, borderColor: colors.cardBorder },
                ]}
              >
                <View style={{ flex: 1, marginRight: 12 }}>
                  <Text
                    style={[styles.selectedName, { color: colors.textPrimary }]}
                    numberOfLines={2}
                  >
                    {selected.name}
                  </Text>
                  <Text style={[styles.selectedPrice, { color: colors.textSecondary }]}>
                    {fmt(selected.standard_price)} ·{' '}
                    {selected.uom_id ? selected.uom_id[1] : 'Units'}
                  </Text>
                </View>
                <TouchableOpacity onPress={() => setSelected(null)}>
                  <Ionicons name="close-circle" size={20} color={colors.textSecondary} />
                </TouchableOpacity>
              </View>
            )}

            {selected && (
              <View style={styles.stepperRow}>
                <Text style={[styles.stepperLabel, { color: colors.textSecondary }]}>
                  Quantity
                </Text>
                <View style={styles.stepper}>
                  <TouchableOpacity
                    style={[
                      styles.stepBtn,
                      { backgroundColor: colors.background, borderColor: colors.cardBorder },
                    ]}
                    onPress={() => setQty((q) => Math.max(1, q - 1))}
                  >
                    <Ionicons name="remove" size={20} color={colors.textPrimary} />
                  </TouchableOpacity>
                  <Text style={[styles.stepQty, { color: colors.textPrimary }]}>{qty}</Text>
                  <TouchableOpacity
                    style={[
                      styles.stepBtn,
                      { backgroundColor: colors.background, borderColor: colors.cardBorder },
                    ]}
                    onPress={() => setQty((q) => q + 1)}
                  >
                    <Ionicons name="add" size={20} color={colors.textPrimary} />
                  </TouchableOpacity>
                </View>
              </View>
            )}

            <TouchableOpacity
              style={[
                styles.confirmLineBtn,
                { backgroundColor: selected ? colors.primary : colors.cardBorder },
              ]}
              onPress={handleConfirm}
              disabled={!selected}
            >
              <Ionicons
                name="add-circle-outline"
                size={18}
                color={selected ? '#fff' : colors.textSecondary}
              />
              <Text
                style={[
                  styles.confirmLineTxt,
                  { color: selected ? '#fff' : colors.textSecondary },
                ]}
              >
                Add to Order
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

// ─── Detail: Action Bar ────────────────────────────────────────────────────────

interface ActionBarProps {
  state: PurchaseOrderState;
  isLoading: boolean;
  onConfirm: () => void;
  onCancel: () => void;
  onLock: () => void;
  onUnlock: () => void;
}

function ActionBar({ state, isLoading, onConfirm, onCancel, onLock, onUnlock }: ActionBarProps) {
  const { colors } = useTheme();
  const canConfirm = state === 'draft' || state === 'sent';
  const canCancel = state !== 'cancel' && state !== 'done';
  const canLock = state === 'purchase';
  const canUnlock = state === 'done';

  if (!canConfirm && !canCancel && !canLock && !canUnlock) return null;

  return (
    <View style={styles.actionBar}>
      {canConfirm && (
        <TouchableOpacity
          style={[styles.actionBtn, { backgroundColor: colors.success }]}
          onPress={onConfirm}
          disabled={isLoading}
          activeOpacity={0.8}
        >
          {isLoading ? (
            <ActivityIndicator size="small" color="#fff" />
          ) : (
            <>
              <Ionicons name="checkmark-circle-outline" size={18} color="#fff" />
              <Text style={styles.actionBtnText}>Confirm Order</Text>
            </>
          )}
        </TouchableOpacity>
      )}

      {canLock && (
        <TouchableOpacity
          style={[styles.actionBtn, { backgroundColor: '#3B82F6' }]}
          onPress={onLock}
          disabled={isLoading}
          activeOpacity={0.8}
        >
          {isLoading ? (
            <ActivityIndicator size="small" color="#fff" />
          ) : (
            <>
              <Ionicons name="lock-closed-outline" size={18} color="#fff" />
              <Text style={styles.actionBtnText}>Lock</Text>
            </>
          )}
        </TouchableOpacity>
      )}

      {canUnlock && (
        <TouchableOpacity
          style={[styles.actionBtn, { backgroundColor: '#F59E0B' }]}
          onPress={onUnlock}
          disabled={isLoading}
          activeOpacity={0.8}
        >
          {isLoading ? (
            <ActivityIndicator size="small" color="#fff" />
          ) : (
            <>
              <Ionicons name="lock-open-outline" size={18} color="#fff" />
              <Text style={styles.actionBtnText}>Unlock</Text>
            </>
          )}
        </TouchableOpacity>
      )}

      {canCancel && (
        <TouchableOpacity
          style={[
            styles.actionBtn,
            styles.actionBtnOutline,
            { borderColor: colors.danger },
          ]}
          onPress={onCancel}
          disabled={isLoading}
          activeOpacity={0.8}
        >
          <Ionicons name="close-circle-outline" size={18} color={colors.danger} />
          <Text style={[styles.actionBtnText, { color: colors.danger }]}>Cancel</Text>
        </TouchableOpacity>
      )}
    </View>
  );
}

// ─── Detail: Smart Button Row ──────────────────────────────────────────────────

interface SmartButtonRowProps {
  pickingCount: number;
  invoiceCount: number;
  onReceiptsPress: () => void;
  onInvoicesPress: () => void;
}

function SmartButtonRow({
  pickingCount,
  invoiceCount,
  onReceiptsPress,
  onInvoicesPress,
}: SmartButtonRowProps) {
  const { colors } = useTheme();
  if (pickingCount === 0 && invoiceCount === 0) return null;

  return (
    <View style={styles.smartRow}>
      {pickingCount > 0 && (
        <TouchableOpacity
          style={[styles.smartBtn, { backgroundColor: colors.card, borderColor: colors.cardBorder }]}
          onPress={onReceiptsPress}
          activeOpacity={0.75}
        >
          <View style={[styles.smartIconWrap, { backgroundColor: 'rgba(16,185,129,0.12)' }]}>
            <Ionicons name="cube-outline" size={20} color="#10B981" />
          </View>
          <Text style={[styles.smartCount, { color: colors.textPrimary }]}>{pickingCount}</Text>
          <Text style={[styles.smartLabel, { color: colors.textSecondary }]}>
            {pickingCount === 1 ? 'Receipt' : 'Receipts'}
          </Text>
        </TouchableOpacity>
      )}

      {invoiceCount > 0 && (
        <TouchableOpacity
          style={[styles.smartBtn, { backgroundColor: colors.card, borderColor: colors.cardBorder }]}
          onPress={onInvoicesPress}
          activeOpacity={0.75}
        >
          <View style={[styles.smartIconWrap, { backgroundColor: 'rgba(59,130,246,0.12)' }]}>
            <Ionicons name="document-text-outline" size={20} color="#3B82F6" />
          </View>
          <Text style={[styles.smartCount, { color: colors.textPrimary }]}>{invoiceCount}</Text>
          <Text style={[styles.smartLabel, { color: colors.textSecondary }]}>
            {invoiceCount === 1 ? 'Bill' : 'Bills'}
          </Text>
        </TouchableOpacity>
      )}
    </View>
  );
}

// ─── Detail: Tracking Tab ──────────────────────────────────────────────────────

interface TrackingTabProps {
  pickings: OdooStockPicking[];
  invoices: OdooAccountMove[];
  isLoadingPickings: boolean;
  isLoadingInvoices: boolean;
  hasPicking: boolean;
  hasInvoice: boolean;
}

function TrackingTab({
  pickings,
  invoices,
  isLoadingPickings,
  isLoadingInvoices,
  hasPicking,
  hasInvoice,
}: TrackingTabProps) {
  const { colors } = useTheme();

  return (
    <View style={{ gap: 20 }}>
      {/* Receipts */}
      {hasPicking && (
        <View>
          <Text style={[styles.tabSectionLabel, { color: colors.textSecondary }]}>RECEIPTS</Text>
          {isLoadingPickings ? (
            <View style={styles.tabLoader}>
              <ActivityIndicator size="small" color={colors.primary} />
            </View>
          ) : pickings.length === 0 ? (
            <Text style={[styles.tabEmpty, { color: colors.textSecondary }]}>
              No receipts found.
            </Text>
          ) : (
            pickings.map((p) => {
              const b = getPickingStateBadge(p.state);
              return (
                <View
                  key={p.id}
                  style={[
                    styles.trackingCard,
                    { backgroundColor: colors.card, borderColor: colors.cardBorder },
                  ]}
                >
                  <View style={{ flex: 1 }}>
                    <Text style={[styles.trackingName, { color: colors.textPrimary }]}>
                      {p.name}
                    </Text>
                    <Text style={[styles.trackingMeta, { color: colors.textSecondary }]}>
                      {p.date_done
                        ? `Done: ${formatOdooDate(p.date_done)}`
                        : p.scheduled_date
                        ? `Scheduled: ${formatOdooDate(p.scheduled_date)}`
                        : 'No date set'}
                    </Text>
                  </View>
                  <View style={[styles.badge, { backgroundColor: b.bg }]}>
                    <Text style={[styles.badgeText, { color: b.color }]}>{b.label}</Text>
                  </View>
                </View>
              );
            })
          )}
        </View>
      )}

      {/* Vendor Bills */}
      {hasInvoice && (
        <View>
          <Text style={[styles.tabSectionLabel, { color: colors.textSecondary }]}>VENDOR BILLS</Text>
          {isLoadingInvoices ? (
            <View style={styles.tabLoader}>
              <ActivityIndicator size="small" color={colors.primary} />
            </View>
          ) : invoices.length === 0 ? (
            <Text style={[styles.tabEmpty, { color: colors.textSecondary }]}>
              No bills found.
            </Text>
          ) : (
            invoices.map((inv) => {
              const b = getInvoiceStateBadge(inv.state, inv.payment_state);
              return (
                <View
                  key={inv.id}
                  style={[
                    styles.trackingCard,
                    { backgroundColor: colors.card, borderColor: colors.cardBorder },
                  ]}
                >
                  <View style={{ flex: 1 }}>
                    <Text style={[styles.trackingName, { color: colors.textPrimary }]}>
                      {inv.name}
                    </Text>
                    <Text style={[styles.trackingMeta, { color: colors.textSecondary }]}>
                      {inv.invoice_date
                        ? formatOdooDate(inv.invoice_date)
                        : 'No invoice date'}{' '}
                      · {fmt(inv.amount_total)}
                    </Text>
                  </View>
                  <View style={[styles.badge, { backgroundColor: b.bg }]}>
                    <Text style={[styles.badgeText, { color: b.color }]}>{b.label}</Text>
                  </View>
                </View>
              );
            })
          )}
        </View>
      )}

      {!hasPicking && !hasInvoice && (
        <View style={styles.tabEmptyState}>
          <Ionicons name="git-branch-outline" size={40} color={colors.cardBorder} />
          <Text style={[styles.tabEmpty, { color: colors.textSecondary }]}>
            No receipts or bills linked yet.
          </Text>
        </View>
      )}
    </View>
  );
}

// ─── Detail: Notes (Chatter) Tab ──────────────────────────────────────────────

interface NotesTabProps {
  messages: OdooMailMessage[];
  isLoadingMessages: boolean;
  isPostingMessage: boolean;
  noteText: string;
  onNoteChange: (text: string) => void;
  onPostNote: () => void;
}

function NotesTab({
  messages,
  isLoadingMessages,
  isPostingMessage,
  noteText,
  onNoteChange,
  onPostNote,
}: NotesTabProps) {
  const { colors } = useTheme();

  return (
    <View style={{ gap: 14 }}>
      {/* Compose */}
      <View
        style={[
          styles.composeCard,
          { backgroundColor: colors.card, borderColor: colors.cardBorder },
        ]}
      >
        <TextInput
          style={[styles.composeInput, { color: colors.textPrimary }]}
          placeholder="Write an internal note..."
          placeholderTextColor={colors.placeholder}
          multiline
          value={noteText}
          onChangeText={onNoteChange}
        />
        <TouchableOpacity
          style={[
            styles.postBtn,
            {
              backgroundColor:
                noteText.trim() && !isPostingMessage ? colors.primary : colors.cardBorder,
            },
          ]}
          onPress={onPostNote}
          disabled={!noteText.trim() || isPostingMessage}
          activeOpacity={0.8}
        >
          {isPostingMessage ? (
            <ActivityIndicator size="small" color={colors.primary} />
          ) : (
            <Ionicons
              name="send"
              size={18}
              color={noteText.trim() ? '#fff' : colors.textSecondary}
            />
          )}
        </TouchableOpacity>
      </View>

      {/* Messages list */}
      {isLoadingMessages ? (
        <View style={styles.tabLoader}>
          <ActivityIndicator size="small" color={colors.primary} />
        </View>
      ) : messages.length === 0 ? (
        <View style={styles.tabEmptyState}>
          <Ionicons name="chatbubble-outline" size={40} color={colors.cardBorder} />
          <Text style={[styles.tabEmpty, { color: colors.textSecondary }]}>
            No messages yet.
          </Text>
        </View>
      ) : (
        messages.map((msg) => {
          const author = msg.author_id ? msg.author_id[1] : 'System';
          const body = stripHtml(msg.body);
          if (!body) return null;
          return (
            <View
              key={msg.id}
              style={[
                styles.messageCard,
                { backgroundColor: colors.card, borderColor: colors.cardBorder },
              ]}
            >
              <View style={styles.messageHeader}>
                <View style={[styles.avatarDot, { backgroundColor: colors.primary }]}>
                  <Text style={styles.avatarInitial}>
                    {author.charAt(0).toUpperCase()}
                  </Text>
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={[styles.messageAuthor, { color: colors.textPrimary }]}>
                    {author}
                  </Text>
                  <Text style={[styles.messageDate, { color: colors.textSecondary }]}>
                    {formatOdooDateTime(msg.date)}
                  </Text>
                </View>
              </View>
              <Text style={[styles.messageBody, { color: colors.textPrimary }]}>{body}</Text>
            </View>
          );
        })
      )}
    </View>
  );
}

// ─── Detail: Full-Screen Modal ─────────────────────────────────────────────────

type DetailTab = 'products' | 'tracking' | 'notes';

interface DetailModalProps {
  visible: boolean;
  onClose: () => void;
}

function PurchaseDetailModal({ visible, onClose }: DetailModalProps) {
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();

  const {
    selectedOrder,
    selectedOrderLines,
    isLoadingLines,
    isConfirming,
    isActionLoading,
    pickings,
    invoices,
    messages,
    isLoadingPickings,
    isLoadingInvoices,
    isLoadingMessages,
    isPostingMessage,
    confirmPurchaseOrder,
    cancelPurchaseOrder,
    lockPurchaseOrder,
    unlockPurchaseOrder,
    updatePurchaseOrder,
    fetchPickings,
    fetchInvoices,
    fetchMessages,
    postMessage,
  } = usePurchasesStore();

  const [activeTab, setActiveTab] = useState<DetailTab>('products');
  const [isEditMode, setIsEditMode] = useState(false);
  const [editLines, setEditLines] = useState<EditableLine[]>([]);
  const [isSaving, setIsSaving] = useState(false);
  const [pickerVisible, setPickerVisible] = useState(false);
  const [noteText, setNoteText] = useState('');
  const [trackingLoaded, setTrackingLoaded] = useState(false);
  const [notesLoaded, setNotesLoaded] = useState(false);

  // Reset state on modal open/close
  useEffect(() => {
    if (!visible) {
      setActiveTab('products');
      setIsEditMode(false);
      setEditLines([]);
      setNoteText('');
      setTrackingLoaded(false);
      setNotesLoaded(false);
    }
  }, [visible]);

  // Lazy-load tracking when tab activates
  useEffect(() => {
    if (activeTab === 'tracking' && selectedOrder && !trackingLoaded) {
      setTrackingLoaded(true);
      if (selectedOrder.picking_ids.length > 0) fetchPickings(selectedOrder.picking_ids);
      if (selectedOrder.invoice_ids.length > 0) fetchInvoices(selectedOrder.invoice_ids);
    }
  }, [activeTab, selectedOrder, trackingLoaded]);

  // Lazy-load messages when notes tab activates
  useEffect(() => {
    if (activeTab === 'notes' && selectedOrder && !notesLoaded) {
      setNotesLoaded(true);
      fetchMessages(selectedOrder.id);
    }
  }, [activeTab, selectedOrder, notesLoaded]);

  if (!selectedOrder) return null;

  const badge = getStateBadge(selectedOrder.state);
  const supplierName = selectedOrder.partner_id
    ? selectedOrder.partner_id[1]
    : 'Unknown Supplier';
  const isEditable = selectedOrder.state === 'draft' || selectedOrder.state === 'sent';
  const anyActionLoading = isConfirming || isActionLoading;

  // ── Edit mode helpers ──────────────────────────────────────────────────

  const enterEditMode = () => {
    setEditLines(
      selectedOrderLines.map((line) => ({
        key: `existing-${line.id}`,
        id: line.id,
        product_id: line.product_id ? line.product_id[0] : 0,
        product_name: line.product_id ? line.product_id[1] : line.name,
        uom_id: line.product_uom ? line.product_uom[0] : null,
        uom_label: line.product_uom ? line.product_uom[1] : '',
        qty: line.product_qty,
        price_unit: line.price_unit,
        isNew: false,
        deleted: false,
      })),
    );
    setIsEditMode(true);
  };

  const cancelEditMode = () => {
    setEditLines([]);
    setIsEditMode(false);
  };

  const handleSave = async () => {
    setIsSaving(true);
    try {
      const commands: LineOrmCommand[] = [];

      for (const line of editLines) {
        if (line.deleted && !line.isNew) {
          commands.push([2, line.id!, false]);
        } else if (line.isNew && !line.deleted) {
          commands.push([
            0,
            0,
            {
              product_id: line.product_id,
              product_qty: line.qty,
              price_unit: line.price_unit,
              name: line.product_name,
              ...(line.uom_id ? { product_uom: line.uom_id } : {}),
            },
          ]);
        } else if (!line.isNew && !line.deleted) {
          const original = selectedOrderLines.find((l) => l.id === line.id);
          if (
            original &&
            (original.product_qty !== line.qty || original.price_unit !== line.price_unit)
          ) {
            commands.push([1, line.id!, { product_qty: line.qty, price_unit: line.price_unit }]);
          }
        }
      }

      if (commands.length === 0) {
        setIsEditMode(false);
        return;
      }

      const ok = await updatePurchaseOrder(selectedOrder.id, commands);
      if (ok) {
        setIsEditMode(false);
        setEditLines([]);
      } else {
        Alert.alert('Error', 'Could not save changes. Please try again.');
      }
    } finally {
      setIsSaving(false);
    }
  };

  // ── Action handlers ────────────────────────────────────────────────────

  const handleConfirm = () => {
    Alert.alert(
      'Confirm Purchase Order',
      `Confirm ${selectedOrder.name}? This will create a receipt and block further edits.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Confirm Order',
          onPress: async () => {
            const ok = await confirmPurchaseOrder(selectedOrder.id);
            if (!ok) Alert.alert('Error', 'Could not confirm the order. Please try again.');
            else setTrackingLoaded(false); // Reset so Tracking tab reloads
          },
        },
      ],
    );
  };

  const handleCancel = () => {
    Alert.alert(
      'Cancel Order',
      `Cancel ${selectedOrder.name}? This action may not be reversible.`,
      [
        { text: 'Keep', style: 'cancel' },
        {
          text: 'Cancel Order',
          style: 'destructive',
          onPress: async () => {
            const ok = await cancelPurchaseOrder(selectedOrder.id);
            if (!ok) Alert.alert('Error', 'Could not cancel the order.');
          },
        },
      ],
    );
  };

  const handleLock = () => {
    Alert.alert('Lock Order', 'Lock this order? No further changes will be allowed.', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Lock',
        onPress: async () => {
          const ok = await lockPurchaseOrder(selectedOrder.id);
          if (!ok) Alert.alert('Error', 'Could not lock the order.');
        },
      },
    ]);
  };

  const handleUnlock = async () => {
    const ok = await unlockPurchaseOrder(selectedOrder.id);
    if (!ok) Alert.alert('Error', 'Could not unlock the order.');
  };

  const handlePostNote = async () => {
    if (!noteText.trim()) return;
    Keyboard.dismiss();
    const ok = await postMessage(selectedOrder.id, noteText.trim());
    if (ok) {
      setNoteText('');
    } else {
      Alert.alert('Error', 'Could not post the note. Please try again.');
    }
  };

  const handleAddEditLine = (item: { product: PickerProduct; qty: number }) => {
    setEditLines((prev) => [
      ...prev,
      {
        key: `new-${Date.now()}`,
        id: null,
        product_id: item.product.id,
        product_name: item.product.name,
        uom_id: item.product.uom_id ? item.product.uom_id[0] : null,
        uom_label: item.product.uom_id ? item.product.uom_id[1] : 'u.',
        qty: item.qty,
        price_unit: item.product.standard_price,
        isNew: true,
        deleted: false,
      },
    ]);
  };

  // ── Back/close logic ───────────────────────────────────────────────────
  const handleBack = () => {
    if (isEditMode) {
      Alert.alert('Discard Changes', 'Discard unsaved changes?', [
        { text: 'Keep Editing', style: 'cancel' },
        { text: 'Discard', style: 'destructive', onPress: cancelEditMode },
      ]);
    } else {
      onClose();
    }
  };

  // ── Tab content renderer ────────────────────────────────────────────────

  const renderTabContent = () => {
    if (activeTab === 'products') {
      if (isLoadingLines) {
        return (
          <View style={styles.tabLoader}>
            <ActivityIndicator size="large" color={colors.primary} />
          </View>
        );
      }

      const visibleLines = isEditMode
        ? editLines.filter((l) => !l.deleted)
        : selectedOrderLines;

      return (
        <View style={{ gap: 10 }}>
          {isEditMode && (
            <TouchableOpacity
              style={[styles.addLineBtn, { borderColor: colors.primary }]}
              onPress={() => setPickerVisible(true)}
            >
              <Ionicons name="add" size={16} color={colors.primary} />
              <Text style={[styles.addLineTxt, { color: colors.primary }]}>Add Product</Text>
            </TouchableOpacity>
          )}

          {visibleLines.length === 0 && (
            <View style={styles.tabEmptyState}>
              <Ionicons name="cart-outline" size={40} color={colors.cardBorder} />
              <Text style={[styles.tabEmpty, { color: colors.textSecondary }]}>
                No order lines.
              </Text>
            </View>
          )}

          {isEditMode
            ? editLines
                .filter((l) => !l.deleted)
                .map((line) => (
                  <View
                    key={line.key}
                    style={[
                      styles.editLineCard,
                      { backgroundColor: colors.card, borderColor: colors.cardBorder },
                    ]}
                  >
                    <View style={styles.editLineTop}>
                      <Text
                        style={[styles.lineName, { color: colors.textPrimary, flex: 1 }]}
                        numberOfLines={2}
                      >
                        {line.product_name}
                      </Text>
                      <TouchableOpacity
                        onPress={() =>
                          setEditLines((prev) =>
                            prev.map((l) =>
                              l.key === line.key ? { ...l, deleted: true } : l,
                            ),
                          )
                        }
                        hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                      >
                        <Ionicons name="trash-outline" size={18} color={colors.danger} />
                      </TouchableOpacity>
                    </View>

                    <View style={styles.editLineControls}>
                      {/* Qty */}
                      <View style={styles.editControlGroup}>
                        <Text style={[styles.editControlLabel, { color: colors.textSecondary }]}>
                          Qty {line.uom_label ? `(${line.uom_label})` : ''}
                        </Text>
                        <View style={styles.editQtyRow}>
                          <TouchableOpacity
                            style={[
                              styles.editQtyBtn,
                              { borderColor: colors.cardBorder, backgroundColor: colors.background },
                            ]}
                            onPress={() =>
                              setEditLines((prev) =>
                                prev.map((l) =>
                                  l.key === line.key
                                    ? { ...l, qty: Math.max(1, l.qty - 1) }
                                    : l,
                                ),
                              )
                            }
                          >
                            <Ionicons name="remove" size={16} color={colors.textPrimary} />
                          </TouchableOpacity>
                          <TextInput
                            style={[
                              styles.editQtyInput,
                              {
                                color: colors.textPrimary,
                                borderColor: colors.cardBorder,
                                backgroundColor: colors.background,
                              },
                            ]}
                            keyboardType="numeric"
                            value={String(line.qty)}
                            onChangeText={(v) => {
                              const n = parseFloat(v);
                              if (!isNaN(n) && n > 0) {
                                setEditLines((prev) =>
                                  prev.map((l) =>
                                    l.key === line.key ? { ...l, qty: n } : l,
                                  ),
                                );
                              }
                            }}
                            selectTextOnFocus
                          />
                          <TouchableOpacity
                            style={[
                              styles.editQtyBtn,
                              { borderColor: colors.cardBorder, backgroundColor: colors.background },
                            ]}
                            onPress={() =>
                              setEditLines((prev) =>
                                prev.map((l) =>
                                  l.key === line.key ? { ...l, qty: l.qty + 1 } : l,
                                ),
                              )
                            }
                          >
                            <Ionicons name="add" size={16} color={colors.textPrimary} />
                          </TouchableOpacity>
                        </View>
                      </View>

                      {/* Price */}
                      <View style={styles.editControlGroup}>
                        <Text style={[styles.editControlLabel, { color: colors.textSecondary }]}>
                          Unit Price
                        </Text>
                        <TextInput
                          style={[
                            styles.editPriceInput,
                            {
                              color: colors.textPrimary,
                              borderColor: colors.cardBorder,
                              backgroundColor: colors.background,
                            },
                          ]}
                          keyboardType="numeric"
                          value={String(line.price_unit)}
                          onChangeText={(v) => {
                            const n = parseFloat(v);
                            if (!isNaN(n) && n >= 0) {
                              setEditLines((prev) =>
                                prev.map((l) =>
                                  l.key === line.key ? { ...l, price_unit: n } : l,
                                ),
                              );
                            }
                          }}
                          selectTextOnFocus
                        />
                      </View>
                    </View>

                    <Text style={[styles.lineSubtotal, { color: colors.primary }]}>
                      Subtotal: {fmt(line.qty * line.price_unit)}
                    </Text>
                  </View>
                ))
            : selectedOrderLines.map((line, idx) => {
                const productName = line.product_id ? line.product_id[1] : line.name;
                const uomLabel = line.product_uom ? line.product_uom[1] : '';
                return (
                  <View
                    key={line.id}
                    style={[
                      styles.lineCard,
                      { backgroundColor: colors.card, borderColor: colors.cardBorder },
                    ]}
                  >
                    <View style={{ flex: 1, marginRight: 12 }}>
                      <Text
                        style={[styles.lineName, { color: colors.textPrimary }]}
                        numberOfLines={2}
                      >
                        {productName}
                      </Text>
                      <Text style={[styles.lineQty, { color: colors.textSecondary }]}>
                        {line.product_qty} {uomLabel} × {fmt(line.price_unit)}
                      </Text>
                    </View>
                    <Text style={[styles.lineSubtotalRight, { color: colors.textPrimary }]}>
                      {fmt(line.price_subtotal)}
                    </Text>
                  </View>
                );
              })}
        </View>
      );
    }

    if (activeTab === 'tracking') {
      return (
        <TrackingTab
          pickings={pickings}
          invoices={invoices}
          isLoadingPickings={isLoadingPickings}
          isLoadingInvoices={isLoadingInvoices}
          hasPicking={selectedOrder.picking_ids.length > 0}
          hasInvoice={selectedOrder.invoice_ids.length > 0}
        />
      );
    }

    if (activeTab === 'notes') {
      return (
        <NotesTab
          messages={messages}
          isLoadingMessages={isLoadingMessages}
          isPostingMessage={isPostingMessage}
          noteText={noteText}
          onNoteChange={setNoteText}
          onPostNote={handlePostNote}
        />
      );
    }

    return null;
  };

  // ── Main render ────────────────────────────────────────────────────────

  return (
    <Modal
      visible={visible}
      animationType="slide"
      onRequestClose={handleBack}
      statusBarTranslucent
    >
      <View style={[styles.detailRoot, { backgroundColor: colors.background }]}>
        {/* ── Header ── */}
        <View
          style={[
            styles.detailHeader,
            {
              paddingTop: insets.top + 8,
              backgroundColor: colors.card,
              borderBottomColor: colors.cardBorder,
            },
          ]}
        >
          <TouchableOpacity onPress={handleBack} style={styles.detailBackBtn}>
            <Ionicons
              name={isEditMode ? 'close' : 'arrow-back'}
              size={24}
              color={colors.textPrimary}
            />
          </TouchableOpacity>

          <View style={{ flex: 1, alignItems: 'center' }}>
            <Text style={[styles.detailHeaderTitle, { color: colors.textPrimary }]} numberOfLines={1}>
              {selectedOrder.name}
            </Text>
            <Text style={[styles.detailHeaderSub, { color: colors.textSecondary }]} numberOfLines={1}>
              {supplierName}
            </Text>
          </View>

          <View style={styles.detailHeaderRight}>
            {isEditable && !isEditMode && (
              <TouchableOpacity onPress={enterEditMode} style={styles.detailEditBtn}>
                <Ionicons name="create-outline" size={22} color={colors.primary} />
              </TouchableOpacity>
            )}
            {isEditMode && (
              <TouchableOpacity
                onPress={handleSave}
                disabled={isSaving}
                style={[styles.detailSaveBtn, { backgroundColor: colors.primary }]}
              >
                {isSaving ? (
                  <ActivityIndicator size="small" color="#fff" />
                ) : (
                  <Text style={styles.detailSaveTxt}>Save</Text>
                )}
              </TouchableOpacity>
            )}
          </View>
        </View>

        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
          style={{ flex: 1 }}
          keyboardVerticalOffset={insets.top + 60}
        >
          <ScrollView
            contentContainerStyle={[
              styles.detailScroll,
              { paddingBottom: insets.bottom + 32 },
            ]}
            keyboardShouldPersistTaps="handled"
            showsVerticalScrollIndicator={false}
          >
            {/* ── Status strip ── */}
            <View
              style={[
                styles.statusStrip,
                { backgroundColor: badge.bg, borderColor: badge.color + '30' },
              ]}
            >
              <View style={[styles.statusDot, { backgroundColor: badge.color }]} />
              <Text style={[styles.statusLabel, { color: badge.color }]}>{badge.label}</Text>
              {selectedOrder.date_approve && (
                <Text style={[styles.statusDate, { color: badge.color + 'AA' }]}>
                  · Approved {formatOdooDate(selectedOrder.date_approve)}
                </Text>
              )}
            </View>

            {/* ── Smart buttons ── */}
            <SmartButtonRow
              pickingCount={selectedOrder.picking_ids.length}
              invoiceCount={selectedOrder.invoice_ids.length}
              onReceiptsPress={() => setActiveTab('tracking')}
              onInvoicesPress={() => setActiveTab('tracking')}
            />

            {/* ── Action bar ── */}
            {!isEditMode && (
              <ActionBar
                state={selectedOrder.state}
                isLoading={anyActionLoading}
                onConfirm={handleConfirm}
                onCancel={handleCancel}
                onLock={handleLock}
                onUnlock={handleUnlock}
              />
            )}

            {/* ── Info card ── */}
            <View
              style={[
                styles.infoCard,
                { backgroundColor: colors.card, borderColor: colors.cardBorder },
              ]}
            >
              <View style={styles.infoRow}>
                <Ionicons name="business-outline" size={16} color={colors.textSecondary} />
                <Text style={[styles.infoLabel, { color: colors.textSecondary }]}>Vendor</Text>
                <Text style={[styles.infoValue, { color: colors.textPrimary }]} numberOfLines={1}>
                  {supplierName}
                </Text>
              </View>
              <View style={[styles.infoRow, { borderTopWidth: 1, borderTopColor: colors.cardBorder }]}>
                <Ionicons name="calendar-outline" size={16} color={colors.textSecondary} />
                <Text style={[styles.infoLabel, { color: colors.textSecondary }]}>Order Date</Text>
                <Text style={[styles.infoValue, { color: colors.textPrimary }]}>
                  {formatOdooDate(selectedOrder.date_order)}
                </Text>
              </View>
              <View
                style={[
                  styles.infoRow,
                  styles.infoRowTotal,
                  { borderTopWidth: 1, borderTopColor: colors.cardBorder },
                ]}
              >
                <Ionicons name="wallet-outline" size={16} color={colors.primary} />
                <Text style={[styles.infoLabel, { color: colors.textSecondary }]}>Total</Text>
                <Text style={[styles.infoTotalValue, { color: colors.textPrimary }]}>
                  {fmt(selectedOrder.amount_total)}
                </Text>
              </View>
            </View>

            {/* ── Tab navigation ── */}
            <View
              style={[
                styles.tabBar,
                { backgroundColor: colors.card, borderColor: colors.cardBorder },
              ]}
            >
              {(
                [
                  { key: 'products', label: 'Products', icon: 'list-outline' },
                  { key: 'tracking', label: 'Tracking', icon: 'git-branch-outline' },
                  { key: 'notes', label: 'Notes', icon: 'chatbubble-outline' },
                ] as const
              ).map((tab) => (
                <TouchableOpacity
                  key={tab.key}
                  style={[
                    styles.tabItem,
                    activeTab === tab.key && [
                      styles.tabItemActive,
                      { borderBottomColor: colors.primary },
                    ],
                  ]}
                  onPress={() => setActiveTab(tab.key)}
                >
                  <Ionicons
                    name={tab.icon}
                    size={16}
                    color={activeTab === tab.key ? colors.primary : colors.textSecondary}
                  />
                  <Text
                    style={[
                      styles.tabLabel,
                      {
                        color:
                          activeTab === tab.key ? colors.primary : colors.textSecondary,
                      },
                    ]}
                  >
                    {tab.label}
                    {tab.key === 'tracking' &&
                      (selectedOrder.picking_ids.length + selectedOrder.invoice_ids.length > 0) &&
                      ` (${selectedOrder.picking_ids.length + selectedOrder.invoice_ids.length})`}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            {/* ── Tab content ── */}
            <View style={styles.tabContent}>{renderTabContent()}</View>
          </ScrollView>
        </KeyboardAvoidingView>
      </View>

      {/* Product picker overlay for edit mode */}
      <DetailProductPicker
        visible={pickerVisible}
        onClose={() => setPickerVisible(false)}
        onAdd={handleAddEditLine}
      />
    </Modal>
  );
}

// ─── Main Screen ───────────────────────────────────────────────────────────────

export default function PurchasesScreen() {
  const insets = useSafeAreaInsets();
  const { colors } = useTheme();
  const router = useRouter();

  const { kpis, orders, isLoading, error, selectedOrder, fetchData, selectOrder, clearSelection } =
    usePurchasesStore();

  useEffect(() => {
    fetchData();
  }, []);

  const handleRefresh = useCallback(() => {
    fetchData();
  }, [fetchData]);

  const handleCardPress = useCallback(
    (order: OdooPurchaseOrder) => {
      selectOrder(order);
    },
    [selectOrder],
  );

  const renderItem = useCallback(
    ({ item }: { item: OdooPurchaseOrder }) => (
      <PurchaseCard item={item} onPress={() => handleCardPress(item)} />
    ),
    [handleCardPress],
  );

  return (
    <View style={[styles.root, { backgroundColor: colors.background }]}>
      {/* ── Header ── */}
      <View
        style={[
          styles.header,
          { paddingTop: insets.top + 12, backgroundColor: colors.background },
        ]}
      >
        <View style={styles.titleRow}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
            <Logo width={36} height={36} />
            <View>
              <Text style={[styles.title, { color: colors.textPrimary }]}>Purchases</Text>
              <Text style={[styles.titleSub, { color: colors.textSecondary }]}>
                Supply & Procurement
              </Text>
            </View>
          </View>

          <TouchableOpacity
            style={[
              styles.refreshBtn,
              { backgroundColor: colors.card, borderColor: colors.cardBorder },
            ]}
            onPress={handleRefresh}
            disabled={isLoading}
          >
            <Ionicons
              name="refresh-outline"
              size={18}
              color={isLoading ? colors.textSecondary : colors.primary}
            />
          </TouchableOpacity>
        </View>

        <View style={styles.kpiRow}>
          <KpiCard
            icon="time-outline"
            label="Pending Approval"
            value={String(kpis.pendingApprovals)}
            accentColor="#F59E0B"
            subLabel="RFQs awaiting action"
          />
          <KpiCard
            icon="wallet-outline"
            label="Committed (Month)"
            value={fmt(kpis.committedSpendThisMonth)}
            accentColor="#3B82F6"
            subLabel="Confirmed orders"
          />
        </View>
      </View>

      {/* ── Error banner ── */}
      {error ? (
        <View
          style={[
            styles.errorBanner,
            { backgroundColor: 'rgba(239,68,68,0.08)', borderColor: '#EF4444' },
          ]}
        >
          <Ionicons name="alert-circle-outline" size={16} color="#EF4444" />
          <Text style={[styles.errorText, { color: '#EF4444' }]}>{error}</Text>
        </View>
      ) : null}

      {/* ── Section header ── */}
      <View style={[styles.sectionHeaderRow, { borderBottomColor: colors.cardBorder }]}>
        <Text style={[styles.sectionTitle, { color: colors.textSecondary }]}>
          RECENT PURCHASE ORDERS
        </Text>
        <Text style={[styles.sectionCount, { color: colors.textSecondary }]}>
          {orders.length} orders
        </Text>
      </View>

      {/* ── List ── */}
      <FlatList
        data={orders}
        keyExtractor={(item) => item.id.toString()}
        renderItem={renderItem}
        contentContainerStyle={[styles.listContent, { paddingBottom: insets.bottom + 120 }]}
        refreshControl={
          <RefreshControl
            refreshing={isLoading && orders.length === 0}
            onRefresh={handleRefresh}
            tintColor={colors.primary}
          />
        }
        showsVerticalScrollIndicator={false}
        ListEmptyComponent={
          !isLoading ? (
            <View style={styles.emptyContainer}>
              <Ionicons name="cart-outline" size={60} color={colors.cardBorder} />
              <Text style={[styles.emptyText, { color: colors.textSecondary }]}>
                No purchase orders found
              </Text>
            </View>
          ) : (
            <View style={styles.emptyContainer}>
              <ActivityIndicator size="large" color={colors.primary} />
            </View>
          )
        }
      />

      {/* ── Detail modal (full-screen) ── */}
      <PurchaseDetailModal visible={selectedOrder !== null} onClose={clearSelection} />

      {/* ── FAB: New Purchase Order ── */}
      <TouchableOpacity
        style={[styles.fab, { backgroundColor: colors.primary, bottom: insets.bottom + 16 }]}
        onPress={() => router.push('/create-purchase-order' as any)}
        activeOpacity={0.85}
      >
        <Ionicons name="add" size={28} color="#fff" />
      </TouchableOpacity>
    </View>
  );
}

// ─── Styles ────────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  root: { flex: 1 },

  // Header
  header: { paddingHorizontal: 16, paddingBottom: 8 },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  title: { fontSize: 22, fontWeight: '700' },
  titleSub: { fontSize: 12, fontWeight: '500', marginTop: 1 },
  refreshBtn: {
    width: 40,
    height: 40,
    borderRadius: 12,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },

  // KPI
  kpiRow: { flexDirection: 'row', gap: 12, marginBottom: 8 },
  kpiCard: {
    flex: 1,
    borderRadius: 16,
    borderWidth: 1,
    padding: 14,
    gap: 4,
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.05,
        shadowRadius: 8,
      },
      android: { elevation: 2 },
    }),
  },
  kpiIconWrap: {
    width: 40,
    height: 40,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 4,
  },
  kpiLabel: { fontSize: 11, fontWeight: '600', letterSpacing: 0.3 },
  kpiValue: { fontSize: 20, fontWeight: '800' },
  kpiSub: { fontSize: 11, marginTop: 2 },

  // Section header
  sectionHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderBottomWidth: 1,
  },
  sectionTitle: { fontSize: 11, fontWeight: '700', letterSpacing: 0.6 },
  sectionCount: { fontSize: 12 },

  // List
  listContent: { paddingHorizontal: 16, paddingTop: 12, gap: 10 },

  // Purchase Card
  card: {
    borderRadius: 16,
    borderWidth: 1,
    padding: 14,
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.04,
        shadowRadius: 6,
      },
      android: { elevation: 1 },
    }),
  },
  cardTop: { flexDirection: 'row', alignItems: 'flex-start', marginBottom: 8 },
  supplierName: { fontSize: 15, fontWeight: '700' },
  poRef: { fontSize: 12, marginTop: 2 },
  badge: { paddingHorizontal: 9, paddingVertical: 4, borderRadius: 8 },
  badgeText: { fontSize: 11, fontWeight: '700' },
  cardMid: { flexDirection: 'row', alignItems: 'center', gap: 5, marginBottom: 10 },
  cardMidText: { fontSize: 13 },
  cardMidDot: { fontSize: 16, lineHeight: 16 },
  cardBottom: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingTop: 10,
    borderTopWidth: 1,
  },
  cardTotalLabel: { fontSize: 12, fontWeight: '500' },
  cardTotal: { fontSize: 20, fontWeight: '800' },

  // Error
  errorBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginHorizontal: 16,
    marginBottom: 8,
    padding: 10,
    borderRadius: 10,
    borderWidth: 1,
  },
  errorText: { fontSize: 13, flex: 1 },

  // Empty
  emptyContainer: { paddingTop: 80, alignItems: 'center', gap: 16 },
  emptyText: { fontSize: 15, textAlign: 'center' },

  // FAB
  fab: {
    position: 'absolute',
    right: 20,
    width: 58,
    height: 58,
    borderRadius: 29,
    alignItems: 'center',
    justifyContent: 'center',
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.28,
        shadowRadius: 10,
      },
      android: { elevation: 8 },
    }),
  },

  // ── Detail Full-Screen ──────────────────────────────────────────────────────

  detailRoot: { flex: 1 },
  detailHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingBottom: 12,
    borderBottomWidth: 1,
    gap: 8,
  },
  detailBackBtn: { width: 36, alignItems: 'flex-start' },
  detailHeaderTitle: { fontSize: 16, fontWeight: '700', textAlign: 'center' },
  detailHeaderSub: { fontSize: 12, textAlign: 'center', marginTop: 2 },
  detailHeaderRight: { width: 72, alignItems: 'flex-end' },
  detailEditBtn: { padding: 4 },
  detailSaveBtn: {
    paddingHorizontal: 14,
    paddingVertical: 7,
    borderRadius: 10,
    minWidth: 58,
    alignItems: 'center',
  },
  detailSaveTxt: { color: '#fff', fontSize: 14, fontWeight: '700' },

  detailScroll: { paddingHorizontal: 16, paddingTop: 16, gap: 14 },

  // Status strip
  statusStrip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 12,
    borderWidth: 1,
  },
  statusDot: { width: 8, height: 8, borderRadius: 4 },
  statusLabel: { fontSize: 13, fontWeight: '700' },
  statusDate: { fontSize: 12 },

  // Smart buttons
  smartRow: { flexDirection: 'row', gap: 10 },
  smartBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    borderRadius: 14,
    borderWidth: 1,
    padding: 12,
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.04,
        shadowRadius: 4,
      },
      android: { elevation: 1 },
    }),
  },
  smartIconWrap: {
    width: 36,
    height: 36,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  smartCount: { fontSize: 18, fontWeight: '800' },
  smartLabel: { fontSize: 12, fontWeight: '500' },

  // Action bar
  actionBar: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  actionBtn: {
    flex: 1,
    minWidth: 120,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 7,
    borderRadius: 12,
    paddingVertical: 13,
    paddingHorizontal: 12,
  },
  actionBtnOutline: { backgroundColor: 'transparent', borderWidth: 1.5 },
  actionBtnText: { fontSize: 14, fontWeight: '700', color: '#fff' },

  // Info card
  infoCard: { borderRadius: 16, borderWidth: 1, overflow: 'hidden' },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingHorizontal: 14,
    paddingVertical: 12,
  },
  infoRowTotal: {},
  infoLabel: { fontSize: 13, fontWeight: '500', width: 80 },
  infoValue: { flex: 1, fontSize: 14, fontWeight: '600', textAlign: 'right' },
  infoTotalValue: { flex: 1, fontSize: 20, fontWeight: '800', textAlign: 'right' },

  // Tab bar
  tabBar: {
    flexDirection: 'row',
    borderRadius: 14,
    borderWidth: 1,
    overflow: 'hidden',
  },
  tabItem: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 5,
    paddingVertical: 11,
    borderBottomWidth: 2,
    borderBottomColor: 'transparent',
  },
  tabItemActive: {},
  tabLabel: { fontSize: 12, fontWeight: '600' },
  tabContent: { gap: 10 },
  tabSectionLabel: { fontSize: 11, fontWeight: '700', letterSpacing: 0.6, marginBottom: 8 },
  tabLoader: { paddingVertical: 40, alignItems: 'center' },
  tabEmpty: { fontSize: 14, textAlign: 'center' },
  tabEmptyState: { paddingVertical: 40, alignItems: 'center', gap: 12 },

  // Lines view
  lineCard: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 12,
    borderWidth: 1,
    padding: 12,
  },
  lineName: { fontSize: 14, fontWeight: '600' },
  lineQty: { fontSize: 12, marginTop: 3 },
  lineSubtotalRight: { fontSize: 14, fontWeight: '700' },

  // Edit lines
  addLineBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    borderRadius: 10,
    borderWidth: 1.5,
    paddingVertical: 10,
  },
  addLineTxt: { fontSize: 14, fontWeight: '600' },
  editLineCard: {
    borderRadius: 12,
    borderWidth: 1,
    padding: 12,
    gap: 10,
  },
  editLineTop: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 8,
  },
  editLineControls: {
    flexDirection: 'row',
    gap: 12,
  },
  editControlGroup: { flex: 1, gap: 6 },
  editControlLabel: { fontSize: 11, fontWeight: '600', letterSpacing: 0.3 },
  editQtyRow: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  editQtyBtn: {
    width: 32,
    height: 32,
    borderRadius: 8,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  editQtyInput: {
    flex: 1,
    height: 32,
    textAlign: 'center',
    borderRadius: 8,
    borderWidth: 1,
    fontSize: 14,
    fontWeight: '700',
  },
  editPriceInput: {
    height: 32,
    borderRadius: 8,
    borderWidth: 1,
    paddingHorizontal: 8,
    fontSize: 14,
    fontWeight: '600',
  },
  lineSubtotal: { fontSize: 13, fontWeight: '700', textAlign: 'right' },

  // Tracking cards
  trackingCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    borderRadius: 12,
    borderWidth: 1,
    padding: 12,
    marginBottom: 8,
  },
  trackingName: { fontSize: 14, fontWeight: '600' },
  trackingMeta: { fontSize: 12, marginTop: 2 },

  // Chatter / Notes
  composeCard: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: 10,
    borderRadius: 14,
    borderWidth: 1,
    padding: 12,
  },
  composeInput: {
    flex: 1,
    minHeight: 44,
    maxHeight: 120,
    fontSize: 14,
    lineHeight: 20,
  },
  postBtn: {
    width: 38,
    height: 38,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  messageCard: {
    borderRadius: 12,
    borderWidth: 1,
    padding: 12,
    gap: 8,
  },
  messageHeader: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  avatarDot: {
    width: 34,
    height: 34,
    borderRadius: 17,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarInitial: { fontSize: 14, fontWeight: '800', color: '#fff' },
  messageAuthor: { fontSize: 13, fontWeight: '700' },
  messageDate: { fontSize: 11, marginTop: 1 },
  messageBody: { fontSize: 14, lineHeight: 20 },

  // Product Picker (edit mode)
  pickerOverlay: { flex: 1, justifyContent: 'flex-end', backgroundColor: 'rgba(0,0,0,0.4)' },
  pickerSheet: {
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: 20,
    paddingTop: 12,
    gap: 12,
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: -4 },
        shadowOpacity: 0.12,
        shadowRadius: 16,
      },
      android: { elevation: 16 },
    }),
  },
  pickerHandle: { width: 40, height: 4, borderRadius: 2, alignSelf: 'center', marginBottom: 6 },
  pickerTitle: { fontSize: 17, fontWeight: '700' },
  searchBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    borderRadius: 12,
    borderWidth: 1,
    paddingHorizontal: 12,
    height: 48,
  },
  searchInput: { flex: 1, fontSize: 15 },
  dropdown: {
    borderRadius: 12,
    borderWidth: 1,
    overflow: 'hidden',
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.1,
        shadowRadius: 8,
      },
      android: { elevation: 4 },
    }),
  },
  dropdownItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 14,
    paddingVertical: 12,
    borderBottomWidth: 1,
  },
  dropdownName: { flex: 1, fontSize: 14, fontWeight: '500' },
  dropdownPrice: { fontSize: 13, fontWeight: '600' },
  selectedCard: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 12,
    borderWidth: 1,
    padding: 12,
  },
  selectedName: { fontSize: 14, fontWeight: '600' },
  selectedPrice: { fontSize: 12, marginTop: 2 },
  stepperRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  stepperLabel: { fontSize: 14, fontWeight: '600' },
  stepper: { flexDirection: 'row', alignItems: 'center', gap: 0 },
  stepBtn: {
    width: 48,
    height: 48,
    borderRadius: 12,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  stepQty: { width: 60, textAlign: 'center', fontSize: 22, fontWeight: '800' },
  confirmLineBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    borderRadius: 12,
    paddingVertical: 14,
  },
  confirmLineTxt: { fontSize: 15, fontWeight: '700' },
});
