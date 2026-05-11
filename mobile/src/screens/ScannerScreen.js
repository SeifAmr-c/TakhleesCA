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
import { CameraView, useCameraPermissions } from 'expo-camera';
import { completeViaQr, logoutCompany } from '../api';

const ACCENT = '#34D399';

export default function ScannerScreen({ company, onSignOut }) {
  const [permission, requestPermission] = useCameraPermissions();
  const [scanning, setScanning] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [lastResult, setLastResult] = useState(null);
  const lockRef = useRef(false);

  useEffect(() => {
    if (permission && !permission.granted && permission.canAskAgain) {
      requestPermission();
    }
  }, [permission, requestPermission]);

  async function handleScanned({ data }) {
    if (lockRef.current || submitting || !scanning) return;
    const payload = String(data || '').trim();
    if (!payload) return;
    lockRef.current = true;
    setScanning(false);
    setSubmitting(true);

    try {
      const result = await completeViaQr(payload);
      setLastResult({
        ok: true,
        tracking: result?.data?.TrackingNumber ?? payload.split(':')[0],
      });
      Alert.alert(
        'Shipment Completed!',
        `Tracking #${result?.data?.TrackingNumber ?? '—'} marked as completed.`,
        [{ text: 'Scan another', onPress: resumeScanning }],
        { cancelable: false }
      );
    } catch (e) {
      setLastResult({ ok: false, message: e.message });
      Alert.alert(
        'Scan failed',
        e.message || 'Could not complete this shipment.',
        [{ text: 'Try again', onPress: resumeScanning }],
        { cancelable: false }
      );
    } finally {
      setSubmitting(false);
    }
  }

  function resumeScanning() {
    lockRef.current = false;
    setScanning(true);
  }

  async function handleSignOut() {
    await logoutCompany();
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

  return (
    <View style={styles.root}>
      <StatusBar barStyle="light-content" />
      <CameraView
        style={StyleSheet.absoluteFill}
        facing="back"
        active={scanning}
        barcodeScannerSettings={{ barcodeTypes: ['qr'] }}
        onBarcodeScanned={scanning ? handleScanned : undefined}
      />

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

      <View style={styles.reticleWrap} pointerEvents="none">
        <View style={styles.reticle} />
        <Text style={styles.reticleHint}>
          Align the client's QR code inside the frame
        </Text>
      </View>

      <View style={styles.bottomBar} pointerEvents="box-none">
        {submitting ? (
          <View style={styles.statusPill}>
            <ActivityIndicator color="#06231A" />
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
        {lastResult && !submitting ? (
          <Text
            style={[
              styles.lastResult,
              { color: lastResult.ok ? ACCENT : '#FCA5A5' },
            ]}
            numberOfLines={2}
          >
            {lastResult.ok
              ? `Last completed: #${lastResult.tracking}`
              : `Last error: ${lastResult.message}`}
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
    backgroundColor: '#0C1A2C',
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
    minWidth: 200,
    alignItems: 'center',
  },
  primaryBtnText: { color: '#06231A', fontWeight: '700', fontSize: 16 },
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
  statusText: { color: '#06231A', fontWeight: '700' },
  idleHint: { color: 'rgba(255,255,255,0.85)', fontSize: 13 },
  lastResult: { fontSize: 12 },
});
