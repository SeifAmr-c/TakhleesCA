import { Platform, StyleSheet } from 'react-native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import ApplicationsScreen from '../screens/ApplicationsScreen';
import ScannerScreen from '../screens/ScannerScreen';
import SettingsScreen from '../screens/SettingsScreen';
import TabIcon from './TabIcon';
import { brand, colors } from '../theme';

const Tab = createBottomTabNavigator();

/* Cross-fade tab transitions feel right for a portal that flips between
   a list view and a full-screen camera view — a horizontal slide would
   reveal background canvas because the two screens have very different
   backgrounds. */
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

export default function CompanyNavigator({ session, onSignOut }) {
  return (
    <Tab.Navigator screenOptions={screenOptions}>
      <Tab.Screen
        name="Applications"
        options={{
          tabBarIcon: ({ color, focused }) => (
            <TabIcon name="applications" color={color} focused={focused} />
          ),
        }}
      >
        {() => <ApplicationsScreen session={session} onSignOut={onSignOut} />}
      </Tab.Screen>
      <Tab.Screen
        name="Scanner"
        options={{
          tabBarIcon: ({ color, focused }) => (
            <TabIcon name="scanner" color={color} focused={focused} />
          ),
        }}
      >
        {() => <ScannerScreen session={session} onSignOut={onSignOut} />}
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
