import { useCallback, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Linking,
  Modal,
  Pressable,
  SafeAreaView,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import Svg, { Path, Circle, Rect } from 'react-native-svg';
import {
  canDeleteCompanyAccount,
  canDeleteUser,
  deleteCompanyAccount,
  deleteUserAccount,
} from '../api';
import { PRIVACY_URL, SUPPORT_URL, TERMS_URL, WEB_URL } from '../../config';
import { colors } from '../theme';

const CONFIRM_PHRASE = 'DELETE';

/* Tiny stroked glyphs — keeps the bundle lean and matches the rest of
   the mobile UI (TabIcon, EyeIcon). */
function Glyph({ name, color = colors.harbor700, size = 20 }) {
  const stroke = color;
  const sw = 1.8;
  if (name === 'lock') {
    return (
      <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
        <Rect x={4} y={11} width={16} height={10} rx={2} stroke={stroke} strokeWidth={sw} />
        <Path d="M8 11V8a4 4 0 1 1 8 0v3" stroke={stroke} strokeWidth={sw} strokeLinecap="round" />
      </Svg>
    );
  }
  if (name === 'doc') {
    return (
      <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
        <Path d="M7 3h7l5 5v13H7z" stroke={stroke} strokeWidth={sw} strokeLinejoin="round" />
        <Path d="M14 3v5h5" stroke={stroke} strokeWidth={sw} strokeLinejoin="round" />
        <Path d="M9 13h6M9 17h6" stroke={stroke} strokeWidth={sw} strokeLinecap="round" />
      </Svg>
    );
  }
  if (name === 'help') {
    return (
      <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
        <Circle cx={12} cy={12} r={9} stroke={stroke} strokeWidth={sw} />
        <Path d="M9.5 9.5a2.5 2.5 0 1 1 3.6 2.24c-.8.43-1.1.96-1.1 1.76V14" stroke={stroke} strokeWidth={sw} strokeLinecap="round" />
        <Circle cx={12} cy={17} r={0.9} fill={stroke} />
      </Svg>
    );
  }
  if (name === 'globe') {
    return (
      <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
        <Circle cx={12} cy={12} r={9} stroke={stroke} strokeWidth={sw} />
        <Path d="M3 12h18M12 3c3 3 3 15 0 18M12 3c-3 3-3 15 0 18" stroke={stroke} strokeWidth={sw} />
      </Svg>
    );
  }
  if (name === 'logout') {
    return (
      <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
        <Path d="M14 3H6a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h8" stroke={stroke} strokeWidth={sw} strokeLinecap="round" strokeLinejoin="round" />
        <Path d="M17 8l4 4-4 4M21 12H10" stroke={stroke} strokeWidth={sw} strokeLinecap="round" strokeLinejoin="round" />
      </Svg>
    );
  }
  if (name === 'trash') {
    return (
      <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
        <Path d="M4 7h16M9 7V5a2 2 0 0 1 2-2h2a2 2 0 0 1 2 2v2M6 7l1 13a2 2 0 0 0 2 2h6a2 2 0 0 0 2-2l1-13" stroke={stroke} strokeWidth={sw} strokeLinecap="round" strokeLinejoin="round" />
        <Path d="M10 11v7M14 11v7" stroke={stroke} strokeWidth={sw} strokeLinecap="round" />
      </Svg>
    );
  }
  if (name === 'chevron') {
    return (
      <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
        <Path d="M9 6l6 6-6 6" stroke={stroke} strokeWidth={sw} strokeLinecap="round" strokeLinejoin="round" />
      </Svg>
    );
  }
  return null;
}

function Row({ icon, title, subtitle, onPress, danger, disabled, accessibilityHint }) {
  const tint = danger ? colors.signalStop : colors.harbor700;
  return (
    <Pressable
      onPress={onPress}
      disabled={disabled}
      accessibilityRole="button"
      accessibilityLabel={title}
      accessibilityHint={accessibilityHint}
      style={({ pressed }) => [
        styles.row,
        pressed && !disabled && styles.rowPressed,
        disabled && styles.rowDisabled,
      ]}
    >
      <View style={[styles.rowIcon, danger && styles.rowIconDanger]}>
        <Glyph name={icon} color={tint} />
      </View>
      <View style={{ flex: 1, minWidth: 0 }}>
        <Text style={[styles.rowTitle, danger && { color: colors.signalStop }]} numberOfLines={1}>
          {title}
        </Text>
        {subtitle ? (
          <Text style={styles.rowSubtitle} numberOfLines={2}>
            {subtitle}
          </Text>
        ) : null}
      </View>
      <Glyph name="chevron" color={danger ? colors.signalStop : colors.steel500} size={18} />
    </Pressable>
  );
}

function SectionHeader({ children }) {
  return <Text style={styles.sectionHeader}>{children}</Text>;
}

export default function SettingsScreen({ session, onSignOut }) {
  const role = session?.role;
  const isCompany = role === 'company';

  /* The session blob is set by api.loginUser/loginCompany. Pull display
     fields defensively — older builds may have stored without them. */
  const displayName = isCompany
    ? session?.company?.Name || 'Company'
    : [session?.user?.FirstName, session?.user?.LastName].filter(Boolean).join(' ').trim() || 'User';

  const displayEmail = isCompany
    ? session?.company?.ContactEmail || '—'
    : session?.user?.Email || '—';

  const [confirmOpen, setConfirmOpen] = useState(false);
  const [phrase, setPhrase] = useState('');
  const [deleting, setDeleting] = useState(false);
  const [checking, setChecking] = useState(false);
  const [error, setError] = useState(null);

  const openLink = useCallback(async (url, label) => {
    try {
      const supported = await Linking.canOpenURL(url);
      if (!supported) throw new Error('Cannot open link');
      await Linking.openURL(url);
    } catch {
      Alert.alert(label, `Open this link in your browser:\n\n${url}`);
    }
  }, []);

  const handleSignOut = useCallback(() => {
    Alert.alert('Sign out', 'You will need to sign in again to access your account.', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Sign out',
        style: 'destructive',
        onPress: () => onSignOut?.(),
      },
    ]);
  }, [onSignOut]);

  const startDelete = useCallback(async () => {
    setError(null);
    setChecking(true);
    try {
      /* Pre-flight: ask the server whether any active applications would
         block deletion. Same gate the web settings page uses. */
      const check = isCompany ? await canDeleteCompanyAccount() : await canDeleteUser();
      if (check?.hasActiveApplications) {
        setChecking(false);
        Alert.alert(
          'Active applications found',
          isCompany
            ? "You have applications that are pending or in progress. Finish or cancel them before deleting your company account."
            : "You have applications that are pending or in progress. Finish or cancel them before deleting your account."
        );
        return;
      }
      setChecking(false);
      setPhrase('');
      setConfirmOpen(true);
    } catch (err) {
      setChecking(false);
      Alert.alert("Couldn't check account status", err?.message || 'Please try again.');
    }
  }, [isCompany]);

  const confirmDelete = useCallback(async () => {
    if (phrase.trim().toUpperCase() !== CONFIRM_PHRASE) {
      setError(`Type ${CONFIRM_PHRASE} to confirm.`);
      return;
    }
    setError(null);
    setDeleting(true);
    try {
      if (isCompany) {
        await deleteCompanyAccount();
      } else {
        await deleteUserAccount();
      }
      setDeleting(false);
      setConfirmOpen(false);
      /* App.js shows SignInScreen whenever session === null, so calling
         onSignOut here is what actually transitions the UI. The api
         helpers have already wiped the stored cookie + role blob. */
      Alert.alert(
        'Account deleted',
        'Your account and personal data have been removed. Completed shipment records are anonymized and retained as required by Egyptian customs law.',
        [{ text: 'OK', onPress: () => onSignOut?.() }]
      );
    } catch (err) {
      setDeleting(false);
      setError(err?.message || 'Failed to delete account. Please try again.');
    }
  }, [phrase, isCompany, onSignOut]);

  return (
    <SafeAreaView style={styles.safe}>
      <StatusBar barStyle="dark-content" />
      <ScrollView
        contentContainerStyle={styles.scroll}
        showsVerticalScrollIndicator={false}
      >
        <Text style={styles.title}>Settings</Text>

        <View style={styles.accountCard}>
          <View style={styles.accountAvatar}>
            <Text style={styles.accountAvatarText}>
              {(displayName || '?').slice(0, 1).toUpperCase()}
            </Text>
          </View>
          <View style={{ flex: 1, minWidth: 0 }}>
            <Text style={styles.accountName} numberOfLines={1}>{displayName}</Text>
            <Text style={styles.accountEmail} numberOfLines={1}>{displayEmail}</Text>
            <Text style={styles.accountMeta} numberOfLines={1}>
              {isCompany ? 'Company' : 'Client'}
            </Text>
          </View>
        </View>

        <SectionHeader>Legal</SectionHeader>
        <View style={styles.group}>
          <Row
            icon="lock"
            title="Privacy Policy"
            subtitle="What we collect, why, and how long we keep it."
            onPress={() => openLink(PRIVACY_URL, 'Privacy Policy')}
            accessibilityHint="Opens the Privacy Policy on takhlees.com"
          />
          <View style={styles.divider} />
          <Row
            icon="doc"
            title="Terms of Service"
            subtitle="The agreement between you and Takhlees."
            onPress={() => openLink(TERMS_URL, 'Terms of Service')}
            accessibilityHint="Opens the Terms of Service on takhlees.com"
          />
        </View>

        <SectionHeader>Support</SectionHeader>
        <View style={styles.group}>
          <Row
            icon="help"
            title="Contact support"
            subtitle="Reach the Takhlees team."
            onPress={() => openLink(SUPPORT_URL, 'Contact support')}
          />
          <View style={styles.divider} />
          <Row
            icon="globe"
            title="Visit our website"
            subtitle={WEB_URL.replace(/^https?:\/\//, '')}
            onPress={() => openLink(WEB_URL, 'Takhlees website')}
          />
        </View>

        <SectionHeader>Session</SectionHeader>
        <View style={styles.group}>
          <Row
            icon="logout"
            title="Sign out"
            subtitle="Sign back in any time to pick up where you left off."
            onPress={handleSignOut}
          />
        </View>

        <SectionHeader>Danger zone</SectionHeader>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Delete account"
          onPress={startDelete}
          disabled={checking}
          style={({ pressed }) => [
            styles.deleteButton,
            pressed && !checking && styles.deleteButtonPressed,
            checking && { opacity: 0.6 },
          ]}
        >
          {checking ? (
            <ActivityIndicator color="#FFFFFF" />
          ) : (
            <>
              <Glyph name="trash" color="#FFFFFF" size={22} />
              <Text style={styles.deleteButtonText}>Delete account</Text>
            </>
          )}
        </Pressable>
        <Text style={styles.dangerHelp}>
          Permanently removes your {isCompany ? 'company' : ''} account and personal
          data. Completed shipment records are anonymized and kept to satisfy
          Egyptian customs record-keeping law. This cannot be undone.
        </Text>

        <View style={{ height: 32 }} />

        <Text style={styles.versionText}>
          Takhlees · {isCompany ? 'Company' : 'Client'} app
        </Text>
      </ScrollView>

      <Modal
        visible={confirmOpen}
        animationType="fade"
        transparent
        onRequestClose={() => !deleting && setConfirmOpen(false)}
      >
        <View style={styles.modalBackdrop}>
          <View style={styles.modalCard}>
            <View style={styles.modalBadge}>
              <Glyph name="trash" color={colors.signalStop} size={26} />
            </View>
            <Text style={styles.modalTitle}>Delete your account?</Text>
            <Text style={styles.modalBody}>
              This action is permanent. We&rsquo;ll remove your profile and
              personal data immediately. Completed shipment records are kept
              in anonymized form because Egyptian customs law requires it.
            </Text>
            <Text style={styles.modalLabel}>
              Type {CONFIRM_PHRASE} to confirm
            </Text>
            <TextInput
              value={phrase}
              onChangeText={(v) => {
                setPhrase(v);
                if (error) setError(null);
              }}
              autoCapitalize="characters"
              autoCorrect={false}
              editable={!deleting}
              placeholder={CONFIRM_PHRASE}
              placeholderTextColor={colors.steel500}
              style={styles.modalInput}
            />
            {error ? <Text style={styles.modalError}>{error}</Text> : null}

            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Confirm delete account"
              onPress={confirmDelete}
              disabled={deleting}
              style={({ pressed }) => [
                styles.modalDelete,
                pressed && !deleting && styles.deleteButtonPressed,
                deleting && { opacity: 0.6 },
              ]}
            >
              {deleting ? (
                <ActivityIndicator color="#FFFFFF" />
              ) : (
                <Text style={styles.modalDeleteText}>Delete my account</Text>
              )}
            </Pressable>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Cancel"
              onPress={() => setConfirmOpen(false)}
              disabled={deleting}
              style={({ pressed }) => [
                styles.modalCancel,
                pressed && { backgroundColor: colors.steel100 },
              ]}
            >
              <Text style={styles.modalCancelText}>Cancel</Text>
            </Pressable>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: '#FFFFFF' },
  scroll: {
    paddingHorizontal: 20,
    paddingTop: 12,
    paddingBottom: 40,
  },
  title: {
    fontSize: 28,
    fontWeight: '800',
    color: colors.harbor950,
    letterSpacing: -0.4,
    marginBottom: 16,
  },
  accountCard: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    borderRadius: 14,
    backgroundColor: colors.harbor50,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: 'rgba(15,35,60,0.10)',
    gap: 14,
    marginBottom: 24,
  },
  accountAvatar: {
    width: 48,
    height: 48,
    borderRadius: 999,
    backgroundColor: colors.harbor700,
    alignItems: 'center',
    justifyContent: 'center',
  },
  accountAvatarText: {
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: '700',
  },
  accountName: {
    color: colors.harbor950,
    fontSize: 16,
    fontWeight: '700',
  },
  accountEmail: {
    color: colors.steel700,
    fontSize: 13,
    marginTop: 2,
  },
  accountMeta: {
    color: colors.steel500,
    fontSize: 11,
    marginTop: 4,
    fontWeight: '600',
    letterSpacing: 0.4,
    textTransform: 'uppercase',
  },
  sectionHeader: {
    color: colors.steel500,
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 1.2,
    textTransform: 'uppercase',
    marginTop: 8,
    marginBottom: 8,
    paddingHorizontal: 4,
  },
  group: {
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: 'rgba(15,35,60,0.10)',
    overflow: 'hidden',
    marginBottom: 20,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 14,
    gap: 12,
    backgroundColor: '#FFFFFF',
  },
  rowPressed: {
    backgroundColor: colors.harbor50,
  },
  rowDisabled: { opacity: 0.5 },
  rowIcon: {
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: colors.harbor50,
    alignItems: 'center',
    justifyContent: 'center',
  },
  rowIconDanger: {
    backgroundColor: colors.signalStopBg,
  },
  rowTitle: {
    color: colors.harbor950,
    fontSize: 15,
    fontWeight: '600',
  },
  rowSubtitle: {
    color: colors.steel500,
    fontSize: 12,
    marginTop: 2,
    lineHeight: 16,
  },
  divider: {
    height: StyleSheet.hairlineWidth,
    backgroundColor: 'rgba(15,35,60,0.10)',
    marginLeft: 62,
  },
  deleteButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    backgroundColor: colors.signalStop,
    paddingVertical: 16,
    borderRadius: 14,
    shadowColor: colors.signalStop,
    shadowOpacity: 0.25,
    shadowRadius: 14,
    shadowOffset: { width: 0, height: 6 },
    elevation: 2,
  },
  deleteButtonPressed: {
    backgroundColor: '#9C2A23',
    shadowOpacity: 0.1,
  },
  deleteButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '700',
    letterSpacing: 0.3,
  },
  dangerHelp: {
    marginTop: 12,
    color: colors.steel700,
    fontSize: 12,
    lineHeight: 18,
    paddingHorizontal: 4,
  },
  versionText: {
    textAlign: 'center',
    color: colors.steel500,
    fontSize: 11,
    fontWeight: '600',
    letterSpacing: 1,
    textTransform: 'uppercase',
  },
  modalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(10, 22, 35, 0.6)',
    justifyContent: 'center',
    paddingHorizontal: 24,
  },
  modalCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 18,
    padding: 22,
  },
  modalBadge: {
    width: 56,
    height: 56,
    borderRadius: 14,
    backgroundColor: colors.signalStopBg,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 14,
  },
  modalTitle: {
    fontSize: 19,
    fontWeight: '800',
    color: colors.harbor950,
    marginBottom: 8,
  },
  modalBody: {
    fontSize: 13,
    color: colors.steel700,
    lineHeight: 19,
    marginBottom: 16,
  },
  modalLabel: {
    fontSize: 11,
    fontWeight: '700',
    color: colors.steel500,
    letterSpacing: 1,
    textTransform: 'uppercase',
    marginBottom: 6,
  },
  modalInput: {
    borderWidth: 1,
    borderColor: 'rgba(15,35,60,0.18)',
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 12,
    fontSize: 15,
    fontWeight: '700',
    letterSpacing: 1,
    color: colors.harbor950,
    marginBottom: 14,
  },
  modalError: {
    color: colors.signalStop,
    fontSize: 12,
    marginTop: -6,
    marginBottom: 12,
  },
  modalDelete: {
    backgroundColor: colors.signalStop,
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: 'center',
    marginBottom: 8,
  },
  modalDeleteText: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '700',
    letterSpacing: 0.3,
  },
  modalCancel: {
    paddingVertical: 12,
    borderRadius: 12,
    alignItems: 'center',
  },
  modalCancelText: {
    color: colors.harbor700,
    fontSize: 15,
    fontWeight: '600',
  },
});
