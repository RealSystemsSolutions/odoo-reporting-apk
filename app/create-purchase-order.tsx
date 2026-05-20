import React, { useState, useCallback, useRef } from 'react';
import {
  View, StyleSheet, ScrollView, TouchableOpacity, TextInput,
  ActivityIndicator, Alert, KeyboardAvoidingView, Platform,
  Modal, FlatList, Animated,
} from 'react-native';
import Text from '@/components/ui/Text';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useTheme } from '@/theme/ThemeContext';
import { OdooPurchaseService } from '@/services/odoo.service';
import { usePurchasesStore } from '@/store/purchases.store';

// ─── Types ────────────────────────────────────────────────────────────────────

interface Vendor { id: number; name: string; }
interface Product { id: number; name: string; standard_price: number; uom_id: [number, string] | false; }
interface DraftLine { key: string; product: Product; qty: number; }

// ─── Helpers ─────────────────────────────────────────────────────────────────

const fmt = (n: number) =>
  new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(n);

function useDebounce(fn: (q: string) => void, delay = 400) {
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  return useCallback((q: string) => {
    if (timer.current) clearTimeout(timer.current);
    timer.current = setTimeout(() => fn(q), delay);
  }, [fn]);
}

// ─── Product Picker Modal ─────────────────────────────────────────────────────

interface ProductPickerProps {
  visible: boolean;
  onClose: () => void;
  onAdd: (line: DraftLine) => void;
}

function ProductPicker({ visible, onClose, onAdd }: ProductPickerProps) {
  const { colors } = useTheme();
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<Product[]>([]);
  const [searching, setSearching] = useState(false);
  const [selected, setSelected] = useState<Product | null>(null);
  const [qty, setQty] = useState(1);

  const runSearch = useCallback(async (q: string) => {
    setSearching(true);
    try {
      const res = await OdooPurchaseService.searchPurchaseProducts(q);
      setResults(res);
    } catch { setResults([]); }
    finally { setSearching(false); }
  }, []);

  const debouncedSearch = useDebounce(runSearch);

  const handleQueryChange = (q: string) => {
    setQuery(q);
    debouncedSearch(q);
  };

  const handleSelect = (p: Product) => {
    setSelected(p);
    setResults([]);
    setQuery('');
    setQty(1);
  };

  const handleConfirm = () => {
    if (!selected) return;
    onAdd({ key: `${selected.id}-${Date.now()}`, product: selected, qty });
    setSelected(null);
    setQty(1);
    onClose();
  };

  const handleClose = () => {
    setSelected(null); setQuery(''); setResults([]); setQty(1);
    onClose();
  };

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={handleClose}>
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={{ flex: 1 }}>
        <View style={styles.pickerOverlay}>
          <TouchableOpacity style={StyleSheet.absoluteFillObject} onPress={handleClose} />
          <View style={[styles.pickerSheet, { backgroundColor: colors.card }]}>
            <View style={[styles.pickerHandle, { backgroundColor: colors.cardBorder }]} />

            <Text style={[styles.pickerTitle, { color: colors.textPrimary }]}>Add Product</Text>

            {/* Search field */}
            <View style={[styles.searchBox, { backgroundColor: colors.background, borderColor: colors.cardBorder }]}>
              <Ionicons name="search-outline" size={18} color={colors.textSecondary} />
              <TextInput
                style={[styles.searchInput, { color: colors.textPrimary }]}
                placeholder="Search product..."
                placeholderTextColor={colors.placeholder}
                value={query}
                onChangeText={handleQueryChange}
                autoFocus
              />
              {searching && <ActivityIndicator size="small" color={colors.primary} />}
            </View>

            {/* Dropdown results */}
            {results.length > 0 && !selected && (
              <View style={[styles.dropdown, { backgroundColor: colors.card, borderColor: colors.cardBorder }]}>
                {results.slice(0, 6).map((p) => (
                  <TouchableOpacity
                    key={p.id}
                    style={[styles.dropdownItem, { borderBottomColor: colors.cardBorder }]}
                    onPress={() => handleSelect(p)}
                  >
                    <Text style={[styles.dropdownName, { color: colors.textPrimary }]} numberOfLines={1}>{p.name}</Text>
                    <Text style={[styles.dropdownPrice, { color: colors.primary }]}>{fmt(p.standard_price)}</Text>
                  </TouchableOpacity>
                ))}
              </View>
            )}

            {/* Selected product + stepper */}
            {selected && (
              <View style={[styles.selectedCard, { backgroundColor: colors.background, borderColor: colors.cardBorder }]}>
                <View style={{ flex: 1, marginRight: 12 }}>
                  <Text style={[styles.selectedName, { color: colors.textPrimary }]} numberOfLines={2}>{selected.name}</Text>
                  <Text style={[styles.selectedPrice, { color: colors.textSecondary }]}>
                    Cost: {fmt(selected.standard_price)} · {selected.uom_id ? selected.uom_id[1] : 'Units'}
                  </Text>
                </View>
                <TouchableOpacity onPress={() => setSelected(null)}>
                  <Ionicons name="close-circle" size={20} color={colors.textSecondary} />
                </TouchableOpacity>
              </View>
            )}

            {/* Qty stepper */}
            {selected && (
              <View style={styles.stepperRow}>
                <Text style={[styles.stepperLabel, { color: colors.textSecondary }]}>Quantity</Text>
                <View style={styles.stepper}>
                  <TouchableOpacity
                    style={[styles.stepBtn, { backgroundColor: colors.background, borderColor: colors.cardBorder }]}
                    onPress={() => setQty(q => Math.max(1, q - 1))}
                  >
                    <Ionicons name="remove" size={20} color={colors.textPrimary} />
                  </TouchableOpacity>
                  <Text style={[styles.stepQty, { color: colors.textPrimary }]}>{qty}</Text>
                  <TouchableOpacity
                    style={[styles.stepBtn, { backgroundColor: colors.background, borderColor: colors.cardBorder }]}
                    onPress={() => setQty(q => q + 1)}
                  >
                    <Ionicons name="add" size={20} color={colors.textPrimary} />
                  </TouchableOpacity>
                </View>
              </View>
            )}

            {/* Subtotal preview */}
            {selected && (
              <Text style={[styles.subtotalPreview, { color: colors.textSecondary }]}>
                Estimated: {fmt(selected.standard_price * qty)}
              </Text>
            )}

            {/* Confirm button */}
            <TouchableOpacity
              style={[styles.confirmLineBtn, { backgroundColor: selected ? colors.primary : colors.cardBorder }]}
              onPress={handleConfirm}
              disabled={!selected}
            >
              <Ionicons name="add-circle-outline" size={18} color={selected ? '#fff' : colors.textSecondary} />
              <Text style={[styles.confirmLineTxt, { color: selected ? '#fff' : colors.textSecondary }]}>
                Add to Order
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

// ─── Main Screen ──────────────────────────────────────────────────────────────

export default function CreatePurchaseOrderScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { colors } = useTheme();
  const { fetchData } = usePurchasesStore();

  // Vendor
  const [vendorQuery, setVendorQuery] = useState('');
  const [vendorResults, setVendorResults] = useState<Vendor[]>([]);
  const [vendorSearching, setVendorSearching] = useState(false);
  const [selectedVendor, setSelectedVendor] = useState<Vendor | null>(null);

  // Lines
  const [lines, setLines] = useState<DraftLine[]>([]);
  const [pickerVisible, setPickerVisible] = useState(false);

  // Submit
  const [submitting, setSubmitting] = useState(false);

  // ── Vendor search ──────────────────────────────────────────────────────────

  const searchVendors = useCallback(async (q: string) => {
    setVendorSearching(true);
    try {
      const res = await OdooPurchaseService.searchVendors(q);
      setVendorResults(res);
    } catch { setVendorResults([]); }
    finally { setVendorSearching(false); }
  }, []);

  const debouncedVendorSearch = useDebounce(searchVendors);

  const handleVendorChange = (q: string) => {
    setVendorQuery(q);
    if (q.length >= 1) debouncedVendorSearch(q);
    else setVendorResults([]);
  };

  const handleVendorSelect = (v: Vendor) => {
    setSelectedVendor(v);
    setVendorQuery('');
    setVendorResults([]);
  };

  const clearVendor = () => { setSelectedVendor(null); setVendorQuery(''); };

  // ── Lines ──────────────────────────────────────────────────────────────────

  const handleAddLine = (line: DraftLine) => setLines(prev => [...prev, line]);
  const handleRemoveLine = (key: string) => setLines(prev => prev.filter(l => l.key !== key));

  const totalEstimated = lines.reduce(
    (acc, l) => acc + l.product.standard_price * l.qty, 0,
  );

  // ── Submit ─────────────────────────────────────────────────────────────────

  const handleSubmit = async () => {
    if (!selectedVendor) {
      Alert.alert('Missing Vendor', 'Please select a vendor first.');
      return;
    }
    if (lines.length === 0) {
      Alert.alert('Empty Order', 'Add at least one product to the order.');
      return;
    }

    setSubmitting(true);
    try {
      await OdooPurchaseService.createPurchaseOrder({
        partner_id: selectedVendor.id,
        order_line: lines.map(l => ({
          product_id: l.product.id,
          product_qty: l.qty,
          price_unit: l.product.standard_price,
          name: l.product.name,
          ...(l.product.uom_id ? { product_uom: l.product.uom_id[0] } : {}),
        })),
      });

      // Refresh list and go back
      await fetchData();
      Alert.alert('RFQ Created', 'The draft purchase order was created successfully.', [
        { text: 'OK', onPress: () => router.back() },
      ]);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Unknown error';
      Alert.alert('Connection Error', `Could not create the order.\n\n${msg}`);
    } finally {
      setSubmitting(false);
    }
  };

  // ── Render ─────────────────────────────────────────────────────────────────

  return (
    <View style={[styles.root, { backgroundColor: colors.background }]}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        style={{ flex: 1 }}
        keyboardVerticalOffset={insets.top + 60}
      >
        {/* ── Header ── */}
        <View style={[styles.header, { paddingTop: insets.top + 12, backgroundColor: colors.card, borderBottomColor: colors.cardBorder }]}>
          <TouchableOpacity onPress={() => router.back()} style={styles.headerBack}>
            <Ionicons name="close" size={24} color={colors.textPrimary} />
          </TouchableOpacity>
          <Text style={[styles.headerTitle, { color: colors.textPrimary }]}>New Purchase Request</Text>
          <View style={{ width: 36 }} />
        </View>

        <ScrollView
          contentContainerStyle={[styles.scrollContent, { paddingBottom: insets.bottom + 120 }]}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          {/* ── Section: Vendor ── */}
          <Text style={[styles.sectionLabel, { color: colors.textSecondary }]}>VENDOR</Text>

          {selectedVendor ? (
            <View style={[styles.vendorCard, { backgroundColor: colors.card, borderColor: colors.primary }]}>
              <View style={[styles.vendorIconWrap, { backgroundColor: colors.primaryLight }]}>
                <Ionicons name="business-outline" size={20} color={colors.primary} />
              </View>
              <Text style={[styles.vendorCardName, { color: colors.textPrimary }]}>{selectedVendor.name}</Text>
              <TouchableOpacity onPress={clearVendor} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
                <Ionicons name="close-circle" size={22} color={colors.textSecondary} />
              </TouchableOpacity>
            </View>
          ) : (
            <View>
              <View style={[styles.searchBox, { backgroundColor: colors.card, borderColor: colors.cardBorder }]}>
                <Ionicons name="search-outline" size={18} color={colors.textSecondary} />
                <TextInput
                  style={[styles.searchInput, { color: colors.textPrimary }]}
                  placeholder="Type vendor name..."
                  placeholderTextColor={colors.placeholder}
                  value={vendorQuery}
                  onChangeText={handleVendorChange}
                  returnKeyType="search"
                />
                {vendorSearching && <ActivityIndicator size="small" color={colors.primary} />}
              </View>

              {vendorResults.length > 0 && (
                <View style={[styles.dropdown, { backgroundColor: colors.card, borderColor: colors.cardBorder }]}>
                  {vendorResults.map((v) => (
                    <TouchableOpacity
                      key={v.id}
                      style={[styles.dropdownItem, { borderBottomColor: colors.cardBorder }]}
                      onPress={() => handleVendorSelect(v)}
                    >
                      <Ionicons name="person-outline" size={16} color={colors.textSecondary} style={{ marginRight: 8 }} />
                      <Text style={[styles.dropdownName, { color: colors.textPrimary }]}>{v.name}</Text>
                    </TouchableOpacity>
                  ))}
                </View>
              )}
            </View>
          )}

          {/* ── Section: Products ── */}
          <View style={styles.productHeader}>
            <Text style={[styles.sectionLabel, { color: colors.textSecondary }]}>ORDER LINES</Text>
            <TouchableOpacity
              style={[styles.addProductBtn, { borderColor: colors.primary }]}
              onPress={() => setPickerVisible(true)}
            >
              <Ionicons name="add" size={16} color={colors.primary} />
              <Text style={[styles.addProductTxt, { color: colors.primary }]}>Add Product</Text>
            </TouchableOpacity>
          </View>

          {lines.length === 0 ? (
            <TouchableOpacity
              style={[styles.emptyLines, { borderColor: colors.cardBorder }]}
              onPress={() => setPickerVisible(true)}
            >
              <Ionicons name="cart-outline" size={36} color={colors.cardBorder} />
              <Text style={[styles.emptyLinesTxt, { color: colors.textSecondary }]}>
                Tap to add your first product
              </Text>
            </TouchableOpacity>
          ) : (
            <View style={[styles.linesCard, { backgroundColor: colors.card, borderColor: colors.cardBorder }]}>
              {lines.map((line, idx) => (
                <View
                  key={line.key}
                  style={[
                    styles.lineRow,
                    idx > 0 && { borderTopWidth: 1, borderTopColor: colors.cardBorder },
                  ]}
                >
                  <View style={{ flex: 1, marginRight: 10 }}>
                    <Text style={[styles.lineName, { color: colors.textPrimary }]} numberOfLines={2}>
                      {line.product.name}
                    </Text>
                    <Text style={[styles.lineMeta, { color: colors.textSecondary }]}>
                      {line.qty} {line.product.uom_id ? line.product.uom_id[1] : 'u.'} × {fmt(line.product.standard_price)}
                    </Text>
                  </View>
                  <Text style={[styles.lineSubtotal, { color: colors.textPrimary }]}>
                    {fmt(line.product.standard_price * line.qty)}
                  </Text>
                  <TouchableOpacity
                    onPress={() => handleRemoveLine(line.key)}
                    style={styles.trashBtn}
                    hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                  >
                    <Ionicons name="trash-outline" size={18} color="#EF4444" />
                  </TouchableOpacity>
                </View>
              ))}
            </View>
          )}
        </ScrollView>

        {/* ── Sticky Footer ── */}
        <View style={[styles.footer, { backgroundColor: colors.card, borderTopColor: colors.cardBorder, paddingBottom: insets.bottom + 12 }]}>
          <View style={styles.footerTotal}>
            <Text style={[styles.footerTotalLabel, { color: colors.textSecondary }]}>Estimated Total</Text>
            <Text style={[styles.footerTotalValue, { color: colors.textPrimary }]}>{fmt(totalEstimated)}</Text>
          </View>
          <TouchableOpacity
            style={[styles.submitBtn, { backgroundColor: submitting ? colors.primaryLight : colors.primary }]}
            onPress={handleSubmit}
            disabled={submitting}
            activeOpacity={0.8}
          >
            {submitting ? (
              <ActivityIndicator size="small" color={colors.primary} />
            ) : (
              <>
                <Ionicons name="document-text-outline" size={18} color="#fff" />
                <Text style={styles.submitTxt}>Generate Draft (RFQ)</Text>
              </>
            )}
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>

      <ProductPicker
        visible={pickerVisible}
        onClose={() => setPickerVisible(false)}
        onAdd={handleAddLine}
      />
    </View>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  root: { flex: 1 },

  // Header
  header: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 16, paddingBottom: 14, borderBottomWidth: 1,
  },
  headerBack: { width: 36, alignItems: 'flex-start' },
  headerTitle: { fontSize: 17, fontWeight: '700' },

  // Content
  scrollContent: { paddingHorizontal: 16, paddingTop: 20, gap: 10 },

  sectionLabel: { fontSize: 11, fontWeight: '700', letterSpacing: 0.6, marginBottom: 6, marginTop: 8 },

  // Vendor
  vendorCard: {
    flexDirection: 'row', alignItems: 'center', gap: 12,
    borderRadius: 14, borderWidth: 1.5, padding: 14,
  },
  vendorIconWrap: { width: 38, height: 38, borderRadius: 10, alignItems: 'center', justifyContent: 'center' },
  vendorCardName: { flex: 1, fontSize: 15, fontWeight: '600' },

  // Search
  searchBox: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    borderRadius: 12, borderWidth: 1, paddingHorizontal: 12, height: 48,
  },
  searchInput: { flex: 1, fontSize: 15 },

  // Dropdown
  dropdown: {
    borderRadius: 12, borderWidth: 1, marginTop: 4,
    overflow: 'hidden',
    ...Platform.select({
      ios: { shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.1, shadowRadius: 8 },
      android: { elevation: 4 },
    }),
  },
  dropdownItem: {
    flexDirection: 'row', alignItems: 'center',
    paddingHorizontal: 14, paddingVertical: 12, borderBottomWidth: 1,
  },
  dropdownName: { flex: 1, fontSize: 14, fontWeight: '500' },
  dropdownPrice: { fontSize: 13, fontWeight: '600' },

  // Product header row
  productHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  addProductBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 4,
    borderRadius: 8, borderWidth: 1.5, paddingHorizontal: 10, paddingVertical: 5,
  },
  addProductTxt: { fontSize: 13, fontWeight: '600' },

  // Empty
  emptyLines: {
    borderRadius: 14, borderWidth: 1.5, borderStyle: 'dashed',
    paddingVertical: 32, alignItems: 'center', gap: 8,
  },
  emptyLinesTxt: { fontSize: 14 },

  // Lines card
  linesCard: { borderRadius: 14, borderWidth: 1, overflow: 'hidden' },
  lineRow: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 14, paddingVertical: 12 },
  lineName: { fontSize: 14, fontWeight: '600' },
  lineMeta: { fontSize: 12, marginTop: 2 },
  lineSubtotal: { fontSize: 14, fontWeight: '700', marginRight: 10 },
  trashBtn: { padding: 2 },

  // Footer
  footer: { borderTopWidth: 1, paddingHorizontal: 16, paddingTop: 12, gap: 10 },
  footerTotal: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  footerTotalLabel: { fontSize: 13, fontWeight: '500' },
  footerTotalValue: { fontSize: 22, fontWeight: '800' },
  submitBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    gap: 8, borderRadius: 14, paddingVertical: 15,
  },
  submitTxt: { color: '#fff', fontSize: 16, fontWeight: '700' },

  // Picker sheet
  pickerOverlay: { flex: 1, justifyContent: 'flex-end', backgroundColor: 'rgba(0,0,0,0.4)' },
  pickerSheet: {
    borderTopLeftRadius: 24, borderTopRightRadius: 24,
    padding: 20, paddingTop: 12, gap: 12,
    ...Platform.select({
      ios: { shadowColor: '#000', shadowOffset: { width: 0, height: -4 }, shadowOpacity: 0.12, shadowRadius: 16 },
      android: { elevation: 16 },
    }),
  },
  pickerHandle: { width: 40, height: 4, borderRadius: 2, alignSelf: 'center', marginBottom: 6 },
  pickerTitle: { fontSize: 17, fontWeight: '700' },

  // Picker selection
  selectedCard: {
    flexDirection: 'row', alignItems: 'center',
    borderRadius: 12, borderWidth: 1, padding: 12,
  },
  selectedName: { fontSize: 14, fontWeight: '600' },
  selectedPrice: { fontSize: 12, marginTop: 2 },
  stepperRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  stepperLabel: { fontSize: 14, fontWeight: '600' },
  stepper: { flexDirection: 'row', alignItems: 'center', gap: 0 },
  stepBtn: {
    width: 48, height: 48, borderRadius: 12, borderWidth: 1,
    alignItems: 'center', justifyContent: 'center',
  },
  stepQty: { width: 60, textAlign: 'center', fontSize: 22, fontWeight: '800' },
  subtotalPreview: { fontSize: 13, textAlign: 'center' },
  confirmLineBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    gap: 8, borderRadius: 12, paddingVertical: 14,
  },
  confirmLineTxt: { fontSize: 15, fontWeight: '700' },
});
