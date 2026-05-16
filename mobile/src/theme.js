/* Mobile palette mirrored from frontend/src/styles/theme.css.
   The web side authors colors in OKLCH; React Native needs sRGB hex,
   so these are the closest sRGB equivalents of the harbor/safety
   tokens. Keep names aligned with the web tokens so a future move to
   a shared design tokens package is mechanical. */

export const colors = {
  /* Harbor blues — the deep maritime anchor */
  harbor950: '#0A1623',
  harbor900: '#0E2238',
  harbor800: '#143251',
  harbor700: '#1E4470',
  harbor600: '#2E5C8E',
  harbor500: '#477BAE',
  harbor400: '#7AA1C9',
  harbor300: '#ADC7DC',
  harbor200: '#D2E0EC',
  harbor100: '#E6EDF4',
  harbor50: '#F4F7FB',

  /* Steel grays */
  steel900: '#1F2A33',
  steel700: '#4D5A65',
  steel500: '#828D96',
  steel300: '#C8CED3',
  steel100: '#EEF1F3',

  /* Safety amber — the high-vis crane signal, used for active tab tint */
  safety700: '#C57910',
  safety: '#F4A136',
  safety300: '#F8C780',

  /* Operational status colors */
  signalGo: '#1B8C4C',
  signalGoBg: '#E8F6EC',
  signalWarn: '#B27A11',
  signalWarnBg: '#FBF1DD',
  signalStop: '#C0342D',
  signalStopBg: '#FBE6E2',
  signalInfo: '#1F6FB7',
  signalInfoBg: '#E2EEF8',

  white: '#FFFFFF',
  inkOnDark: '#F2F5F9',
};

/* Brand surfaces used by the navigators. The tab bar sits on the
   deepest harbor shade with safety amber as the active tint — that
   matches the web design system rule that amber means "in motion". */
export const brand = {
  background: colors.harbor950,
  surface: colors.harbor900,
  surfaceElevated: colors.harbor800,
  border: 'rgba(255,255,255,0.10)',
  tabBarBg: colors.harbor900,
  tabBarBorder: 'rgba(255,255,255,0.08)',
  tabActive: colors.safety,
  tabInactive: 'rgba(255,255,255,0.55)',
  primary: colors.harbor700,
  primaryDeep: colors.harbor800,
  text: colors.white,
  textSoft: 'rgba(255,255,255,0.72)',
  textFaint: 'rgba(255,255,255,0.48)',
};

/* Maps an application Status string to one of the operational status
   colors used in the listing screens. Anything unknown falls through
   to the neutral info palette. */
export function statusPalette(status) {
  const s = String(status || '').toLowerCase();
  if (s === 'completed' || s === 'accepted') {
    return { fg: colors.signalGo, bg: colors.signalGoBg };
  }
  if (s === 'in progress') {
    return { fg: colors.safety700, bg: '#FBEFD8' };
  }
  if (s === 'pending') {
    return { fg: colors.signalWarn, bg: colors.signalWarnBg };
  }
  if (s === 'rejected' || s === 'cancelled' || s === 'canceled') {
    return { fg: colors.signalStop, bg: colors.signalStopBg };
  }
  return { fg: colors.signalInfo, bg: colors.signalInfoBg };
}
