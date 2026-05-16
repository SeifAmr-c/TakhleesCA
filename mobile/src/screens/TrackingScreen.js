import { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  Modal,
  Pressable,
  RefreshControl,
  SafeAreaView,
  StatusBar,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import QRCode from 'react-native-qrcode-svg';
import BrandHeader from '../components/BrandHeader';
import { listClientApplications } from '../api';
import { brand, colors, statusPalette } from '../theme';

const STEPS = ['Accepted', 'In Progress', 'Completed'];

function formatDate(value) {
  if (!value) return null;
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return null;
  return d.toLocaleDateString(undefined, {
    year: 'numeric',
    month: 'short',
    day: '2-digit',
  });
}

/* Three-stage stepper. Pending is intentionally absent — the shipment
   only enters the visible journey once a company accepts it. Past
   stages render green (signalGo), the current stage renders amber
   (safety = "in motion"), and reaching Completed flips every dot to
   green to signal the whole leg is done. */
function ProgressDots({ status }) {
  const normalized = String(status || '').toLowerCase();
  const isCompleted = normalized === 'completed';
  let currentIdx;
  if (isCompleted) currentIdx = STEPS.length - 1;
  else if (normalized === 'in progress') currentIdx = 1;
  else if (normalized === 'accepted') currentIdx = 0;
  else currentIdx = -1; /* Pending or unknown — nothing reached yet. */

  return (
    <View style={styles.dots}>
      {STEPS.map((label, i) => {
        let dotStyle;
        if (isCompleted || i < currentIdx) dotStyle = styles.dotCompleted;
        else if (i === currentIdx) dotStyle = styles.dotActive;
        else dotStyle = styles.dotMuted;
        const reached = isCompleted || i <= currentIdx;
        return (
          <View key={label} style={styles.dotWrap}>
            <View style={[styles.dot, dotStyle]} />
            <Text
              style={[
                styles.dotLabel,
                reached ? styles.dotLabelActive : styles.dotLabelMuted,
              ]}
              numberOfLines={1}
            >
              {label}
            </Text>
          </View>
        );
      })}
    </View>
  );
}

function LockGlyph({ color = colors.harbor950, size = 14 }) {
  const shackleSize = size * 0.7;
  const shackleThickness = Math.max(1.5, size * 0.14);
  const bodyWidth = size;
  const bodyHeight = size * 0.7;
  return (
    <View style={{ alignItems: 'center', justifyContent: 'center', width: size, height: size }}>
      <View
        style={{
          width: shackleSize,
          height: shackleSize / 1.4,
          borderTopLeftRadius: shackleSize,
          borderTopRightRadius: shackleSize,
          borderWidth: shackleThickness,
          borderBottomWidth: 0,
          borderColor: color,
          marginBottom: -shackleThickness / 2,
        }}
      />
      <View
        style={{
          width: bodyWidth,
          height: bodyHeight,
          borderRadius: 2,
          backgroundColor: color,
        }}
      />
    </View>
  );
}

function QrModal({ visible, payload, trackingNumber, onClose }) {
  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onClose}
      statusBarTranslucent
    >
      <Pressable style={styles.modalBackdrop} onPress={onClose}>
        <Pressable style={styles.modalCard} onPress={() => { /* swallow */ }}>
          <Text style={styles.modalEyebrow}>Completion handshake</Text>
          <Text style={styles.modalTitle} numberOfLines={1}>
            #{trackingNumber}
          </Text>
          <View style={styles.qrFrame}>
            {payload ? (
              <QRCode value={payload} size={248} backgroundColor="#FFFFFF" color={colors.harbor950} />
            ) : null}
          </View>
          <Text style={styles.modalHint}>
            Show this QR code to the clearance company to complete your shipment.
          </Text>
          <Pressable style={styles.closeButton} onPress={onClose} hitSlop={8}>
            <Text style={styles.closeButtonText}>Close</Text>
          </Pressable>
        </Pressable>
      </Pressable>
    </Modal>
  );
}

function TrackingCard({ item, onReveal }) {
  const palette = statusPalette(item.Status);
  const submitted = formatDate(item.SubmissionDate);
  const completed = formatDate(item.CompletionDate);
  const inProgress = String(item.Status || '').toLowerCase() === 'in progress';
  const canReveal = inProgress && !!item.QrPayload;

  return (
    <View style={styles.card}>
      <View style={styles.cardHeader}>
        <View style={{ flex: 1, marginRight: 12 }}>
          <Text style={styles.tracking} numberOfLines={1}>
            #{item.TrackingNumber || `APP-${item.ApplicationID}`}
          </Text>
          <Text style={styles.company} numberOfLines={1}>
            {item.CompanyName || 'Unknown company'}
          </Text>
        </View>
        <View style={[styles.statusPill, { backgroundColor: palette.bg }]}>
          <Text style={[styles.statusText, { color: palette.fg }]} numberOfLines={1}>
            {item.Status || 'Unknown'}
          </Text>
        </View>
      </View>

      <ProgressDots status={item.Status} />

      <View style={styles.metaRow}>
        <View style={styles.metaCell}>
          <Text style={styles.metaLabel}>Category</Text>
          <Text style={styles.metaValue} numberOfLines={1}>
            {item.CategoryName || '—'}
          </Text>
        </View>
        <View style={styles.metaCell}>
          <Text style={styles.metaLabel}>Port</Text>
          <Text style={styles.metaValue} numberOfLines={1}>
            {item.PortName || '—'}
          </Text>
        </View>
      </View>

      <View style={styles.metaRow}>
        <View style={styles.metaCell}>
          <Text style={styles.metaLabel}>Submitted</Text>
          <Text style={styles.metaValue}>{submitted || '—'}</Text>
        </View>
        <View style={styles.metaCell}>
          <Text style={styles.metaLabel}>Completed</Text>
          <Text style={styles.metaValue}>{completed || '—'}</Text>
        </View>
      </View>

      {canReveal ? (
        <Pressable
          style={({ pressed }) => [
            styles.revealButton,
            pressed && styles.revealButtonPressed,
          ]}
          onPress={() => onReveal(item)}
        >
          <LockGlyph color={colors.harbor950} size={14} />
          <Text style={styles.revealButtonText}>Show QR Code</Text>
        </Pressable>
      ) : null}
    </View>
  );
}

export default function TrackingScreen({ session, onSignOut }) {
  const clientId = session?.userId ?? session?.user?.UserID;
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState(null);
  const [rows, setRows] = useState([]);
  const [revealed, setRevealed] = useState(null);

  const load = useCallback(
    async (isRefresh) => {
      if (!clientId) {
        setError('No client associated with this session.');
        setLoading(false);
        setRefreshing(false);
        return;
      }
      if (isRefresh) setRefreshing(true);
      else setLoading(true);
      setError(null);
      try {
        const data = await listClientApplications(clientId);
        setRows(Array.isArray(data) ? data : []);
      } catch (e) {
        setError(e.message || 'Could not load your shipments.');
        if (e.status === 401) onSignOut?.();
      } finally {
        setLoading(false);
        setRefreshing(false);
      }
    },
    [clientId, onSignOut]
  );

  useEffect(() => {
    load(false);
  }, [load]);

  const displayName =
    session?.user?.FirstName
      ? `${session.user.FirstName}${session.user.LastName ? ` ${session.user.LastName}` : ''}`
      : session?.user?.Email ?? null;

  return (
    <SafeAreaView style={styles.root}>
      <StatusBar barStyle="dark-content" />

      <BrandHeader name={displayName} role="user" onSignOut={onSignOut} />

      {loading ? (
        <View style={styles.center}>
          <ActivityIndicator color={brand.tabActive} />
        </View>
      ) : error ? (
        <View style={styles.center}>
          <Text style={styles.errorTitle}>Could not load shipments</Text>
          <Text style={styles.errorBody}>{error}</Text>
          <Pressable style={styles.retry} onPress={() => load(false)}>
            <Text style={styles.retryText}>Try again</Text>
          </Pressable>
        </View>
      ) : (
        <FlatList
          data={rows}
          keyExtractor={(item) => String(item.ApplicationID)}
          renderItem={({ item }) => (
            <TrackingCard item={item} onReveal={setRevealed} />
          )}
          contentContainerStyle={styles.listContent}
          ItemSeparatorComponent={() => <View style={{ height: 12 }} />}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={() => load(true)}
              tintColor={brand.tabActive}
              colors={[brand.tabActive]}
            />
          }
          ListEmptyComponent={
            <View style={styles.empty}>
              <Text style={styles.emptyTitle}>No shipments yet</Text>
              <Text style={styles.emptyBody}>
                File an application on the web to start tracking it here.
              </Text>
            </View>
          }
        />
      )}

      <QrModal
        visible={!!revealed}
        payload={revealed?.QrPayload}
        trackingNumber={revealed?.TrackingNumber || ''}
        onClose={() => setRevealed(null)}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#FFFFFF' },
  center: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
  },
  listContent: { padding: 16, paddingBottom: 32, flexGrow: 1 },
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    padding: 16,
    borderWidth: 1,
    borderColor: 'rgba(15, 35, 60, 0.10)',
    shadowColor: '#0A1623',
    shadowOpacity: 0.05,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 2 },
    elevation: 1,
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    marginBottom: 14,
  },
  tracking: {
    color: colors.harbor900,
    fontWeight: '700',
    fontSize: 15,
    letterSpacing: 0.5,
  },
  company: { color: colors.steel700, fontSize: 13, marginTop: 2 },
  statusPill: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 999,
  },
  statusText: { fontWeight: '700', fontSize: 11, letterSpacing: 0.4 },
  dots: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  dotWrap: {
    flex: 1,
    alignItems: 'center',
    paddingHorizontal: 2,
  },
  dot: {
    width: 10,
    height: 10,
    borderRadius: 999,
    marginBottom: 6,
  },
  dotActive: { backgroundColor: brand.tabActive },
  dotCompleted: { backgroundColor: colors.signalGo },
  dotMuted: { backgroundColor: 'rgba(15, 35, 60, 0.14)' },
  dotLabel: {
    fontSize: 10,
    letterSpacing: 0.3,
    textAlign: 'center',
  },
  dotLabelActive: { color: colors.harbor900, fontWeight: '600' },
  dotLabelMuted: { color: colors.steel500 },
  metaRow: { flexDirection: 'row', marginTop: 6 },
  metaCell: { flex: 1, paddingRight: 8 },
  metaLabel: {
    color: colors.steel500,
    fontSize: 10,
    letterSpacing: 0.8,
    textTransform: 'uppercase',
  },
  metaValue: {
    color: colors.harbor900,
    fontSize: 13,
    marginTop: 2,
    fontWeight: '500',
  },
  empty: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 24,
    paddingVertical: 64,
  },
  emptyTitle: {
    color: colors.harbor900,
    fontSize: 16,
    fontWeight: '700',
    marginBottom: 6,
  },
  emptyBody: {
    color: colors.steel700,
    fontSize: 13,
    textAlign: 'center',
  },
  errorTitle: {
    color: colors.harbor900,
    fontSize: 16,
    fontWeight: '700',
    marginBottom: 6,
  },
  errorBody: {
    color: colors.steel700,
    fontSize: 13,
    textAlign: 'center',
    marginBottom: 18,
  },
  retry: {
    backgroundColor: brand.tabActive,
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 12,
  },
  retryText: { color: colors.harbor950, fontWeight: '700' },
  revealButton: {
    marginTop: 16,
    backgroundColor: brand.tabActive,
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  revealButtonPressed: { opacity: 0.85 },
  revealButtonText: {
    color: colors.harbor950,
    fontWeight: '700',
    fontSize: 13,
    letterSpacing: 0.4,
  },
  modalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(5, 12, 22, 0.78)',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
  },
  modalCard: {
    width: '100%',
    maxWidth: 360,
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    paddingVertical: 24,
    paddingHorizontal: 20,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(15, 35, 60, 0.08)',
  },
  modalEyebrow: {
    color: colors.safety700,
    fontSize: 10,
    fontWeight: '700',
    letterSpacing: 1.6,
    textTransform: 'uppercase',
    marginBottom: 4,
  },
  modalTitle: {
    color: colors.harbor900,
    fontSize: 16,
    fontWeight: '700',
    letterSpacing: 0.5,
    marginBottom: 18,
  },
  qrFrame: {
    backgroundColor: '#FFFFFF',
    padding: 16,
    borderRadius: 16,
    marginBottom: 18,
    borderWidth: 1,
    borderColor: 'rgba(15, 35, 60, 0.10)',
  },
  modalHint: {
    color: colors.steel700,
    fontSize: 13,
    textAlign: 'center',
    marginBottom: 20,
    maxWidth: 280,
  },
  closeButton: {
    paddingVertical: 10,
    paddingHorizontal: 28,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: brand.tabActive,
  },
  closeButtonText: {
    color: brand.tabActive,
    fontWeight: '700',
    letterSpacing: 0.4,
  },
});
