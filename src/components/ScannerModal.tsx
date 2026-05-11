import React from 'react';
import { Modal, StyleSheet, TouchableOpacity, View, SafeAreaView } from 'react-native';
import Text from '@/components/ui/Text';
import { CameraView, useCameraPermissions } from 'expo-camera';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '@/theme/ThemeContext';

interface ScannerModalProps {
  visible: boolean;
  onClose: () => void;
  onScan: (data: string) => void;
}

export default function ScannerModal({ visible, onClose, onScan }: ScannerModalProps) {
  const [permission, requestPermission] = useCameraPermissions();
  const { colors } = useTheme();

  const handleBarcodeScanned = ({ data }: { data: string }) => {
    onScan(data);
    onClose();
  };

  if (!visible) return null;

  if (!permission) {
    return (
      <Modal visible={visible} animationType="slide" presentationStyle="pageSheet">
        <View style={[styles.center, { backgroundColor: colors.background }]}>
          <Text style={{ color: colors.textPrimary }}>Loading camera permissions...</Text>
        </View>
      </Modal>
    );
  }

  if (!permission.granted) {
    return (
      <Modal visible={visible} animationType="slide" presentationStyle="pageSheet">
        <View style={[styles.center, { backgroundColor: colors.background }]}>
          <Text style={[styles.message, { color: colors.textPrimary }]}>
            We need permission to use the camera to scan the barcode.
          </Text>
          <TouchableOpacity
            style={[styles.button, { backgroundColor: colors.primary }]}
            onPress={requestPermission}
          >
            <Text style={styles.buttonText}>Grant Permission</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.button, { backgroundColor: colors.card, borderWidth: 1, borderColor: colors.cardBorder, marginTop: 12 }]}
            onPress={onClose}
          >
            <Text style={[styles.buttonText, { color: colors.textPrimary }]}>Cancel</Text>
          </TouchableOpacity>
        </View>
      </Modal>
    );
  }

  return (
    <Modal visible={visible} animationType="slide" presentationStyle="pageSheet">
      <SafeAreaView style={[styles.container, { backgroundColor: '#000' }]}>
        <View style={styles.header}>
          <TouchableOpacity onPress={onClose} style={styles.closeButton}>
            <Ionicons name="close" size={28} color="#FFF" />
          </TouchableOpacity>
          <Text style={styles.title}>Scan Code</Text>
          <View style={{ width: 44 }} />
        </View>

        <View style={styles.cameraContainer}>
          <CameraView
            style={styles.camera}
            facing="back"
            barcodeScannerSettings={{
              barcodeTypes: ['qr', 'ean13', 'upc_a', 'upc_e', 'ean8', 'code128', 'code39', 'itf14'],
            }}
            onBarcodeScanned={handleBarcodeScanned}
          />
          <View style={styles.overlay}>
            <View style={styles.scanArea} />
          </View>
        </View>
      </SafeAreaView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  center: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  message: {
    textAlign: 'center',
    fontSize: 16,
    marginBottom: 24,
  },
  button: {
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 8,
    width: '100%',
    alignItems: 'center',
  },
  buttonText: {
    color: '#FFF',
    fontSize: 16,
    fontWeight: '600',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: '#000',
  },
  closeButton: {
    padding: 8,
  },
  title: {
    color: '#FFF',
    fontSize: 18,
    fontWeight: '600',
  },
  cameraContainer: {
    flex: 1,
    position: 'relative',
  },
  camera: {
    flex: 1,
  },
  overlay: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0,0,0,0.4)',
  },
  scanArea: {
    width: 250,
    height: 150,
    borderWidth: 2,
    borderColor: '#10B981',
    backgroundColor: 'transparent',
    borderRadius: 16,
  },
});
