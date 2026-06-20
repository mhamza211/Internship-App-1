import 'react-native-url-polyfill/auto';
import React, { useEffect, useRef } from 'react';
import { Linking } from 'react-native';
import { NavigationContainer, NavigationContainerRef } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import LoginScreen from './src/screens/LoginScreen';
import SignupScreen from './src/screens/SignupScreen';
import ForgotPasswordScreen from './src/screens/ForgotPasswordScreen';
import ResetPasswordScreen from './src/screens/ResetPasswordScreen';
import HomeScreen from './src/screens/HomeScreen';
import CheckInScreen from './src/screens/CheckInScreen';
import SettingsScreen from './src/screens/SettingsScreen';
import AttendanceScreen from './src/screens/AttendanceScreen';
import type { RootStackParamList } from './src/types/navigation';
import { supabase } from './src/lib/supabase';

const Stack = createNativeStackNavigator<RootStackParamList>();

const linking = {
  prefixes: ['geolock://'],
  config: {
    screens: {
      ResetPassword: 'reset-password',
    },
  },
};

export default function App() {
  const navigationRef = useRef<NavigationContainerRef<RootStackParamList>>(null);

  useEffect(() => {
    const handleDeepLink = async (url: string | null) => {
      if (!url) return;
      const fragment = url.split('#')[1] || url.split('?')[1] || '';
      const params = new URLSearchParams(fragment);
      const accessToken = params.get('access_token');
      const refreshToken = params.get('refresh_token');
      const type = params.get('type');

      if (accessToken && refreshToken) {
        await supabase.auth.setSession({ access_token: accessToken, refresh_token: refreshToken });
        if (type === 'recovery') {
          navigationRef.current?.reset({
            index: 0,
            routes: [{ name: 'ResetPassword' }],
          });
        }
      }
    };

    Linking.getInitialURL().then(handleDeepLink);
    const linkSub = Linking.addEventListener('url', (event) => handleDeepLink(event.url));

    const { data: authListener } = supabase.auth.onAuthStateChange((event) => {
      if (event === 'PASSWORD_RECOVERY') {
        navigationRef.current?.reset({
          index: 0,
          routes: [{ name: 'ResetPassword' }],
        });
      }
    });

    return () => {
      linkSub.remove();
      authListener.subscription.unsubscribe();
    };
  }, []);

  return (
    <NavigationContainer ref={navigationRef} linking={linking}>
      <Stack.Navigator
        screenOptions={{ headerShown: false }}
        initialRouteName="Login"
      >
        <Stack.Screen name="Login" component={LoginScreen} />
        <Stack.Screen name="Signup" component={SignupScreen} />
        <Stack.Screen name="ForgotPassword" component={ForgotPasswordScreen} />
        <Stack.Screen name="ResetPassword" component={ResetPasswordScreen} />
        <Stack.Screen name="Home" component={HomeScreen} />
        <Stack.Screen name="CheckIn" component={CheckInScreen} />
        <Stack.Screen name="Settings" component={SettingsScreen} />
        <Stack.Screen name="Attendance" component={AttendanceScreen} />
      </Stack.Navigator>
    </NavigationContainer>
  );
}