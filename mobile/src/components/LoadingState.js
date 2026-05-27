import { useEffect, useRef, useState } from 'react';
import { ActivityIndicator, Animated, StyleSheet, Text, View } from 'react-native';
import { brand, colors } from '../theme';

/* Spinner shown while a screen's first fetch is in flight. The backend
   runs on a free tier that spins down when idle, so the first request
   after a gap can take a minute or more while the server cold starts.
   After WARMUP_MS we fade in a reassuring line so that wait reads as
   "waking up", not "frozen". Fast loads finish before the timer fires
   and never show the message. */
const WARMUP_MS = 5000;

export default function LoadingState({
  warmupTitle = 'Waking up the server…',
  warmupHint = 'This can take a moment after the app has been idle.',
}) {
  const [warming, setWarming] = useState(false);
  const opacity = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const timer = setTimeout(() => setWarming(true), WARMUP_MS);
    return () => clearTimeout(timer);
  }, []);

  useEffect(() => {
    if (!warming) return;
    Animated.timing(opacity, {
      toValue: 1,
      duration: 400,
      useNativeDriver: true,
    }).start();
  }, [warming, opacity]);

  return (
    <View style={styles.center}>
      <ActivityIndicator color={brand.tabActive} />
      {warming ? (
        <Animated.View style={[styles.textWrap, { opacity }]}>
          <Text style={styles.title}>{warmupTitle}</Text>
          <Text style={styles.hint}>{warmupHint}</Text>
        </Animated.View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  center: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
  },
  textWrap: { marginTop: 18, alignItems: 'center', maxWidth: 280 },
  title: {
    color: colors.harbor900,
    fontSize: 15,
    fontWeight: '700',
    textAlign: 'center',
  },
  hint: {
    color: colors.steel700,
    fontSize: 13,
    textAlign: 'center',
    marginTop: 6,
  },
});
