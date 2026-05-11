import React, { useState, useEffect } from 'react';
import {
  View,
  StyleSheet,
  Modal,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Switch,
  Alert,
  Platform,
  KeyboardAvoidingView,
} from 'react-native';
import Text from '@/components/ui/Text';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '@/theme/ThemeContext';
import type { OdooProductCategory } from '@/types/odoo.types';

interface Props {
  visible: boolean;
  onClose: () => void;
  onSave: (data: Partial<OdooProductCategory>) => Promise<void>;
  category?: OdooProductCategory;
}

export default function CategoryModal({ visible, onClose, onSave, category }: Props) {
  const { colors } = useTheme();
  const [formData, setFormData] = useState<Partial<OdooProductCategory>>({});
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (category) {
      setFormData(category);
    } else {
      setFormData({
        name: '',
        food_stamp: false,
        wic: false,
        fsa: false,
        age_verification: false,
        taxable: true,
        visible: true,
        scalable: false,
        open_price: false,
      });
    }
  }, [category, visible]);

  const handleSave = async () => {
    if (!formData.name) {
      Alert.alert('Error', 'Please enter a category name');
      return;
    }

    setLoading(true);
    try {
      await onSave(formData);
      onClose();
    } catch (e: any) {
      Alert.alert('Error', e.message || 'Failed to save category');
    } finally {
      setLoading(false);
    }
  };

  const renderSwitch = (label: string, field: keyof OdooProductCategory, icon: string) => (
    <View style={styles.switchRow}>
      <View style={styles.switchLabel}>
        <Ionicons name={icon as any} size={20} color={colors.textSecondary} style={{ marginRight: 10 }} />
        <Text style={{ color: colors.textPrimary }}>{label}</Text>
      </View>
      <Switch
        value={!!formData[field]}
        onValueChange={(val) => setFormData({ ...formData, [field]: val })}
        trackColor={{ false: colors.cardBorder, true: colors.primary }}
        thumbColor="#FFF"
      />
    </View>
  );

  const renderInput = (label: string, field: keyof OdooProductCategory, placeholder: string, keyboardType: any = 'default') => (
    <View style={styles.inputGroup}>
      <Text style={[styles.inputLabel, { color: colors.textSecondary }]}>{label}</Text>
      <TextInput
        style={[styles.input, { backgroundColor: colors.background, color: colors.textPrimary, borderColor: colors.cardBorder }]}
        value={formData[field]?.toString() || ''}
        onChangeText={(val) => setFormData({ ...formData, [field]: keyboardType === 'numeric' ? parseFloat(val) || 0 : val })}
        placeholder={placeholder}
        placeholderTextColor={colors.textSecondary}
        keyboardType={keyboardType}
      />
    </View>
  );

  return (
    <Modal visible={visible} animationType="slide" transparent>
      <KeyboardAvoidingView 
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'} 
        style={styles.modalOverlay}
      >
        <View style={[styles.modalContent, { backgroundColor: colors.card }]}>
          <View style={[styles.header, { borderBottomColor: colors.cardBorder }]}>
            <Text style={[styles.title, { color: colors.textPrimary }]}>
              {category ? 'Edit Category' : 'New Category'}
            </Text>
            <TouchableOpacity onPress={onClose} style={styles.closeBtn}>
              <Ionicons name="close" size={24} color={colors.textPrimary} />
            </TouchableOpacity>
          </View>

          <ScrollView style={styles.form} showsVerticalScrollIndicator={false}>
            <View style={{ gap: 20, paddingBottom: 40 }}>
              <View>
                <Text style={[styles.sectionTitle, { color: colors.primary }]}>Basic Information</Text>
                {renderInput('Name', 'name', 'e.g. Produce, Grocery...')}
                {renderInput('Margin (%)', 'margin', '0.00', 'numeric')}
              </View>

              <View>
                <Text style={[styles.sectionTitle, { color: colors.primary }]}>Supermarket & Benefits</Text>
                {renderSwitch('Taxable', 'taxable', 'calculator-outline')}
                {renderSwitch('Food Stamp (SNAP)', 'food_stamp', 'fast-food-outline')}
                {renderSwitch('WIC Eligible', 'wic', 'nutrition-outline')}
                {renderSwitch('FSA Eligible', 'fsa', 'medical-outline')}
                {renderSwitch('Age Verification', 'age_verification', 'id-card-outline')}
                {formData.age_verification && renderInput('Minimum Age', 'age_allow', '21', 'numeric')}
              </View>

              <View>
                <Text style={[styles.sectionTitle, { color: colors.primary }]}>POS Configuration</Text>
                {renderSwitch('Visible in POS', 'visible', 'eye-outline')}
                {renderSwitch('Scalable (Scale)', 'scalable', 'scale-outline')}
                {renderSwitch('Open Price', 'open_price', 'pencil-outline')}
                {renderSwitch('Mix & Match', 'mix_and_match', 'gift-outline')}
                {renderSwitch('Use Prefix Price', 'prefix_price', 'barcode-outline')}
                {renderSwitch('WT Format', 'wt_format', 'resize-outline')}
                {renderSwitch('Family Code', 'family_code', 'apps-outline')}
                {renderSwitch('Alphabetic Order', 'alphabetic_order', 'text-outline')}
                {renderInput('Index Position', 'index_position', '0', 'numeric')}
                {renderInput('Scale Dept ID', 'scale_dept_id', '0', 'numeric')}
              </View>

              <View>
                <Text style={[styles.sectionTitle, { color: colors.primary }]}>Printer Routing</Text>
                <View style={styles.grid}>
                  {renderSwitch('Print 1', 'print1', 'print-outline')}
                  {renderSwitch('Print 2', 'print2', 'print-outline')}
                  {renderSwitch('Print 3', 'print3', 'print-outline')}
                  {renderSwitch('Print 4', 'print4', 'print-outline')}
                </View>
              </View>
            </View>
          </ScrollView>

          <View style={[styles.footer, { borderTopColor: colors.cardBorder }]}>
            <TouchableOpacity 
              style={[styles.cancelBtn, { borderColor: colors.cardBorder }]} 
              onPress={onClose}
              disabled={loading}
            >
              <Text style={{ color: colors.textSecondary }}>Cancel</Text>
            </TouchableOpacity>
            <TouchableOpacity 
              style={[styles.saveBtn, { backgroundColor: colors.primary }]} 
              onPress={handleSave}
              disabled={loading}
            >
              <Text style={styles.saveBtnText}>{loading ? 'Saving...' : 'Save Category'}</Text>
            </TouchableOpacity>
          </View>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    height: '85%',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: 20,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingBottom: 16,
    borderBottomWidth: 1,
  },
  title: {
    fontSize: 20,
    fontWeight: '700',
  },
  closeBtn: {
    padding: 4,
  },
  form: {
    flex: 1,
    marginTop: 20,
  },
  sectionTitle: {
    fontSize: 14,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 1,
    marginBottom: 16,
    marginTop: 8,
  },
  inputGroup: {
    marginBottom: 16,
  },
  inputLabel: {
    fontSize: 12,
    fontWeight: '600',
    marginBottom: 8,
  },
  input: {
    height: 48,
    borderRadius: 12,
    borderWidth: 1,
    paddingHorizontal: 16,
    fontSize: 16,
  },
  switchRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
  },
  switchLabel: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 0,
  },
  footer: {
    flexDirection: 'row',
    gap: 12,
    paddingTop: 16,
    borderTopWidth: 1,
  },
  cancelBtn: {
    flex: 1,
    height: 50,
    borderRadius: 12,
    borderWidth: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  saveBtn: {
    flex: 2,
    height: 50,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  saveBtnText: {
    color: '#FFF',
    fontSize: 16,
    fontWeight: '700',
  },
});
