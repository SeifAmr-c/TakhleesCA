import { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  Pressable,
  RefreshControl,
  SafeAreaView,
  StatusBar,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import BrandHeader from '../components/BrandHeader';
import { listCompanyApplications } from '../api';
import { brand, colors, statusPalette } from '../theme';

function formatDate(value) {
  if (!value) return '—';
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return '—';
  return d.toLocaleDateString(undefined, {
    year: 'numeric',
    month: 'short',
    day: '2-digit',
  });
}

function formatAmount(value) {
  const n = Number(value);
  if (!Number.isFinite(n)) return '—';
  return `EGP ${n.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

function ApplicationRow({ item }) {
  const palette = statusPalette(item.Status);
  return (
    <View style={styles.card}>
      <View style={styles.cardHeader}>
        <Text style={styles.tracking} numberOfLines={1}>
          #{item.TrackingNumber || `APP-${item.ApplicationID}`}
        </Text>
        <View style={[styles.statusPill, { backgroundColor: palette.bg }]}>
          <Text style={[styles.statusText, { color: palette.fg }]} numberOfLines={1}>
            {item.Status || 'Unknown'}
          </Text>
        </View>
      </View>

      <Text style={styles.client} numberOfLines={1}>
        {item.ClientName?.trim() || 'Unknown client'}
      </Text>

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
          <Text style={styles.metaValue}>{formatDate(item.SubmissionDate)}</Text>
        </View>
        <View style={styles.metaCell}>
          <Text style={styles.metaLabel}>Amount</Text>
          <Text style={styles.metaValue}>{formatAmount(item.Amount)}</Text>
        </View>
      </View>
    </View>
  );
}

export default function ApplicationsScreen({ session, onSignOut }) {
  const companyId = session?.companyId ?? session?.company?.CompanyID;
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState(null);
  const [rows, setRows] = useState([]);

  const load = useCallback(
    async (isRefresh) => {
      if (!companyId) {
        setError('No company associated with this session.');
        setLoading(false);
        setRefreshing(false);
        return;
      }
      if (isRefresh) setRefreshing(true);
      else setLoading(true);
      setError(null);
      try {
        const data = await listCompanyApplications(companyId);
        setRows(Array.isArray(data) ? data : []);
      } catch (e) {
        setError(e.message || 'Could not load applications.');
        if (e.status === 401) onSignOut?.();
      } finally {
        setLoading(false);
        setRefreshing(false);
      }
    },
    [companyId, onSignOut]
  );

  useEffect(() => {
    load(false);
  }, [load]);

  /* Silent refetch each time the tab gains focus so a freshly-scanned
     QR completion shows up as Completed without a manual pull-to-refresh
     when the user returns from the Scanner. */
  useFocusEffect(
    useCallback(() => {
      load(true);
    }, [load])
  );

  const companyName = session?.company?.Name || null;

  return (
    <SafeAreaView style={styles.root}>
      <StatusBar barStyle="dark-content" />

      <BrandHeader name={companyName} role="company" onSignOut={onSignOut} />

      {loading ? (
        <View style={styles.center}>
          <ActivityIndicator color={brand.tabActive} />
        </View>
      ) : error ? (
        <View style={styles.center}>
          <Text style={styles.errorTitle}>Could not load applications</Text>
          <Text style={styles.errorBody}>{error}</Text>
          <Pressable style={styles.retry} onPress={() => load(false)}>
            <Text style={styles.retryText}>Try again</Text>
          </Pressable>
        </View>
      ) : (
        <FlatList
          data={rows}
          keyExtractor={(item) => String(item.ApplicationID)}
          renderItem={({ item }) => <ApplicationRow item={item} />}
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
              <Text style={styles.emptyTitle}>No applications yet</Text>
              <Text style={styles.emptyBody}>
                Applications filed against your company will appear here.
              </Text>
            </View>
          }
        />
      )}
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
  listContent: {
    padding: 16,
    paddingBottom: 32,
    flexGrow: 1,
  },
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
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  tracking: {
    color: colors.harbor900,
    fontWeight: '700',
    fontSize: 15,
    letterSpacing: 0.5,
    flex: 1,
    marginRight: 12,
  },
  statusPill: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 999,
  },
  statusText: { fontWeight: '700', fontSize: 11, letterSpacing: 0.4 },
  client: {
    color: colors.steel700,
    fontSize: 13,
    marginBottom: 12,
  },
  metaRow: {
    flexDirection: 'row',
    marginTop: 6,
  },
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
});
