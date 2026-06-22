import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  TextInput,
  StatusBar,
  SafeAreaView,
  Platform,
  ScrollView,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import type { RootStackParamList } from '../types/navigation';
import { supabase } from '../lib/supabase';

type NavigationProp = NativeStackNavigationProp<RootStackParamList, 'ResetPassword'>;

const GREEN = '#5DBB7A';

export default function ResetPasswordScreen() {
  const navigation = useNavigation<NavigationProp>();
  const [darkMode, setDarkMode] = useState(true);
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [done, setDone] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  const theme = darkMode ? dark : light;

  const handleUpdatePassword = async () => {
    if (!password || !confirmPassword) {
      Alert.alert('Missing Fields', 'Please fill in both password fields.');
      return;
    }
    if (password.length < 6) {
      Alert.alert('Weak Password', 'Password must be at least 6 characters.');
      return;
    }
    if (password !== confirmPassword) {
      Alert.alert('Mismatch', 'Passwords do not match.');
      return;
    }

    setLoading(true);
    const { error } = await supabase.auth.updateUser({ password });
    setLoading(false);

    if (error) {
      Alert.alert('Error', error.message);
    } else {
      setDone(true);
    }
  };

  return (
    <SafeAreaView style={[styles.safeArea, { backgroundColor: theme.bg }]}>
      <StatusBar barStyle={darkMode ? 'light-content' : 'dark-content'} backgroundColor={theme.bg} />
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        <View style={[styles.card, { backgroundColor: theme.card, shadowColor: theme.shadow }]}>
          <View style={styles.topRow}>
            <Text style={styles.brandLabel}>GEOLOCK</Text>
            <TouchableOpacity
              style={[styles.themeToggle, { backgroundColor: theme.toggleBg }]}
              onPress={() => setDarkMode(!darkMode)}
            >
              <Text style={styles.themeIcon}>{darkMode ? '☀️' : '🌙'}</Text>
            </TouchableOpacity>
          </View>

          {!done ? (
            <>
              <View style={styles.iconBox}>
                <Text style={styles.lockIcon}>🔑</Text>
              </View>

              <Text style={[styles.title, { color: theme.text }]}>Set New Password</Text>
              <Text style={[styles.subtitle, { color: theme.subtext }]}>
                Enter your new password below.
              </Text>

              <Text style={[styles.fieldLabel, { color: theme.subtext }]}>NEW PASSWORD</Text>
              <View style={[styles.inputBox, { backgroundColor: theme.inputBg, borderColor: theme.border }]}>
                <Text style={styles.inputIcon}>🔒</Text>
                <TextInput
                  style={[styles.input, { color: theme.text }]}
                  value={password}
                  onChangeText={setPassword}
                  placeholder="Enter new password"
                  placeholderTextColor={theme.placeholder}
                  secureTextEntry={!showPassword}
                  autoCapitalize="none"
                />
                <TouchableOpacity onPress={() => setShowPassword(!showPassword)}>
                  <Text style={styles.eyeIcon}>{showPassword ? '🙈' : '👁'}</Text>
                </TouchableOpacity>
              </View>

              <Text style={[styles.fieldLabel, { color: theme.subtext }]}>CONFIRM PASSWORD</Text>
              <View style={[styles.inputBox, { backgroundColor: theme.inputBg, borderColor: theme.border }]}>
                <Text style={styles.inputIcon}>🔒</Text>
                <TextInput
                  style={[styles.input, { color: theme.text }]}
                  value={confirmPassword}
                  onChangeText={setConfirmPassword}
                  placeholder="Confirm new password"
                  placeholderTextColor={theme.placeholder}
                  secureTextEntry={!showPassword}
                  autoCapitalize="none"
                />
              </View>

              <TouchableOpacity
                style={[styles.resetBtn, loading && styles.resetBtnDisabled]}
                onPress={handleUpdatePassword}
                disabled={loading}
                activeOpacity={0.85}
              >
                {loading
                  ? <ActivityIndicator color="#FFF" />
                  : <Text style={styles.resetBtnText}>Update Password</Text>
                }
              </TouchableOpacity>
            </>
          ) : (
            <View style={styles.successBox}>
              <View style={styles.successIconBox}>
                <Text style={styles.successIcon}>✅</Text>
              </View>
              <Text style={[styles.successTitle, { color: theme.text }]}>Password Updated!</Text>
              <Text style={[styles.successSub, { color: theme.subtext }]}>
                Your password has been changed successfully. You can now log in with your new password.
              </Text>

              <TouchableOpacity
                style={styles.resetBtn}
                onPress={() => navigation.replace('Login')}
                activeOpacity={0.85}
              >
                <Text style={styles.resetBtnText}>Back to Login</Text>
              </TouchableOpacity>
            </View>
          )}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const dark = {
  bg: '#1A1A2E', card: '#252840', text: '#FFFFFF', subtext: '#8B8FA8',
  inputBg: '#1E2040', border: '#2E3255', placeholder: '#555870', toggleBg: '#1E2040', shadow: '#000',
};
const light = {
  bg: '#F0F2F8', card: '#FFFFFF', text: '#1A1A2E', subtext: '#888',
  inputBg: '#F5F5F8', border: '#E5E7EB', placeholder: '#AAA', toggleBg: '#F0F2F8', shadow: '#C0C0D0',
};

const styles = StyleSheet.create({
  safeArea: { flex: 1 },
  scrollContent: { flexGrow: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 20, paddingVertical: 40 },
  card: { width: '100%', borderRadius: 24, padding: 24, shadowOffset: { width: 0, height: 8 }, shadowOpacity: 0.15, shadowRadius: 20, elevation: 10 },
  topRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 },
  brandLabel: { color: GREEN, fontSize: 12, fontWeight: '800', letterSpacing: 2 },
  themeToggle: { width: 36, height: 36, borderRadius: 18, alignItems: 'center', justifyContent: 'center' },
  themeIcon: { fontSize: 16 },
  iconBox: { alignItems: 'center', marginBottom: 20, marginTop: 10 },
  lockIcon: { fontSize: 52 },
  title: { fontSize: 26, fontWeight: '800', marginBottom: 8 },
  subtitle: { fontSize: 14, marginBottom: 28, lineHeight: 22 },
  fieldLabel: { fontSize: 11, fontWeight: '700', letterSpacing: 1, marginBottom: 8 },
  inputBox: { flexDirection: 'row', alignItems: 'center', borderRadius: 12, borderWidth: 1, paddingHorizontal: 14, paddingVertical: Platform.OS === 'ios' ? 14 : 4, marginBottom: 20, gap: 10 },
  inputIcon: { fontSize: 16 },
  input: { flex: 1, fontSize: 14 },
  eyeIcon: { fontSize: 16 },
  resetBtn: { backgroundColor: GREEN, borderRadius: 14, paddingVertical: 16, alignItems: 'center', marginBottom: 16, shadowColor: GREEN, shadowOffset: { width: 0, height: 6 }, shadowOpacity: 0.35, shadowRadius: 10, elevation: 6 },
  resetBtnDisabled: { backgroundColor: '#3A7A50', shadowOpacity: 0 },
  resetBtnText: { color: '#FFF', fontSize: 16, fontWeight: '700' },
  successBox: { alignItems: 'center', paddingTop: 10 },
  successIconBox: { marginBottom: 16 },
  successIcon: { fontSize: 56 },
  successTitle: { fontSize: 24, fontWeight: '800', marginBottom: 12 },
  successSub: { fontSize: 14, lineHeight: 22, textAlign: 'center', marginBottom: 28 },
});