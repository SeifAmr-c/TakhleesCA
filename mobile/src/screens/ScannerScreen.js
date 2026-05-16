import { useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Pressable,
  SafeAreaView,
  StatusBar,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { useIsFocused, useNavigation } from '@react-navigation/native';
import { CameraView, useCameraPermissions } from 'expo-camera';
import { completeViaQr } from '../api';
import { brand, colors } from '../theme';

const ACCENT = brand.tabActive;
const SUCCESS = colors.signalGo;

export default function ScannerScreen({ session, onSignOut }) {
  const company = session?.company ?? null;
  const navigation = useNavigation();
  const [permission, requestPermission] = useCameraPermissions();
  const [scanning, setScanning] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  /* Drives the in-screen success/error panel. When non-null the camera
     reticle gets dimmed and the panel takes over the bottom area with
     navigation + retry actions. */
  const [scanOutcome, setScanOutcome] = useState(null);
  const lockRef = useRef(false);
  /* Tab-blur ghost scans: while the Scanner tab is animating out the
     camera can still fire onBarcodeScanned with a partial frame, which
     surfaces as a spurious "scan failed" alert on the Applications tab.
     Gating both the CameraView mount and the scan callback on
     isFocused stops the stale frame from reaching the handler. */
  const isFocused = useIsFocused();

  useEffect(() => {
    if (permission && !permission.granted && permission.canAskAgain) {
      requestPermission();
    }
  }, [permission, requestPermission]);

  async function handleScanned({ data }) {
    if (lockRef.current || submitting || !scanning || !isFocused) return;
    const payload = String(data || '').trim();
    if (!payload) return;
    lockRef.current = true;
    setScanning(false);
    setSubmitting(true);

    try {
      const result = await completeViaQr(payload);
      setScanOutcome({
        ok: true,
        tracking: result?.data?.TrackingNumber ?? payload.split(':')[0],
        applicationId: result?.data?.ApplicationID ?? null,
      });
    } catch (e) {
      const userMessage = 'Scan failed. Please contact the system admin.';
      setScanOutcome({ ok: false, message: userMessage });
      Alert.alert(
        'Scan failed',
        userMessage,
        [{ text: 'Try again', onPress: resumeScanning }],
        { cancelable: false }
      );
    } finally {
      setSubmitting(false);
    }
  }

  function resumeScanning() {
    lockRef.current = false;
    setScanOutcome(null);
    setScanning(true);
  }

  /* Switching tabs nukes the success panel so it isn't waiting for the
     user when they next come back to the scanner. ApplicationsScreen's
     focus listener refetches the list, so the just-completed shipment
     shows up as Completed without needing a manual pull-to-refresh. */
  function returnToApplications() {
    lockRef.current = false;
    setScanOutcome(null);
    setScanning(true);
    navigation.navigate('Applications');
  }

  function handleSignOut() {
    onSignOut?.();
  }

  if (!permission) {
    return (
      <View style={styles.center}>
        <ActivityIndicator color={ACCENT} />
      </View>
    );
  }

  if (!permission.granted) {
    return (
      <SafeAreaView style={styles.center}>
        <Text style={styles.title}>Camera access needed</Text>
        <Text style={styles.body}>
          We use the camera to scan shipment completion QR codes.
        </Text>
        <Pressable style={styles.primaryBtn} onPress={requestPermission}>
          <Text style={styles.primaryBtnText}>Allow camera</Text>
        </Pressable>
        <Pressable style={styles.linkBtn} onPress={handleSignOut}>
          <Text style={styles.linkBtnText}>Sign out</Text>
        </Pressable>
      </SafeAreaView>
    );
  }

  const showSuccessPanel = scanOutcome?.ok === true;

  return (
    <View style={styles.root}>
      <StatusBar barStyle="light-content" />
      {isFocused ? (
        <CameraView
          style={StyleSheet.absoluteFill}
          facing="back"
          active={scanning && isFocused}
          barcodeScannerSettings={{ barcodeTypes: ['qr'] }}
          onBarcodeScanned={scanning && isFocused ? handleScanned : undefined}
        />
      ) : null}

      <View style={styles.topBar} pointerEvents="box-none">
        <View>
          <Text style={styles.brand}>Takhlees</Text>
          {company?.Name ? (
            <Text style={styles.companyName} numberOfLines={1}>
              {company.Name}
            </Text>
          ) : null}
        </View>
        <Pressable onPress={handleSignOut} hitSlop={12}>
          <Text style={styles.signOut}>Sign out</Text>
        </Pressable>
      </View>

      {showSuccessPanel ? null : (
        <View style={styles.reticleWrap} pointerEvents="none">
          <View style={styles.reticle} />
          <Text style={styles.reticleHint}>
            Align the client's QR code inside the frame
          </Text>
        </View>
      )}

      <View style={styles.bottomBar} pointerEvents="box-none">
        {showSuccessPanel ? (
          <View style={styles.successCard}>
            <View style={styles.successBadge}>
              <Text style={styles.successBadgeText}>✓</Text>
            </View>
            <Text style={styles.successTitle}>Shipment Completed</Text>
            <Text style={styles.successSubtitle} numberOfLines={2}>
              Tracking #{scanOutcome.tracking} is now marked complete.
            </Text>
            <Pressable
              style={({ pressed }) => [
                styles.primaryBtn,
                pressed && { opacity: 0.85 },
              ]}
              onPress={returnToApplications}
            >
              <Text style={styles.primaryBtnText}>Return to Application Page</Text>
            </Pressable>
            <Pressable style={styles.ghostBtn} onPress={resumeScanning} hitSlop={8}>
              <Text style={styles.ghostBtnText}>Scan another</Text>
            </Pressable>
          </View>
        ) : submitting ? (
          <View style={styles.statusPill}>
            <ActivityIndicator color="#2A1A05" />
            <Text style={styles.statusText}>Completing shipment…</Text>
          </View>
        ) : !scanning ? (
          <Pressable style={styles.primaryBtn} onPress={resumeScanning}>
            <Text style={styles.primaryBtnText}>Resume scanning</Text>
          </Pressable>
        ) : (
          <Text style={styles.idleHint}>
            Camera is live. Point at a QR to complete the shipment.
          </Text>
        )}
        {scanOutcome && !scanOutcome.ok && !submitting ? (
          <Text style={[styles.lastResult, { color: '#FCA5A5' }]} numberOfLines={2}>
            Last error: {scanOutcome.message}
          </Text>
        ) : null}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#000' },
  center: {
    flex: 1,
    backgroundColor: brand.background,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
  },
  title: { color: '#fff', fontSize: 22, fontWeight: '700', marginBottom: 8 },
  body: {
    color: 'rgba(255,255,255,0.7)',
    textAlign: 'center',
    marginBottom: 24,
  },
  topBar: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    paddingTop: 56,
    paddingHorizontal: 20,
    paddingBottom: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: 'rgba(0,0,0,0.35)',
  },
  brand: { color: '#fff', fontSize: 18, fontWeight: '700' },
  companyName: { color: 'rgba(255,255,255,0.7)', fontSize: 12 },
  signOut: { color: ACCENT, fontWeight: '600' },
  reticleWrap: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  reticle: {
    width: 260,
    height: 260,
    borderRadius: 24,
    borderWidth: 3,
    borderColor: ACCENT,
    backgroundColor: 'transparent',
    shadowColor: ACCENT,
    shadowOpacity: 0.5,
    shadowRadius: 18,
  },
  reticleHint: {
    color: 'rgba(255,255,255,0.85)',
    marginTop: 16,
    fontSize: 13,
    paddingHorizontal: 24,
    textAlign: 'center',
  },
  bottomBar: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    paddingHorizontal: 24,
    paddingTop: 16,
    paddingBottom: 36,
    backgroundColor: 'rgba(0,0,0,0.5)',
    alignItems: 'center',
    gap: 10,
  },
  primaryBtn: {
    backgroundColor: ACCENT,
    paddingVertical: 14,
    paddingHorizontal: 28,
    borderRadius: 14,
    minWidth: 220,
    alignItems: 'center',
  },
  primaryBtnText: { color: '#2A1A05', fontWeight: '700', fontSize: 16 },
  linkBtn: { marginTop: 14 },
  linkBtnText: { color: 'rgba(255,255,255,0.7)' },
  statusPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    backgroundColor: ACCENT,
    paddingHorizontal: 18,
    paddingVertical: 12,
    borderRadius: 12,
  },
  statusText: { color: '#2A1A05', fontWeight: '700' },
  idleHint: { color: 'rgba(255,255,255,0.85)', fontSize: 13 },
  lastResult: { fontSize: 12 },
  successCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 18,
    paddingHorizontal: 22,
    paddingTop: 18,
    paddingBottom: 16,
    alignItems: 'center',
    width: '100%',
    maxWidth: 360,
    gap: 10,
  },
  successBadge: {
    width: 48,
    height: 48,
    borderRadius: 999,
    backgroundColor: SUCCESS,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 2,
  },
  successBadgeText: {
    color: '#FFFFFF',
    fontSize: 26,
    fontWeight: '800',
    lineHeight: 28,
  },
  successTitle: {
    color: colors.harbor900,
    fontSize: 17,
    fontWeight: '700',
  },
  successSubtitle: {
    color: colors.steel700,
    fontSize: 13,
    textAlign: 'center',
    maxWidth: 280,
    marginBottom: 6,
  },
  ghostBtn: { paddingVertical: 6, paddingHorizontal: 12 },
  ghostBtnText: { color: colors.steel700, fontWeight: '600', fontSize: 13 },
});
