import React, { useState, useRef, useEffect } from 'react';
import { TextInput, type TextInputProps } from 'react-native';

interface Props extends Omit<TextInputProps, 'value' | 'onChangeText' | 'keyboardType'> {
  value: number;
  onChangeValue: (n: number) => void;
}

function parsePrice(text: string): number | null {
  // Accept both . and , as decimal separator
  const normalized = text.replace(',', '.');
  const n = parseFloat(normalized);
  return isNaN(n) ? null : n;
}

export default function PriceInput({ value, onChangeValue, ...props }: Props) {
  const [text, setText] = useState(() => (value !== 0 ? String(value) : ''));
  const focusedRef = useRef(false);

  // Sync external value when not typing (e.g., initial load, form reset)
  useEffect(() => {
    if (!focusedRef.current) {
      setText(value !== 0 ? String(value) : '');
    }
  }, [value]);

  const handleChangeText = (t: string) => {
    // Only allow digits plus at most one separator (. or ,)
    const cleaned = t.replace(/[^0-9.,]/g, '');
    setText(cleaned);
    const n = parsePrice(cleaned);
    if (n !== null) onChangeValue(n);
  };

  const handleBlur = () => {
    focusedRef.current = false;
    const n = parsePrice(text);
    if (n === null || text.trim() === '') {
      setText('');
      onChangeValue(0);
    } else {
      setText(String(n));
    }
  };

  return (
    <TextInput
      {...props}
      value={text}
      onChangeText={handleChangeText}
      onFocus={() => { focusedRef.current = true; }}
      onBlur={handleBlur}
      keyboardType="decimal-pad"
    />
  );
}