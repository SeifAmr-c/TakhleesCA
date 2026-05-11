import { useEffect, useState } from 'react';
import { StatusBar } from 'expo-status-bar';
import { ActivityIndicator, StyleSheet, View } from 'react-native';
import SignInScreen from './src/screens/SignInScreen';
import ScannerScreen from './src/screens/ScannerScreen';
import { getStoredCookie, clearStoredCookie } from './src/api';

export default function App() {
  const [bootstrapping, setBootstrapping] = useState(true);
  const [company, setCompany] = useState(null);

  useEffect(() => {
    (async () => {
      const cookie = await getStoredCookie();
      if (cookie) {
        setCompany({});
      }
      setBootstrapping(false);
    })();
  }, []);

  if (bootstrapping) {
    return (
      <View style={styles.boot}>
        <ActivityIndicator color="#34D399" />
        <StatusBar style="light" />
      </View>
    );
  }

  return (
    <>
      <StatusBar style="light" />
      {company ? (
        <ScannerScreen
          company={company}
          onSignOut={async () => {
            await clearStoredCookie();
            setCompany(null);
          }}
        />
      ) : (
        <SignInScreen onSignedIn={(c) => setCompany(c ?? {})} />
      )}
    </>
  );
}

const styles = StyleSheet.create({
  boot: {
    flex: 1,
    backgroundColor: '#0C1A2C',
    alignItems: 'center',
    justifyContent: 'center',
  },
});
