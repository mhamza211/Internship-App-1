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
  DimensionValue,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import type { RootStackParamList } from '../types/navigation';
import { supabase } from '../lib/supabase';
import {
  LockIcon, SunIcon, MoonIcon, KeyIcon, EyeIcon, EyeOffIcon, CheckCircleIcon,
} from '../components/Icons';

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

  const getPasswordStrength = (pass: string): { label: string; color: string; width: DimensionValue } => {
    if (!pass) return { label: '', color: 'transparent', width: '0%' };
    let score = 0;
    if (pass.length >= 6) score++;
    if (pass.length >= 10) score++;
    if (/[A-Z]/.test(pass)) score++;
    if (/[0-9]/.test(pass)) score++;
    if (/[^A-Za-z0-9]/.test(pass)) score++;
    if (score <= 1) return { label: 'Weak', color: '#E53935', width: '25%' };
    if (score <= 2) return { label: 'Fair', color: '#FB8C00', width: '50%' };
    if (score <= 3) return { label: 'Good', color: '#FDD835', width: '75%' };
    return { label: 'Strong', color: '#43A047', width: '100%' };
  };

  const passwordStrength = getPasswordStrength(password);

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
              {darkMode ? <SunIcon size={18} /> : <MoonIcon size={18} />}
            </TouchableOpacity>
          </View>

          {!done ? (
            <>
              <View style={styles.iconBox}>
                <KeyIcon size={52} color="#FFC107" />
              </View>

              <Text style={[styles.title, { color: theme.text }]}>Set New Password</Text>
              <Text style={[styles.subtitle, { color: theme.subtext }]}>
                Enter your new password below.
              </Text>

              <Text style={[styles.fieldLabel, { color: theme.subtext }]}>NEW PASSWORD</Text>
              <View style={[styles.inputBox, { backgroundColor: theme.inputBg, borderColor: theme.border, marginBottom: 4 }]}>
                <LockIcon size={18} color={theme.subtext} />
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
                  {showPassword ? <EyeOffIcon size={18} color={theme.subtext} /> : <EyeIcon size={18} color={theme.subtext} />}
                </TouchableOpacity>
              </View>
              {password.length > 0 && (
                <View style={styles.strengthContainer}>
                  <View style={styles.strengthBarBg}>
                    <View style={[styles.strengthBarFill, { width: passwordStrength.width, backgroundColor: passwordStrength.color }]} />
                  </View>
                  <Text style={[styles.strengthLabel, { color: passwordStrength.color }]}>{passwordStrength.label}</Text>
                </View>
              )}

              <Text style={[styles.fieldLabel, { color: theme.subtext }]}>CONFIRM PASSWORD</Text>
              <View style={[styles.inputBox, { backgroundColor: theme.inputBg, borderColor: theme.border }]}>
                <LockIcon size={18} color={theme.subtext} />
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
                <CheckCircleIcon size={56} color="#4CAF50" />
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
  iconBox: { alignItems: 'center', marginBottom: 20, marginTop: 10 },
  title: { fontSize: 26, fontWeight: '800', marginBottom: 8 },
  subtitle: { fontSize: 14, marginBottom: 28, lineHeight: 22 },
  fieldLabel: { fontSize: 11, fontWeight: '700', letterSpacing: 1, marginBottom: 8 },
  inputBox: { flexDirection: 'row', alignItems: 'center', borderRadius: 12, borderWidth: 1, paddingHorizontal: 14, paddingVertical: Platform.OS === 'ios' ? 14 : 4, marginBottom: 20, gap: 10 },
  input: { flex: 1, fontSize: 14 },
  resetBtn: { backgroundColor: GREEN, borderRadius: 14, paddingVertical: 16, alignItems: 'center', marginBottom: 16, shadowColor: GREEN, shadowOffset: { width: 0, height: 6 }, shadowOpacity: 0.35, shadowRadius: 10, elevation: 6 },
  resetBtnDisabled: { backgroundColor: '#3A7A50', shadowOpacity: 0 },
  resetBtnText: { color: '#FFF', fontSize: 16, fontWeight: '700' },
  successBox: { alignItems: 'center', paddingTop: 10 },
  successIconBox: { marginBottom: 16 },
  successTitle: { fontSize: 24, fontWeight: '800', marginBottom: 12 },
  successSub: { fontSize: 14, lineHeight: 22, textAlign: 'center', marginBottom: 28 },
  strengthContainer: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 20, paddingHorizontal: 2 },
  strengthBarBg: { flex: 1, height: 5, borderRadius: 3, backgroundColor: '#E0E0E0' },
  strengthBarFill: { height: 5, borderRadius: 3 },
  strengthLabel: { fontSize: 11, fontWeight: '700', width: 45 },
});
