import { Image, Pressable, StyleSheet, Text, View } from 'react-native';
import { brand, colors } from '../theme';

/* Logo asset placeholder — drop `assets/logo.png` in and update the
   require below to swap the artwork. The existing app icon is used as
   a stand-in so the header renders before the real logo lands. */
const LOGO = require('../../assets/icon.png');

export default function BrandHeader({ name, role, onSignOut }) {
  const fallback = role === 'company' ? 'Company' : 'User';
  const display = (name && String(name).trim()) || fallback;
  return (
    <View style={styles.wrap}>
      <View style={styles.side}>
        <Text style={styles.greeting} numberOfLines={1}>
          Hello {display}
        </Text>
      </View>
      <View style={styles.logoWrap} pointerEvents="none">
        <Image source={LOGO} style={styles.logo} resizeMode="contain" />
      </View>
      <View style={[styles.side, styles.sideRight]}>
        {onSignOut ? (
          <Pressable onPress={onSignOut} hitSlop={12}>
            <Text style={styles.signOut}>Sign out</Text>
          </Pressable>
        ) : null}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    height: 64,
    paddingHorizontal: 20,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: 'rgba(15, 35, 60, 0.08)',
  },
  side: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
  },
  sideRight: {
    justifyContent: 'flex-end',
  },
  greeting: {
    color: colors.harbor900,
    fontSize: 15,
    fontWeight: '700',
    letterSpacing: 0.3,
  },
  logoWrap: {
    alignItems: 'center',
    justifyContent: 'center',
    width: 96,
  },
  logo: {
    width: 56,
    height: 40,
  },
  signOut: {
    color: brand.tabActive,
    fontWeight: '700',
    fontSize: 13,
    letterSpacing: 0.4,
  },
});
