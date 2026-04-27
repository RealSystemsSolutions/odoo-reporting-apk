import { View, StyleSheet } from 'react-native';
import Text from '@/components/ui/Text';
import { Ionicons } from '@expo/vector-icons';
import Logo from '@/components/ui/Logo';

export default function ReportsScreen() {
  return (
    <View style={styles.container}>
      <Logo width={180} height={50} />
      <View style={{ height: 32 }} />
      <Ionicons name="bar-chart" size={48} color="#374151" />
      <Text style={styles.title}>Reportes</Text>
      <Text style={styles.subtitle}>Próximamente — reportes avanzados conectados a Odoo</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0D1B2A',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
  },
  title: {
    fontSize: 24,
    fontWeight: '700',
    color: '#F8FAFC',
    marginTop: 16,
  },
  subtitle: {
    fontSize: 16,
    color: '#94A3B8',
    textAlign: 'center',
    marginTop: 8,
  },
});
