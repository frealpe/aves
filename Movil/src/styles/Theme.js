export const Theme = {
  colors: {
    bg: '#131313',        // Absolute Darkness
    surface: '#131313',   // Level 0 (The Void)
    surfaceLow: '#1f1f1f', // Level 1 (The Deck)
    surfaceHigh: '#2a2a2a', // Level 2 (The Component)
    surfaceBright: '#393939', // Level 3 (The Overlay - Glass base)
    primary: '#e3b5ff',    // Electric Purple
    primaryDark: '#a020f0',
    secondary: '#ffffff',  
    accent: '#ffb4ab',     // High Energy Red
    text: '#e2e2e2',       // On-Surface
    textSecondary: '#d1c1d7', // Muted Tech
    error: '#ffb4ab',
    success: '#00e676',
    glass: 'rgba(255, 255, 255, 0.04)',
    glassBorder: 'rgba(153, 247, 255, 0.15)',
    outlineVariant: 'rgba(69, 72, 79, 0.15)', // The Ghost Border
  },
  fonts: {
    headline: 'SpaceGrotesk_700Bold',
    body: 'Manrope_400Regular',
    bodyBold: 'Manrope_700Bold',
    mono: 'SpaceGrotesk_400Regular',
  },
  spacing: {
    xs: 4,
    sm: 8,
    md: 16,
    lg: 24,
    xl: 32,
    xxl: 48,
  },
  borderRadius: {
    xs: 4,
    sm: 8,
    md: 12, // 'md' corner for 'machined' feel
    lg: 20,
    xl: 30,
    round: 9999,
  }
};
