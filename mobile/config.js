import { Platform } from 'react-native';

const fallback = Platform.select({
  android: 'http://10.0.2.2:3000',
  default: 'http://localhost:3000',
});

export const API_URL = process.env.EXPO_PUBLIC_API_URL || fallback;

/* Public web origin used for in-app links that must open in a browser:
   Privacy Policy, Terms of Service, support, etc. The App Store review
   team checks these links from the Settings screen, so the value below
   needs to point at a publicly reachable host before submission. */
export const WEB_URL = process.env.EXPO_PUBLIC_WEB_URL || 'https://takhlees-ca.vercel.app';

export const PRIVACY_URL = `${WEB_URL}/legal/privacy`;
export const TERMS_URL = `${WEB_URL}/legal/terms`;
export const SUPPORT_URL = `${WEB_URL}/contact`;
