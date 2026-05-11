import { Platform } from 'react-native';

const fallback = Platform.select({
  android: 'http://10.0.2.2:3000',
  default: 'http://localhost:3000',
});

export const API_URL = process.env.EXPO_PUBLIC_API_URL || fallback;
