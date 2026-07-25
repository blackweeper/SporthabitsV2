export const colors = {
  surface: '#0E0E0E',
  surfaceSecondary: '#1A1A1A',
  surfaceTertiary: '#242424',
  onSurface: '#FFFFFF',
  onSurfaceSecondary: '#E0E0E0',
  onSurfaceTertiary: '#9A9A9A',
  brand: '#FF3D00',
  brandSecondary: '#FF7A4D',
  brandTertiary: '#4D1200',
  success: '#00E676',
  warning: '#FFC400',
  error: '#FF1744',
  border: '#2A2A2A',
  borderStrong: '#3A3A3A',
  divider: '#1E1E1E',
  overlay: 'rgba(0,0,0,0.6)',
} as const;

export const spacing = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 24,
  xl2: 32,
  xl3: 48,
} as const;

export const radius = {
  sm: 6,
  md: 12,
  lg: 20,
  pill: 999,
} as const;

export const fonts = {
  // System fonts as fallback for Barlow Condensed / Manrope
  display: 'System',
  body: 'System',
} as const;
