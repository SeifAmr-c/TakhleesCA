import { useCallback, useEffect, useState } from 'react';
import { StatusBar } from 'expo-status-bar';
import { ActivityIndicator, StyleSheet, View } from 'react-native';
import { NavigationContainer, DarkTheme } from '@react-navigation/native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import SignInScreen from './src/screens/SignInScreen';
import CompanyNavigator from './src/navigation/CompanyNavigator';
import UserNavigator from './src/navigation/UserNavigator';
import {
  clearStoredCookie,
  clearStoredSession,
  getStoredCookie,
  getStoredSession,
  logoutCompany,
  logoutUser,
} from './src/api';
import { brand } from './src/theme';

/* React Navigation theme threaded through NavigationContainer so the
   default background between screen transitions matches our app
   chrome (otherwise transitions briefly flash white on Android). */
const navTheme = {
  ...DarkTheme,
  colors: {
    ...DarkTheme.colors,
    background: brand.background,
    card: brand.tabBarBg,
    primary: brand.tabActive,
    text: brand.text,
    border: brand.tabBarBorder,
  },
};

export default function App() {
  const [bootstrapping, setBootstrapping] = useState(true);
  const [session, setSession] = useState(null);

  useEffect(() => {
    (async () => {
      try {
        const [cookie, stored] = await Promise.all([
          getStoredCookie(),
          getStoredSession(),
        ]);
        /* Only restore the session if BOTH the cookie and the role blob
           survived — a half-present state means a prior wipe was
           interrupted, and the safe move is to force a re-login. */
        if (cookie && stored?.role) {
          setSession(stored);
        } else if (cookie || stored) {
          await Promise.all([clearStoredCookie(), clearStoredSession()]);
        }
      } finally {
        setBootstrapping(false);
      }
    })();
  }, []);

  const handleSignOut = useCallback(async () => {
    const role = session?.role;
    if (role === 'company') await logoutCompany();
    else if (role === 'client') await logoutUser();
    else {
      await clearStoredCookie();
      await clearStoredSession();
    }
    setSession(null);
  }, [session?.role]);

  if (bootstrapping) {
    return (
      <View style={styles.boot}>
        <ActivityIndicator color={brand.tabActive} />
        <StatusBar style="light" />
      </View>
    );
  }

  if (!session) {
    return (
      <SafeAreaProvider>
        <StatusBar style="light" />
        <SignInScreen onSignedIn={setSession} />
      </SafeAreaProvider>
    );
  }

  return (
    <SafeAreaProvider>
      <StatusBar style="light" />
      <NavigationContainer theme={navTheme}>
        {session.role === 'company' ? (
          <CompanyNavigator session={session} onSignOut={handleSignOut} />
        ) : (
          <UserNavigator session={session} onSignOut={handleSignOut} />
        )}
      </NavigationContainer>
    </SafeAreaProvider>
  );
}

const styles = StyleSheet.create({
  boot: {
    flex: 1,
    backgroundColor: brand.background,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
