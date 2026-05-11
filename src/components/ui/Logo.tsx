import React from 'react';
import { Image, ImageStyle, StyleProp } from 'react-native';

export default function Logo({ width = 156, height = 36, style }: { width?: number; height?: number; style?: StyleProp<ImageStyle> }) {
  return (
    <Image 
      source={require('../../../assets/android-icon-foreground.png')} 
      style={[{ width, height, resizeMode: 'contain' }, style]} 
    />
  );
}
