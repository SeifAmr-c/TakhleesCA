import { Platform, StyleSheet } from 'react-native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import TrackingScreen from '../screens/TrackingScreen';
import SettingsScreen from '../screens/SettingsScreen';
import TabIcon from './TabIcon';
import { brand, colors } from '../theme';

const Tab = createBottomTabNavigator();

/* Two tabs: the operational view (Tracking) and the account view
   (Settings — Apple's required home for account deletion and the
   Privacy / Terms links). Mirrors the CompanyNavigator shape. */
const screenOptions = {
  headerShown: false,
  tabBarActiveTintColor: brand.tabActive,
  tabBarInactiveTintColor: colors.steel500,
  tabBarStyle: {
    backgroundColor: '#FFFFFF',
    borderTopColor: 'rgba(15, 35, 60, 0.08)',
    borderTopWidth: StyleSheet.hairlineWidth,
    height: Platform.OS === 'ios' ? 84 : 64,
    paddingTop: 8,
    paddingBottom: Platform.OS === 'ios' ? 28 : 10,
  },
  tabBarLabelStyle: {
    fontSize: 11,
    fontWeight: '600',
    letterSpacing: 0.5,
    textTransform: 'uppercase',
  },
  tabBarItemStyle: { paddingVertical: 4 },
  tabBarHideOnKeyboard: true,
  animation: 'fade',
  sceneStyle: { backgroundColor: '#FFFFFF' },
};

export default function UserNavigator({ session, onSignOut }) {
  return (
    <Tab.Navigator screenOptions={screenOptions}>
      <Tab.Screen
        name="Tracking"
        options={{
          tabBarIcon: ({ color, focused }) => (
            <TabIcon name="tracking" color={color} focused={focused} />
          ),
        }}
      >
        {() => <TrackingScreen session={session} onSignOut={onSignOut} />}
      </Tab.Screen>
      <Tab.Screen
        name="Settings"
        options={{
          tabBarIcon: ({ color, focused }) => (
            <TabIcon name="settings" color={color} focused={focused} />
          ),
        }}
      >
        {() => <SettingsScreen session={session} onSignOut={onSignOut} />}
      </Tab.Screen>
    </Tab.Navigator>
  );
}
