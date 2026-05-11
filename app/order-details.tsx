import React, { useState, useEffect } from 'react';
import { View, StyleSheet, TextInput, ScrollView, TouchableOpacity, ActivityIndicator, Alert, Platform } from 'react-native';
import Text from '@/components/ui/Text';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme } from '@/theme/ThemeContext';
import { useOrdersStore } from '@/store/orders.store';
import { OdooOrder, OdooOrderLine, OdooPartner, OdooProduct } from '@/types/odoo.types';
import ClientSelectorModal from '@/components/ClientSelectorModal';
import ProductSelectorModal from '@/components/ProductSelectorModal';

export default function OrderDetailsScreen() {
  const { id, orderData } = useLocalSearchParams<{ id: string; orderData?: string }>();
  const isNew = id === 'new';
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { colors } = useTheme();

  const { createOrder, updateOrder, confirmOrder, cancelOrder, fetchOrderLines } = useOrdersStore();

  const [isLoading, setIsLoading] = useState(false);
  const [clientModalVisible, setClientModalVisible] = useState(false);
  const [productModalVisible, setProductModalVisible] = useState(false);

  const [formData, setFormData] = useState<Partial<OdooOrder>>({
    partner_id: false,
    state: 'draft',
  });
  
  const [lines, setLines] = useState<Partial<OdooOrderLine>[]>([]);
  const [deletedLineIds, setDeletedLineIds] = useState<number[]>([]);

  useEffect(() => {
    if (!isNew && orderData) {
      try {
        const order: OdooOrder = JSON.parse(orderData);
        setFormData({
          name: order.name,
          partner_id: order.partner_id,
          state: order.state,
          amount_total: order.amount_total,
          date_order: order.date_order,
          pos_receipt_number: order.pos_receipt_number,
          pos_order_type: order.pos_order_type,
          pos_table_id: order.pos_table_id,
        });

        if (order.order_line && order.order_line.length > 0) {
          loadOrderLines(order.order_line);
        }
      } catch (e) {
        console.error('Error parsing order data', e);
      }
    }
  }, [isNew, orderData]);

  const loadOrderLines = async (lineIds: number[]) => {
    setIsLoading(true);
    const loadedLines = await fetchOrderLines(lineIds);
    setLines(loadedLines);
    setIsLoading(false);
  };

  const handleClientSelect = (client: OdooPartner) => {
    setFormData(prev => ({ ...prev, partner_id: [client.id, client.name] }));
  };

  const handleProductSelect = (product: OdooProduct & { product_variant_id?: false | [number, string] | number[] }) => {
    const variantId = product.product_variant_id && Array.isArray(product.product_variant_id) 
      ? product.product_variant_id[0] 
      : product.id;
      
    setLines(prev => [
      ...prev,
      {
        product_id: [variantId, product.name],
        name: product.name,
        product_uom_qty: 1,
        price_unit: product.list_price,
        price_subtotal: product.list_price,
      }
    ]);
  };

  const handleUpdateLineQty = (index: number, delta: number) => {
    setLines(prev => {
      const newLines = [...prev];
      const line = newLines[index];
      const newQty = Math.max(1, (line.product_uom_qty || 0) + delta);
      line.product_uom_qty = newQty;
      line.price_subtotal = newQty * (line.price_unit || 0);
      return newLines;
    });
  };

  const handleRemoveLine = (index: number) => {
    setLines(prev => {
      const line = prev[index];
      if (line.id) {
        setDeletedLineIds(d => [...d, line.id!]);
      }
      const newLines = [...prev];
      newLines.splice(index, 1);
      return newLines;
    });
  };

  const calculateTotal = () => {
    return lines.reduce((acc, line) => acc + (line.price_subtotal || 0), 0);
  };

  const handleSave = async () => {
    if (!formData.partner_id) {
      Alert.alert('Error', 'Debes seleccionar un cliente');
      return;
    }
    if (lines.length === 0) {
      Alert.alert('Error', 'La orden debe tener al menos una línea');
      return;
    }

    setIsLoading(true);
    
    // Odoo ORM Commands for One2many / Many2many
    // (0, 0, values) adds a new record
    // (1, id, values) updates an existing record
    // (2, id, 0) removes the record and deletes it
    const orderLineCommands: any[] = [];
    
    deletedLineIds.forEach(lineId => {
      orderLineCommands.push([2, lineId, 0]);
    });

    lines.forEach(line => {
      if (line.id) {
        orderLineCommands.push([1, line.id, {
          product_uom_qty: line.product_uom_qty,
        }]);
      } else {
        orderLineCommands.push([0, 0, {
          product_id: line.product_id ? line.product_id[0] : false,
          name: line.name,
          product_uom_qty: line.product_uom_qty,
          price_unit: line.price_unit,
        }]);
      }
    });

    const submitData: any = {
      partner_id: formData.partner_id[0],
      order_line: orderLineCommands,
      pos_receipt_number: formData.pos_receipt_number,
      pos_order_type: formData.pos_order_type,
      pos_table_id: formData.pos_table_id,
    };

    let success = false;
    if (isNew) {
      success = (await createOrder(submitData)) !== false;
    } else {
      success = await updateOrder(Number(id), submitData);
    }
    
    setIsLoading(false);

    if (success) {
      Alert.alert('Éxito', 'Orden guardada correctamente', [
        { text: 'OK', onPress: () => router.back() }
      ]);
    } else {
      Alert.alert('Error', 'Hubo un problema al guardar la orden');
    }
  };

  const handleConfirm = async () => {
    Alert.alert(
      'Confirmar Orden',
      '¿Estás seguro que deseas confirmar esta cotización? Pasará a ser una Orden de Venta.',
      [
        { text: 'Cancelar', style: 'cancel' },
        { 
          text: 'Confirmar', 
          onPress: async () => {
            setIsLoading(true);
            const success = await confirmOrder(Number(id));
            setIsLoading(false);
            if (success) {
              setFormData(prev => ({ ...prev, state: 'sale' }));
              Alert.alert('Éxito', 'Orden confirmada');
            } else {
              Alert.alert('Error', 'No se pudo confirmar la orden');
            }
          }
        }
      ]
    );
  };

  const handleCancel = async () => {
    Alert.alert(
      'Cancelar Orden',
      '¿Estás seguro que deseas cancelar esta orden?',
      [
        { text: 'No', style: 'cancel' },
        { 
          text: 'Sí, Cancelar', 
          style: 'destructive',
          onPress: async () => {
            setIsLoading(true);
            const success = await cancelOrder(Number(id));
            setIsLoading(false);
            if (success) {
              setFormData(prev => ({ ...prev, state: 'cancel' }));
              Alert.alert('Éxito', 'Orden cancelada');
            }
          }
        }
      ]
    );
  };

  const total = calculateTotal();
  const readOnly = formData.state !== 'draft' && formData.state !== 'sent';

  return (
    <View style={[styles.root, { backgroundColor: colors.background }]}>
      <View style={[styles.header, { backgroundColor: colors.card, borderBottomColor: colors.cardBorder, paddingTop: insets.top + 16 }]}>
        <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
          <Ionicons name="close" size={24} color={colors.textPrimary} />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: colors.textPrimary }]}>
          {isNew ? 'Nueva Cotización' : formData.name || 'Orden'}
        </Text>
        <TouchableOpacity style={styles.saveButton} onPress={handleSave} disabled={isLoading || readOnly}>
          {isLoading ? (
            <ActivityIndicator size="small" color={colors.primary} />
          ) : (
            <Text style={[styles.saveButtonText, { color: readOnly ? colors.textSecondary : colors.primary }]}>
              {readOnly ? '' : 'Guardar'}
            </Text>
          )}
        </TouchableOpacity>
      </View>

      <ScrollView contentContainerStyle={[styles.scrollContent, { paddingBottom: insets.bottom + 100 }]}>
        
        {/* Status indicator */}
        {!isNew && (
          <View style={[styles.statusBanner, { backgroundColor: colors.card, borderColor: colors.cardBorder }]}>
            <Text style={[styles.statusText, { color: colors.textPrimary }]}>
              Estado: <Text style={{ fontWeight: '700', color: colors.primary }}>
                {formData.state === 'draft' ? 'Borrador' : 
                 formData.state === 'sent' ? 'Enviado' : 
                 formData.state === 'sale' ? 'Orden de Venta' : 
                 formData.state === 'done' ? 'Realizado' : 'Cancelado'}
              </Text>
            </Text>
            {formData.date_order && (
              <Text style={{ color: colors.textSecondary, fontSize: 13, marginTop: 4 }}>
                <Ionicons name="calendar-outline" size={12} color={colors.textSecondary} /> {formData.date_order.substring(0, 10)}
                <Text>  </Text>
                <Ionicons name="time-outline" size={12} color={colors.textSecondary} /> {formData.date_order.substring(11, 16)}
              </Text>
            )}
          </View>
        )}

        <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.cardBorder }]}>
          <Text style={[styles.sectionTitle, { color: colors.textSecondary }]}>Cliente</Text>
          
          <TouchableOpacity 
            style={[styles.clientSelector, { backgroundColor: colors.background, borderColor: colors.cardBorder }]}
            onPress={() => setClientModalVisible(true)}
            disabled={readOnly}
          >
            <View style={styles.clientInfo}>
              <Ionicons name="person-circle-outline" size={32} color={colors.primary} />
              <Text style={[styles.clientName, { color: formData.partner_id ? colors.textPrimary : colors.textSecondary }]}>
                {formData.partner_id ? formData.partner_id[1] : 'Toca para seleccionar cliente'}
              </Text>
            </View>
            {!readOnly && <Ionicons name="chevron-forward" size={20} color={colors.textSecondary} />}
          </TouchableOpacity>
        </View>

        <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.cardBorder }]}>
          <Text style={[styles.sectionTitle, { color: colors.textSecondary }]}>Información POS</Text>
          
          <View style={{ gap: 12 }}>
            <View>
              <Text style={{ color: colors.textSecondary, marginBottom: 4, fontSize: 13 }}>Número de Recibo</Text>
              <TextInput
                style={[styles.textInput, { color: colors.textPrimary, borderColor: colors.cardBorder, backgroundColor: colors.background }]}
                value={formData.pos_receipt_number || ''}
                onChangeText={(text) => setFormData(prev => ({ ...prev, pos_receipt_number: text }))}
                placeholder="Ej. TICKET-123"
                placeholderTextColor={colors.textSecondary}
                editable={!readOnly}
              />
            </View>
            <View style={{ flexDirection: 'row', gap: 12 }}>
              <View style={{ flex: 1 }}>
                <Text style={{ color: colors.textSecondary, marginBottom: 4, fontSize: 13 }}>Tipo de Orden</Text>
                <TextInput
                  style={[styles.textInput, { color: colors.textPrimary, borderColor: colors.cardBorder, backgroundColor: colors.background }]}
                  value={formData.pos_order_type || ''}
                  onChangeText={(text) => setFormData(prev => ({ ...prev, pos_order_type: text }))}
                  placeholder="Ej. Para llevar"
                  placeholderTextColor={colors.textSecondary}
                  editable={!readOnly}
                />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={{ color: colors.textSecondary, marginBottom: 4, fontSize: 13 }}>Mesa</Text>
                <TextInput
                  style={[styles.textInput, { color: colors.textPrimary, borderColor: colors.cardBorder, backgroundColor: colors.background }]}
                  value={formData.pos_table_id || ''}
                  onChangeText={(text) => setFormData(prev => ({ ...prev, pos_table_id: text }))}
                  placeholder="Ej. Mesa 4"
                  placeholderTextColor={colors.textSecondary}
                  editable={!readOnly}
                />
              </View>
            </View>
          </View>
        </View>

        <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.cardBorder }]}>
          <View style={styles.linesHeader}>
            <Text style={[styles.sectionTitle, { color: colors.textSecondary }]}>Líneas de Pedido</Text>
            {!readOnly && (
              <TouchableOpacity onPress={() => setProductModalVisible(true)}>
                <Text style={{ color: colors.primary, fontWeight: '600' }}>+ Agregar</Text>
              </TouchableOpacity>
            )}
          </View>

          {lines.length === 0 ? (
            <View style={styles.emptyLines}>
              <Ionicons name="cart-outline" size={32} color={colors.cardBorder} />
              <Text style={{ color: colors.textSecondary, marginTop: 8 }}>No hay productos en la orden</Text>
            </View>
          ) : (
            <View style={styles.linesList}>
              {lines.map((line, index) => (
                <View key={index} style={[styles.lineItem, { borderBottomColor: colors.cardBorder }]}>
                  <View style={styles.lineInfo}>
                    <Text style={[styles.lineName, { color: colors.textPrimary }]} numberOfLines={2}>
                      {line.name}
                    </Text>
                    <Text style={{ color: colors.textSecondary, fontSize: 13, marginTop: 2 }}>
                      Precio: ${line.price_unit?.toFixed(2)}
                    </Text>
                  </View>
                  
                  <View style={styles.lineActions}>
                    {!readOnly ? (
                      <View style={styles.qtyControl}>
                        <TouchableOpacity onPress={() => handleUpdateLineQty(index, -1)} style={[styles.qtyBtn, { backgroundColor: colors.background }]}>
                          <Ionicons name="remove" size={16} color={colors.textPrimary} />
                        </TouchableOpacity>
                        <Text style={[styles.qtyValue, { color: colors.textPrimary }]}>{line.product_uom_qty}</Text>
                        <TouchableOpacity onPress={() => handleUpdateLineQty(index, 1)} style={[styles.qtyBtn, { backgroundColor: colors.background }]}>
                          <Ionicons name="add" size={16} color={colors.textPrimary} />
                        </TouchableOpacity>
                      </View>
                    ) : (
                      <Text style={[styles.qtyValue, { color: colors.textPrimary, marginRight: 12 }]}>Cant: {line.product_uom_qty}</Text>
                    )}
                    
                    <Text style={[styles.lineTotal, { color: colors.primary }]}>
                      ${line.price_subtotal?.toFixed(2)}
                    </Text>
                    
                    {!readOnly && (
                      <TouchableOpacity onPress={() => handleRemoveLine(index)} style={styles.removeBtn}>
                        <Ionicons name="trash-outline" size={20} color="#EF4444" />
                      </TouchableOpacity>
                    )}
                  </View>
                </View>
              ))}
            </View>
          )}

          <View style={[styles.totalsContainer, { borderTopColor: colors.cardBorder }]}>
            <Text style={[styles.totalLabel, { color: colors.textPrimary }]}>Total:</Text>
            <Text style={[styles.totalAmount, { color: colors.primary }]}>${total.toFixed(2)}</Text>
          </View>
        </View>

      </ScrollView>

      {/* Action footer */}
      {!isNew && !readOnly && (
        <View style={[styles.footerActions, { backgroundColor: colors.card, borderTopColor: colors.cardBorder, paddingBottom: insets.bottom || 16 }]}>
          <TouchableOpacity 
            style={[styles.actionBtn, { backgroundColor: colors.success || '#10B981' }]} 
            onPress={handleConfirm}
          >
            <Ionicons name="checkmark-circle-outline" size={20} color="#FFF" />
            <Text style={styles.actionBtnText}>Confirmar Orden</Text>
          </TouchableOpacity>
          <TouchableOpacity 
            style={[styles.actionBtn, styles.cancelBtn, { borderColor: colors.danger || '#EF4444' }]} 
            onPress={handleCancel}
          >
            <Text style={[styles.actionBtnText, { color: colors.danger || '#EF4444' }]}>Cancelar</Text>
          </TouchableOpacity>
        </View>
      )}

      <ClientSelectorModal 
        visible={clientModalVisible} 
        onClose={() => setClientModalVisible(false)}
        onSelect={handleClientSelect}
      />

      <ProductSelectorModal 
        visible={productModalVisible} 
        onClose={() => setProductModalVisible(false)}
        onSelect={handleProductSelect}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingBottom: 16,
    borderBottomWidth: 1,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '600',
  },
  backButton: {
    padding: 4,
  },
  saveButton: {
    padding: 4,
    minWidth: 60,
    alignItems: 'flex-end',
  },
  saveButtonText: {
    fontSize: 16,
    fontWeight: '600',
  },
  scrollContent: {
    padding: 16,
    gap: 16,
  },
  statusBanner: {
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
    alignItems: 'center',
  },
  statusText: {
    fontSize: 16,
  },
  card: {
    borderRadius: 16,
    borderWidth: 1,
    padding: 16,
    gap: 16,
  },
  sectionTitle: {
    fontSize: 14,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  clientSelector: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 12,
    borderWidth: 1,
    borderRadius: 12,
  },
  clientInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  clientName: {
    fontSize: 16,
    fontWeight: '500',
  },
  textInput: {
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 15,
  },
  linesHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  emptyLines: {
    alignItems: 'center',
    paddingVertical: 20,
  },
  linesList: {
    gap: 8,
  },
  lineItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    gap: 12,
  },
  lineInfo: {
    flex: 1,
  },
  lineName: {
    fontSize: 15,
    fontWeight: '500',
  },
  lineActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  qtyControl: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  qtyBtn: {
    width: 28,
    height: 28,
    borderRadius: 14,
    justifyContent: 'center',
    alignItems: 'center',
  },
  qtyValue: {
    fontSize: 16,
    fontWeight: '600',
    minWidth: 20,
    textAlign: 'center',
  },
  lineTotal: {
    fontSize: 16,
    fontWeight: '700',
    minWidth: 60,
    textAlign: 'right',
  },
  removeBtn: {
    padding: 4,
  },
  totalsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingTop: 16,
    borderTopWidth: 1,
  },
  totalLabel: {
    fontSize: 18,
    fontWeight: '600',
  },
  totalAmount: {
    fontSize: 24,
    fontWeight: '700',
  },
  footerActions: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    flexDirection: 'row',
    padding: 16,
    borderTopWidth: 1,
    gap: 12,
  },
  actionBtn: {
    flex: 1,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 14,
    borderRadius: 12,
    gap: 8,
  },
  cancelBtn: {
    flex: 0.5,
    backgroundColor: 'transparent',
    borderWidth: 1,
  },
  actionBtnText: {
    color: '#FFF',
    fontSize: 16,
    fontWeight: '600',
  },
});
