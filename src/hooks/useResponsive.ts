import { useState, useEffect } from 'react';
import { Dimensions } from 'react-native';

const TABLET_BREAKPOINT = 768;

interface ResponsiveLayout {
  width: number;
  height: number;
  isTablet: boolean;
  /** Number of columns for KPI card grid */
  kpiColumns: number;
  /** Number of columns for chart grid */
  chartColumns: number;
  /** Standard content padding */
  contentPadding: number;
}

export function useResponsive(): ResponsiveLayout {
  const [dims, setDims] = useState(() => Dimensions.get('window'));

  useEffect(() => {
    const sub = Dimensions.addEventListener('change', ({ window }) => {
      setDims(window);
    });
    return () => sub.remove();
  }, []);

  const isTablet = dims.width >= TABLET_BREAKPOINT;

  return {
    width: dims.width,
    height: dims.height,
    isTablet,
    kpiColumns: isTablet ? 4 : 2,
    chartColumns: isTablet ? 2 : 1,
    contentPadding: isTablet ? 24 : 16,
  };
}
