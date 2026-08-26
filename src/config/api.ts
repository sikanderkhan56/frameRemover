import {Platform} from 'react-native';

/** Deployed backend (Railway) */
const PRODUCTION_API_URL =
  'https://fsbackend-production-8079.up.railway.app';

/**
 * Set to true to hit a local FastAPI server instead of Railway.
 * iOS Simulator: 127.0.0.1 | Android Emulator: 10.0.2.2
 */
const USE_LOCAL_API_IN_DEV = true;

const LOCAL_API_HOST =
  Platform.OS === 'android' ? '10.0.2.2' : '192.168.1.12';

export function getApiBaseUrl(): string {
  if (USE_LOCAL_API_IN_DEV) {
    return `http://${LOCAL_API_HOST}:8000`;
  }

  return PRODUCTION_API_URL;
}

export const API_BASE_URL = getApiBaseUrl();
