import { StyleSheet, Text, View } from 'react-native';

/* Tiny glyph icons rendered with stacked View primitives so the app
   doesn't need to pull in an icon font. Each shape is intentionally
   geometric to match the industrial maritime aesthetic of the web
   design system (flat surfaces, hairlines, no gradients). */
export default function TabIcon({ name, color, focused }) {
  const stroke = color;
  if (name === 'applications') {
    return (
      <View style={styles.box}>
        <View style={[styles.docOuter, { borderColor: stroke }]}>
          <View style={[styles.docLine, { backgroundColor: stroke }]} />
          <View style={[styles.docLine, { backgroundColor: stroke }]} />
          <View
            style={[
              styles.docLine,
              { backgroundColor: stroke, width: 10 },
            ]}
          />
        </View>
      </View>
    );
  }
  if (name === 'scanner') {
    return (
      <View style={styles.box}>
        <View style={styles.scanFrame}>
          <View style={[styles.corner, styles.cornerTL, { borderColor: stroke }]} />
          <View style={[styles.corner, styles.cornerTR, { borderColor: stroke }]} />
          <View style={[styles.corner, styles.cornerBL, { borderColor: stroke }]} />
          <View style={[styles.corner, styles.cornerBR, { borderColor: stroke }]} />
          <View
            style={[
              styles.scanLine,
              { backgroundColor: stroke, opacity: focused ? 1 : 0.6 },
            ]}
          />
        </View>
      </View>
    );
  }
  if (name === 'tracking') {
    return (
      <View style={styles.box}>
        <View style={[styles.pinOuter, { borderColor: stroke }]}>
          <View style={[styles.pinDot, { backgroundColor: stroke }]} />
        </View>
      </View>
    );
  }
  if (name === 'settings') {
    /* Gear stand-in: a hairline ring with four notches arranged around
       it. Doesn't try to be a literal cog because the rest of the icon
       set is also stylized geometry. */
    return (
      <View style={styles.box}>
        <View style={[styles.gearTeeth, styles.gearTeethV, { backgroundColor: stroke }]} />
        <View style={[styles.gearTeeth, styles.gearTeethH, { backgroundColor: stroke }]} />
        <View style={[styles.gearRing, { borderColor: stroke }]} />
        <View style={[styles.gearHub, { backgroundColor: stroke }]} />
      </View>
    );
  }
  return (
    <View style={styles.box}>
      <Text style={{ color: stroke }}>•</Text>
    </View>
  );
}

const ICON = 22;

const styles = StyleSheet.create({
  box: {
    width: ICON,
    height: ICON,
    alignItems: 'center',
    justifyContent: 'center',
  },
  docOuter: {
    width: 16,
    height: 20,
    borderWidth: 1.5,
    borderRadius: 2,
    padding: 2,
    justifyContent: 'space-between',
  },
  docLine: {
    height: 1.5,
    width: '100%',
    borderRadius: 1,
  },
  scanFrame: {
    width: 18,
    height: 18,
    position: 'relative',
  },
  corner: {
    position: 'absolute',
    width: 6,
    height: 6,
    borderWidth: 0,
  },
  cornerTL: { top: 0, left: 0, borderTopWidth: 1.5, borderLeftWidth: 1.5 },
  cornerTR: { top: 0, right: 0, borderTopWidth: 1.5, borderRightWidth: 1.5 },
  cornerBL: { bottom: 0, left: 0, borderBottomWidth: 1.5, borderLeftWidth: 1.5 },
  cornerBR: { bottom: 0, right: 0, borderBottomWidth: 1.5, borderRightWidth: 1.5 },
  scanLine: {
    position: 'absolute',
    left: 2,
    right: 2,
    top: 8,
    height: 1.5,
    borderRadius: 1,
  },
  pinOuter: {
    width: 16,
    height: 16,
    borderRadius: 999,
    borderWidth: 1.5,
    alignItems: 'center',
    justifyContent: 'center',
  },
  pinDot: {
    width: 4,
    height: 4,
    borderRadius: 999,
  },
  gearRing: {
    position: 'absolute',
    width: 14,
    height: 14,
    borderRadius: 999,
    borderWidth: 1.5,
  },
  gearHub: {
    position: 'absolute',
    width: 4,
    height: 4,
    borderRadius: 999,
  },
  gearTeeth: {
    position: 'absolute',
    borderRadius: 1,
  },
  gearTeethV: {
    width: 2,
    height: 20,
  },
  gearTeethH: {
    width: 20,
    height: 2,
  },
});
