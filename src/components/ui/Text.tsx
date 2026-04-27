import React from 'react';
import { Text as RNText, TextProps as RNTextProps, StyleSheet } from 'react-native';

interface TextProps extends RNTextProps {
  weight?: '100' | '200' | '300' | '400' | '500' | '600' | '700' | '800' | '900';
}

export default function Text({ style, weight = '400', ...props }: TextProps) {
  let fontFamily = 'Montserrat_400Regular';
  
  // Map font weights to Montserrat fonts
  switch (weight) {
    case '100':
      fontFamily = 'Montserrat_100Thin';
      break;
    case '200':
      fontFamily = 'Montserrat_200ExtraLight';
      break;
    case '300':
      fontFamily = 'Montserrat_300Light';
      break;
    case '400':
      fontFamily = 'Montserrat_400Regular';
      break;
    case '500':
      fontFamily = 'Montserrat_500Medium';
      break;
    case '600':
      fontFamily = 'Montserrat_600SemiBold';
      break;
    case '700':
      fontFamily = 'Montserrat_700Bold';
      break;
    case '800':
      fontFamily = 'Montserrat_800ExtraBold';
      break;
    case '900':
      fontFamily = 'Montserrat_900Black';
      break;
  }

  // Find if style has fontWeight set and use it instead of prop
  const flattenedStyle = { ...(StyleSheet.flatten(style) || {}) };
  if (flattenedStyle.fontWeight) {
    switch (flattenedStyle.fontWeight) {
      case '100': case 'thin': fontFamily = 'Montserrat_100Thin'; break;
      case '200': fontFamily = 'Montserrat_200ExtraLight'; break;
      case '300': fontFamily = 'Montserrat_300Light'; break;
      case '400': case 'normal': fontFamily = 'Montserrat_400Regular'; break;
      case '500': case 'medium': fontFamily = 'Montserrat_500Medium'; break;
      case '600': case 'semibold': fontFamily = 'Montserrat_600SemiBold'; break;
      case '700': case 'bold': fontFamily = 'Montserrat_700Bold'; break;
      case '800': case 'extrabold': fontFamily = 'Montserrat_800ExtraBold'; break;
      case '900': case 'black': fontFamily = 'Montserrat_900Black'; break;
    }
    // Delete fontWeight to avoid React Native warning when custom font is used
    delete flattenedStyle.fontWeight;
  }

  return <RNText {...props} style={[flattenedStyle, { fontFamily }]} />;
}
