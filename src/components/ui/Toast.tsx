import React, { useEffect, useRef, useState } from 'react';
import { Animated, StyleSheet, TouchableOpacity, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Text from './Text';
import { useToastStore, type ToastType } from '@/store/toast.store';

const TOAST_CONFIG: Record<ToastType, { bg: string; border: string; icon: React.ComponentProps<typeof Ionicons>['name'] }> = {
  success: { bg: '#0D9E6E', border: '#0A7A55', icon: 'checkmark-circle' },
  error:   { bg: '#DC2626', border: '#B91C1C', icon: 'close-circle' },
  warning: { bg: '#D97706', border: '#B45309', icon: 'warning' },
  info:    { bg: '#2563EB', border: '#1D4ED8', icon: 'information-circle' },
};

const DURATION = 3200;

export default function Toast() {
  const { visible, message, type, hide } = useToastStore();
  const insets = useSafeAreaInsets();
  const translateY = useRef(new Animated.Value(-160)).current;
  const timerRef = useRef<ReturnType<typeof setTimeout>>(6000);
  const [rendered, setRendered] = useState(false);

  const animateOut = () => {
    clearTimeout(timerRef.current);
    Animated.timing(translateY, {
      toValue: -160,
      duration: 260,
      useNativeDriver: true,
    }).start(() => {
      setRendered(false);
      hide();
    });
  };

  useEffect(() => {
    if (visible) {
      clearTimeout(timerRef.current);
      setRendered(true);
      translateY.setValue(-160);
      Animated.spring(translateY, {
        toValue: 0,
        tension: 70,
        friction: 12,
        useNativeDriver: true,
      }).start();
      timerRef.current = setTimeout(animateOut, DURATION);
    }
    return () => clearTimeout(timerRef.current);
  }, [visible, message]);

  if (!rendered && !visible) return null;

  const cfg = TOAST_CONFIG[type];

  return (
    <Animated.View
      style={[
        styles.container,
        {
          top: insets.top + 12,
          backgroundColor: cfg.bg,
          borderColor: cfg.border,
          transform: [{ translateY }],
        },
      ]}
      pointerEvents="box-none"
    >
      <View style={styles.iconWrap}>
        <Ionicons name={cfg.icon} size={22} color="#fff" />
      </View>
      <Text style={styles.message} numberOfLines={3}>{message}</Text>
      <TouchableOpacity onPress={animateOut} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
        <Ionicons name="close" size={16} color="rgba(255,255,255,0.75)" />
      </TouchableOpacity>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    left: 16,
    right: 16,
    zIndex: 9999,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingVertical: 14,
    paddingHorizontal: 16,
    borderRadius: 16,
    borderWidth: 1,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.28,
    shadowRadius: 10,
    elevation: 12,
  },
  iconWrap: {
    width: 26,
    alignItems: 'center',
  },
  message: {
    flex: 1,
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
    lineHeight: 20,
  },
});