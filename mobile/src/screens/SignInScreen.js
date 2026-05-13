import { useRef, useState } from 'react';
import {
  ActivityIndicator,
  Image,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { Video, ResizeMode } from 'expo-av';
import { BlurView } from 'expo-blur';
import { loginCompany, loginUser } from '../api';
import { brand, colors } from '../theme';

const ROLES = [
  { key: 'company', label: 'Company' },
  { key: 'client', label: 'Client' },
];

export default function SignInScreen({ onSignedIn }) {
  const [role, setRole] = useState('company');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState(null);
  const passwordRef = useRef(null);

  const canSubmit = email.trim().length > 0 && password.length > 0 && !submitting;

  async function handleSubmit() {
    if (!canSubmit) return;
    setError(null);
    setSubmitting(true);
    try {
      const session =
        role === 'company'
          ? await loginCompany(email.trim(), password)
          : await loginUser(email.trim(), password);
      onSignedIn?.(session);
    } catch (e) {
      setError(e.message || 'Could not sign in.');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <View style={styles.root}>
      <StatusBar barStyle="light-content" />
      <Video
        source={require('../../assets/signInVideo.mp4')}
        style={StyleSheet.absoluteFill}
        resizeMode={ResizeMode.COVER}
        isLooping
        shouldPlay
        isMuted
        useNativeControls={false}
        rate={1.0}
      />
      <View style={styles.darkOverlay} pointerEvents="none" />

      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        style={styles.flex}
      >
        <ScrollView
          contentContainerStyle={styles.scroll}
          keyboardShouldPersistTaps="handled"
        >
          <View style={styles.header}>
            <Image
              source={require('../../assets/icon.png')}
              style={styles.logo}
              resizeMode="contain"
            />
            <Text style={styles.title}>Takhlees</Text>
            <Text style={styles.subtitle}>
              {role === 'company' ? 'Company portal' : 'Client portal'}
            </Text>
          </View>

          <BlurView intensity={40} tint="dark" style={styles.card}>
            <View style={styles.segment}>
              {ROLES.map((r) => {
                const active = role === r.key;
                return (
                  <Pressable
                    key={r.key}
                    onPress={() => {
                      if (submitting) return;
                      setRole(r.key);
                      setError(null);
                    }}
                    style={[styles.segmentItem, active && styles.segmentItemActive]}
                  >
                    <Text
                      style={[
                        styles.segmentText,
                        active && styles.segmentTextActive,
                      ]}
                    >
                      {r.label}
                    </Text>
                  </Pressable>
                );
              })}
            </View>

            <Text style={styles.cardTitle}>Sign in</Text>
            <Text style={styles.cardHint}>
              {role === 'company'
                ? 'Use the email and password for your company account.'
                : 'Use the email and password for your client account.'}
            </Text>

            <Text style={styles.label}>Email</Text>
            <TextInput
              value={email}
              onChangeText={setEmail}
              autoCapitalize="none"
              autoComplete="email"
              keyboardType="email-address"
              returnKeyType="next"
              onSubmitEditing={() => passwordRef.current?.focus()}
              placeholder={
                role === 'company' ? 'company@example.com' : 'you@example.com'
              }
              placeholderTextColor="rgba(255,255,255,0.4)"
              style={styles.input}
              editable={!submitting}
            />

            <Text style={styles.label}>Password</Text>
            <TextInput
              ref={passwordRef}
              value={password}
              onChangeText={setPassword}
              secureTextEntry
              autoCapitalize="none"
              autoComplete="password"
              returnKeyType="go"
              onSubmitEditing={handleSubmit}
              placeholder="Your password"
              placeholderTextColor="rgba(255,255,255,0.4)"
              style={styles.input}
              editable={!submitting}
            />

            {error ? <Text style={styles.error}>{error}</Text> : null}

            <Pressable
              onPress={handleSubmit}
              disabled={!canSubmit}
              style={({ pressed }) => [
                styles.button,
                !canSubmit && styles.buttonDisabled,
                pressed && canSubmit && styles.buttonPressed,
              ]}
            >
              {submitting ? (
                <ActivityIndicator color={colors.harbor950} />
              ) : (
                <Text style={styles.buttonText}>Sign In</Text>
              )}
            </Pressable>
          </BlurView>

          <Text style={styles.footer}>
            {role === 'company'
              ? 'Scan completion QR codes after signing in.'
              : 'Track your shipments after signing in.'}
          </Text>
        </ScrollView>
      </KeyboardAvoidingView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: brand.background },
  flex: { flex: 1 },
  darkOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(8,14,26,0.6)',
  },
  scroll: {
    flexGrow: 1,
    paddingHorizontal: 24,
    paddingTop: 80,
    paddingBottom: 48,
    justifyContent: 'center',
  },
  header: { alignItems: 'center', marginBottom: 28 },
  logo: { width: 72, height: 72, marginBottom: 12 },
  title: {
    color: brand.text,
    fontSize: 32,
    fontWeight: '700',
    letterSpacing: 0.5,
  },
  subtitle: {
    color: brand.textSoft,
    fontSize: 14,
    marginTop: 4,
    letterSpacing: 1.2,
    textTransform: 'uppercase',
  },
  card: {
    borderRadius: 20,
    padding: 22,
    overflow: 'hidden',
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: 'rgba(255,255,255,0.15)',
    backgroundColor: 'rgba(15,23,42,0.45)',
  },
  segment: {
    flexDirection: 'row',
    backgroundColor: 'rgba(255,255,255,0.06)',
    borderRadius: 12,
    padding: 4,
    marginBottom: 18,
  },
  segmentItem: {
    flex: 1,
    paddingVertical: 10,
    alignItems: 'center',
    borderRadius: 9,
  },
  segmentItemActive: {
    backgroundColor: brand.tabActive,
  },
  segmentText: {
    color: brand.textSoft,
    fontWeight: '600',
    fontSize: 13,
    letterSpacing: 0.4,
  },
  segmentTextActive: {
    color: colors.harbor950,
  },
  cardTitle: { color: brand.text, fontSize: 22, fontWeight: '700' },
  cardHint: {
    color: brand.textSoft,
    fontSize: 13,
    marginTop: 4,
    marginBottom: 18,
  },
  label: {
    color: 'rgba(255,255,255,0.85)',
    fontSize: 12,
    letterSpacing: 0.8,
    textTransform: 'uppercase',
    marginBottom: 6,
    marginTop: 12,
  },
  input: {
    backgroundColor: 'rgba(255,255,255,0.08)',
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: Platform.OS === 'ios' ? 14 : 10,
    color: brand.text,
    fontSize: 16,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: 'rgba(255,255,255,0.18)',
  },
  error: {
    color: '#FCA5A5',
    marginTop: 14,
    fontSize: 13,
  },
  button: {
    marginTop: 22,
    backgroundColor: brand.tabActive,
    paddingVertical: 14,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: colors.safety700,
    shadowOpacity: 0.4,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 6 },
    elevation: 3,
  },
  buttonPressed: { backgroundColor: colors.safety700 },
  buttonDisabled: { backgroundColor: 'rgba(244,161,54,0.4)' },
  buttonText: {
    color: colors.harbor950,
    fontSize: 16,
    fontWeight: '700',
    letterSpacing: 0.5,
  },
  footer: {
    color: brand.textFaint,
    fontSize: 12,
    textAlign: 'center',
    marginTop: 24,
  },
});
