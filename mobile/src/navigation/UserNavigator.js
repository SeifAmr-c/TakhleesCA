import { createNativeStackNavigator } from '@react-navigation/native-stack';
import TrackingScreen from '../screens/TrackingScreen';

const Stack = createNativeStackNavigator();

/* Clients only have a single screen for now — the tracking view —
   so this is a stack rather than a tab bar. Keeping it as a navigator
   leaves room to push detail pages later without rewriting the root. */
export default function UserNavigator({ session, onSignOut }) {
  return (
    <Stack.Navigator
      screenOptions={{
        headerShown: false,
        contentStyle: { backgroundColor: '#FFFFFF' },
        animation: 'fade',
      }}
    >
      <Stack.Screen name="Tracking">
        {() => <TrackingScreen session={session} onSignOut={onSignOut} />}
      </Stack.Screen>
    </Stack.Navigator>
  );
}
