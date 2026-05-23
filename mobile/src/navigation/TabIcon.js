import { StyleSheet, Text, View } from 'react-native';
import Svg, { Circle, Path } from 'react-native-svg';

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
    /* Eight-tooth cog drawn from polar coordinates: outer radius 9 for
       the tooth tips, inner radius 7 for the valleys, hub 2.8. Rendered
       at 20×20 inside the 22×22 box so the teeth don't kiss the edges
       like the other icons. */
    return (
      <View style={styles.box}>
        <Svg width={20} height={20} viewBox="0 0 24 24" fill="none">
          <Path
            d="M10.24 3.17L13.76 3.17L13.36 5.13L15.89 6.18L17 4.52L19.48 7L17.82 8.11L18.87 10.64L20.83 10.24L20.83 13.76L18.87 13.36L17.82 15.89L19.48 17L17 19.48L15.89 17.82L13.36 18.87L13.76 20.83L10.24 20.83L10.64 18.87L8.11 17.82L7 19.48L4.52 17L6.18 15.89L5.13 13.36L3.17 13.76L3.17 10.24L5.13 10.64L6.18 8.11L4.52 7L7 4.52L8.11 6.18L10.64 5.13Z"
            stroke={stroke}
            strokeWidth={1.6}
            strokeLinejoin="round"
            fill={focused ? stroke : 'none'}
            fillOpacity={focused ? 0.12 : 0}
          />
          <Circle cx={12} cy={12} r={2.8} stroke={stroke} strokeWidth={1.6} fill="none" />
        </Svg>
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
});
