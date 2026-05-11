import React, { useState, useEffect } from 'react';
import { Modal, View, StyleSheet, TouchableOpacity, FlatList, ActivityIndicator, TextInput } from 'react-native';
import Text from '@/components/ui/Text';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '@/theme/ThemeContext';
import { OdooPartner } from '@/types/odoo.types';
import { OdooPartnerService } from '@/services/odoo.service';

interface ClientSelectorModalProps {
  visible: boolean;
  onClose: () => void;
  onSelect: (client: OdooPartner) => void;
}

export default function ClientSelectorModal({ visible, onClose, onSelect }: ClientSelectorModalProps) {
  const { colors } = useTheme();
  const [clients, setClients] = useState<OdooPartner[]>([]);
  const [loading, setLoading] = useState(false);
  const [search, setSearch] = useState('');

  useEffect(() => {
    if (visible) {
      fetchClients();
    }
  }, [visible]);

  useEffect(() => {
    const timer = setTimeout(() => {
      if (visible) fetchClients(search);
    }, 500);
    return () => clearTimeout(timer);
  }, [search]);

  const fetchClients = async (query = '') => {
    setLoading(true);
    try {
      const data = await OdooPartnerService.getPartners(20, 0, query);
      setClients(data);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal visible={visible} animationType="slide" presentationStyle="pageSheet" onRequestClose={onClose}>
      <View style={[styles.container, { backgroundColor: colors.background }]}>
        <View style={[styles.header, { backgroundColor: colors.card, borderBottomColor: colors.cardBorder }]}>
          <TouchableOpacity style={styles.closeBtn} onPress={onClose}>
            <Ionicons name="close" size={24} color={colors.textPrimary} />
          </TouchableOpacity>
          <Text style={[styles.title, { color: colors.textPrimary }]}>Select Customer</Text>
          <View style={{ width: 32 }} />
        </View>

        <View style={styles.searchWrap}>
          <View style={[styles.searchBox, { backgroundColor: colors.card, borderColor: colors.cardBorder }]}>
            <Ionicons name="search" size={20} color={colors.textSecondary} />
            <TextInput
              style={[styles.input, { color: colors.textPrimary, fontFamily: 'Montserrat_400Regular' }]}
              placeholder="Search customer..."
              placeholderTextColor={colors.textSecondary}
              value={search}
              onChangeText={setSearch}
            />
          </View>
        </View>

        {loading ? (
          <ActivityIndicator size="large" color={colors.primary} style={{ marginTop: 20 }} />
        ) : (
          <FlatList
            data={clients}
            keyExtractor={item => item.id.toString()}
            contentContainerStyle={styles.list}
            renderItem={({ item }) => (
              <TouchableOpacity 
                style={[styles.item, { backgroundColor: colors.card, borderColor: colors.cardBorder }]}
                onPress={() => { onSelect(item); onClose(); }}
              >
                <View style={[styles.avatar, { backgroundColor: colors.primaryLight }]}>
                  <Ionicons name="person" size={20} color={colors.primary} />
                </View>
                <View style={styles.info}>
                  <Text style={[styles.name, { color: colors.textPrimary }]}>{item.name}</Text>
                  {item.email && <Text style={[styles.sub, { color: colors.textSecondary }]}>{item.email}</Text>}
                  {item.phone && <Text style={[styles.sub, { color: colors.textSecondary }]}>{item.phone}</Text>}
                </View>
                <Ionicons name="chevron-forward" size={20} color={colors.textSecondary} />
              </TouchableOpacity>
            )}
            ListEmptyComponent={
              <Text style={{ textAlign: 'center', marginTop: 20, color: colors.textSecondary }}>No customers found</Text>
            }
          />
        )}
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 16,
    borderBottomWidth: 1,
  },
  closeBtn: { padding: 4 },
  title: { fontSize: 18, fontWeight: '600' },
  searchWrap: { padding: 16 },
  searchBox: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: 12,
    height: 44,
  },
  input: { flex: 1, marginLeft: 8, fontSize: 16 },
  list: { padding: 16, gap: 12 },
  item: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    borderWidth: 1,
    borderRadius: 12,
  },
  avatar: {
    width: 40, height: 40, borderRadius: 20,
    justifyContent: 'center', alignItems: 'center',
    marginRight: 12,
  },
  info: { flex: 1 },
  name: { fontSize: 16, fontWeight: '600' },
  sub: { fontSize: 13, marginTop: 2 },
});
