import React, { useState, useEffect } from 'react';
import { View, StyleSheet, TextInput, ScrollView, TouchableOpacity, ActivityIndicator, Alert, Image } from 'react-native';
import Text from '@/components/ui/Text';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme } from '@/theme/ThemeContext';
import { useProductsStore } from '@/store/products.store';
import { OdooProduct } from '@/types/odoo.types';
import ScannerModal from '@/components/ScannerModal';

export default function ProductDetailsScreen() {
  const { id, productData } = useLocalSearchParams<{ id: string; productData?: string }>();
  const isNew = id === 'new';
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { colors } = useTheme();

  const { createProduct, updateProduct, archiveProduct } = useProductsStore();

  const [isLoading, setIsLoading] = useState(false);
  const [scannerVisible, setScannerVisible] = useState(false);

  const [formData, setFormData] = useState<Partial<OdooProduct>>({
    name: '',
    default_code: '',
    barcode: '',
    list_price: 0,
    standard_price: 0,
    type: 'product',
  });

  const [computedData, setComputedData] = useState<{
    qty_available: number;
    product_variant_count: number;
    image_128: string | false;
    categ_name: string;
  }>({
    qty_available: 0,
    product_variant_count: 0,
    image_128: false,
    categ_name: '',
  });

  useEffect(() => {
    if (!isNew && productData) {
      try {
        const product: OdooProduct = JSON.parse(productData);
        setFormData({
          name: product.name,
          default_code: product.default_code || '',
          barcode: product.barcode || '',
          list_price: product.list_price || 0,
          standard_price: product.standard_price || 0,
          type: product.type || 'product',
        });
        setComputedData({
          qty_available: product.qty_available || 0,
          product_variant_count: product.product_variant_count || 0,
          image_128: product.image_128 || false,
          categ_name: product.categ_id ? product.categ_id[1] : 'N/A',
        });
      } catch (e) {
        console.error('Error parsing product data', e);
      }
    }
  }, [isNew, productData]);

  const handleChange = (field: keyof OdooProduct, value: string) => {
    setFormData(prev => ({
      ...prev,
      [field]: ['list_price', 'standard_price'].includes(field) ? Number(value) || 0 : value,
    }));
  };

  const handleSave = async () => {
    if (!formData.name) {
      Alert.alert('Error', 'El nombre del producto es obligatorio');
      return;
    }

    setIsLoading(true);
    let success = false;
    
    // Clean empty strings to false for Odoo
    const submitData = { ...formData };
    if (submitData.default_code === '') submitData.default_code = false;
    if (submitData.barcode === '') submitData.barcode = false;

    if (isNew) {
      success = await createProduct(submitData);
    } else {
      success = await updateProduct(Number(id), submitData);
    }
    
    setIsLoading(false);

    if (success) {
      Alert.alert('Éxito', 'Producto guardado correctamente', [
        { text: 'OK', onPress: () => router.back() }
      ]);
    } else {
      Alert.alert('Error', 'Hubo un problema al guardar el producto');
    }
  };

  const handleDelete = () => {
    Alert.alert(
      'Confirmar Baja',
      '¿Estás seguro que deseas archivar este producto? (Se ocultará de las listas activas)',
      [
        { text: 'Cancelar', style: 'cancel' },
        { 
          text: 'Archivar', 
          style: 'destructive',
          onPress: async () => {
            setIsLoading(true);
            const success = await archiveProduct(Number(id));
            setIsLoading(false);
            if (success) {
              router.back();
            } else {
              Alert.alert('Error', 'Hubo un problema al archivar el producto');
            }
          }
        }
      ]
    );
  };

  return (
    <View style={[styles.root, { backgroundColor: colors.background }]}>
      <View style={[styles.header, { backgroundColor: colors.card, borderBottomColor: colors.cardBorder, paddingTop: insets.top + 16 }]}>
        <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
          <Ionicons name="close" size={24} color={colors.textPrimary} />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: colors.textPrimary }]}>
          {isNew ? 'Nuevo Producto' : 'Editar Producto'}
        </Text>
        <TouchableOpacity style={styles.saveButton} onPress={handleSave} disabled={isLoading}>
          {isLoading ? (
            <ActivityIndicator size="small" color={colors.primary} />
          ) : (
            <Text style={[styles.saveButtonText, { color: colors.primary }]}>Guardar</Text>
          )}
        </TouchableOpacity>
      </View>

      <ScrollView contentContainerStyle={[styles.scrollContent, { paddingBottom: insets.bottom + 20 }]}>
        {!isNew && (
          <View style={styles.imageContainer}>
            {computedData.image_128 ? (
              <Image 
                source={{ uri: `data:image/png;base64,${computedData.image_128}` }} 
                style={styles.productImage} 
              />
            ) : (
              <View style={[styles.productImage, styles.genericImageContainer, { backgroundColor: colors.card, borderColor: colors.cardBorder }]}>
                <Ionicons name="image-outline" size={48} color={colors.primary} style={{ opacity: 0.5 }} />
              </View>
            )}
          </View>
        )}

        <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.cardBorder }]}>
          <Text style={[styles.sectionTitle, { color: colors.textSecondary }]}>Información Básica</Text>
          
          <View style={styles.inputGroup}>
            <Text style={[styles.label, { color: colors.textPrimary }]}>Nombre del Producto *</Text>
            <TextInput
              style={[styles.input, { backgroundColor: colors.background, color: colors.textPrimary, borderColor: colors.cardBorder }]}
              value={formData.name}
              onChangeText={(text) => handleChange('name', text)}
              placeholder="Ej. Silla de oficina"
              placeholderTextColor={colors.textSecondary}
            />
          </View>

          <View style={styles.row}>
            <View style={[styles.inputGroup, { flex: 1 }]}>
              <Text style={[styles.label, { color: colors.textPrimary }]}>Precio de Venta</Text>
              <TextInput
                style={[styles.input, { backgroundColor: colors.background, color: colors.textPrimary, borderColor: colors.cardBorder }]}
                value={String(formData.list_price || '')}
                onChangeText={(text) => handleChange('list_price', text)}
                keyboardType="numeric"
                placeholder="0.00"
                placeholderTextColor={colors.textSecondary}
              />
            </View>
            <View style={{ width: 12 }} />
            <View style={[styles.inputGroup, { flex: 1 }]}>
              <Text style={[styles.label, { color: colors.textPrimary }]}>Costo</Text>
              <TextInput
                style={[styles.input, { backgroundColor: colors.background, color: colors.textPrimary, borderColor: colors.cardBorder }]}
                value={String(formData.standard_price || '')}
                onChangeText={(text) => handleChange('standard_price', text)}
                keyboardType="numeric"
                placeholder="0.00"
                placeholderTextColor={colors.textSecondary}
              />
            </View>
          </View>
        </View>

        <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.cardBorder }]}>
          <Text style={[styles.sectionTitle, { color: colors.textSecondary }]}>Inventario y Códigos</Text>

          <View style={styles.inputGroup}>
            <Text style={[styles.label, { color: colors.textPrimary }]}>Referencia Interna</Text>
            <TextInput
              style={[styles.input, { backgroundColor: colors.background, color: colors.textPrimary, borderColor: colors.cardBorder }]}
              value={formData.default_code as string}
              onChangeText={(text) => handleChange('default_code', text)}
              placeholder="Ej. REF-001"
              placeholderTextColor={colors.textSecondary}
            />
          </View>

          <View style={styles.inputGroup}>
            <Text style={[styles.label, { color: colors.textPrimary }]}>Código de Barras</Text>
            <View style={styles.barcodeContainer}>
              <TextInput
                style={[styles.input, styles.barcodeInput, { backgroundColor: colors.background, color: colors.textPrimary, borderColor: colors.cardBorder }]}
                value={formData.barcode as string}
                onChangeText={(text) => handleChange('barcode', text)}
                placeholder="Escanea o ingresa..."
                placeholderTextColor={colors.textSecondary}
              />
              <TouchableOpacity 
                style={[styles.scanButton, { backgroundColor: colors.primary }]}
                onPress={() => setScannerVisible(true)}
              >
                <Ionicons name="barcode-outline" size={24} color="#FFF" />
              </TouchableOpacity>
            </View>
          </View>

          <View style={styles.inputGroup}>
            <Text style={[styles.label, { color: colors.textPrimary }]}>Tipo de Producto</Text>
            <View style={[styles.segmentedControl, { backgroundColor: colors.background, borderColor: colors.cardBorder }]}>
              <TouchableOpacity 
                style={[styles.segment, formData.type === 'product' && { backgroundColor: colors.primary }]} 
                onPress={() => handleChange('type', 'product')}
              >
                <Text style={[styles.segmentText, { color: formData.type === 'product' ? '#FFF' : colors.textPrimary }]}>Almacenable</Text>
              </TouchableOpacity>
              <TouchableOpacity 
                style={[styles.segment, formData.type === 'consu' && { backgroundColor: colors.primary }]} 
                onPress={() => handleChange('type', 'consu')}
              >
                <Text style={[styles.segmentText, { color: formData.type === 'consu' ? '#FFF' : colors.textPrimary }]}>Consumible</Text>
              </TouchableOpacity>
              <TouchableOpacity 
                style={[styles.segment, formData.type === 'service' && { backgroundColor: colors.primary }]} 
                onPress={() => handleChange('type', 'service')}
              >
                <Text style={[styles.segmentText, { color: formData.type === 'service' ? '#FFF' : colors.textPrimary }]}>Servicio</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>

        {!isNew && (
          <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.cardBorder }]}>
            <Text style={[styles.sectionTitle, { color: colors.textSecondary }]}>Información Calculada (Solo Lectura)</Text>
            
            <View style={styles.row}>
              <View style={styles.infoBox}>
                <Text style={[styles.infoLabel, { color: colors.textSecondary }]}>Cantidad a Mano</Text>
                <Text style={[styles.infoValue, { color: colors.textPrimary }]}>{computedData.qty_available}</Text>
              </View>
              <View style={styles.infoBox}>
                <Text style={[styles.infoLabel, { color: colors.textSecondary }]}>Variantes</Text>
                <Text style={[styles.infoValue, { color: colors.textPrimary }]}>{computedData.product_variant_count}</Text>
              </View>
            </View>

            <View style={[styles.infoBox, { marginTop: 12 }]}>
              <Text style={[styles.infoLabel, { color: colors.textSecondary }]}>Categoría</Text>
              <Text style={[styles.infoValue, { color: colors.textPrimary }]}>{computedData.categ_name}</Text>
            </View>
          </View>
        )}

        {!isNew && (
          <TouchableOpacity 
            style={[styles.deleteButton, { borderColor: '#EF4444' }]} 
            onPress={handleDelete}
          >
            <Ionicons name="archive-outline" size={20} color="#EF4444" style={{ marginRight: 8 }} />
            <Text style={styles.deleteButtonText}>Archivar Producto</Text>
          </TouchableOpacity>
        )}

      </ScrollView>

      <ScannerModal 
        visible={scannerVisible} 
        onClose={() => setScannerVisible(false)}
        onScan={(data) => {
          handleChange('barcode', data);
        }}
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
  imageContainer: {
    alignItems: 'center',
    marginBottom: 8,
  },
  productImage: {
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: '#E5E7EB',
  },
  genericImageContainer: {
    borderWidth: 1,
    justifyContent: 'center',
    alignItems: 'center',
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
  inputGroup: {
    gap: 8,
  },
  label: {
    fontSize: 14,
    fontWeight: '500',
  },
  input: {
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: 12,
    height: 44,
    fontSize: 16,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  barcodeContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  barcodeInput: {
    flex: 1,
  },
  scanButton: {
    width: 44,
    height: 44,
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
  },
  segmentedControl: {
    flexDirection: 'row',
    borderWidth: 1,
    borderRadius: 8,
    overflow: 'hidden',
  },
  segment: {
    flex: 1,
    paddingVertical: 10,
    alignItems: 'center',
  },
  segmentText: {
    fontSize: 14,
    fontWeight: '500',
  },
  infoBox: {
    flex: 1,
  },
  infoLabel: {
    fontSize: 12,
    marginBottom: 4,
  },
  infoValue: {
    fontSize: 16,
    fontWeight: '600',
  },
  deleteButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 14,
    borderRadius: 12,
    borderWidth: 1,
    marginTop: 8,
  },
  deleteButtonText: {
    color: '#EF4444',
    fontSize: 16,
    fontWeight: '600',
  },
});
