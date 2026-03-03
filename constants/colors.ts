const COLORS = {
  background: "#000000",
  surface: "#101010",
  surfaceSecondary: "#141414",
  surfaceAccent: "#181818",
  border: "#222222",
  borderLight: "#2a2a2a",

  textPrimary: "#FFFFFF",
  textSecondary: "#999999",
  textMuted: "#555555",

  accent: "#E50914",
  accentDark: "#B20710",

  white: "#FFFFFF",
  black: "#000000",

  starYellow: "#F5C518",
  success: "#2ECC71",
  warning: "#F39C12",

  tabBar: "#0a0a0a",
  tabBarBorder: "#1a1a1a",
  tabActive: "#FFFFFF",
  tabInactive: "#555555",
} as const;

export default {
  dark: {
    text: COLORS.textPrimary,
    background: COLORS.background,
    tint: COLORS.accent,
    tabIconDefault: COLORS.tabInactive,
    tabIconSelected: COLORS.tabActive,
  },
  light: {
    text: COLORS.textPrimary,
    background: COLORS.background,
    tint: COLORS.accent,
    tabIconDefault: COLORS.tabInactive,
    tabIconSelected: COLORS.tabActive,
  },
  ...COLORS,
};
