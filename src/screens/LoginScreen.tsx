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

type NavigationProp = NativeStackNavigationProp<RootStackParamList, 'Login'>;

const GREEN = '#5DBB7A';

export default function LoginScreen() {
  const navigation = useNavigation<NavigationProp>();
  const [darkMode, setDarkMode] = useState(true);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(true);
  const [loading, setLoading] = useState(false);

  const theme = darkMode ? dark : light;

  const handleLogin = async () => {
    if (!email || !password) {
      Alert.alert('Missing Fields', 'Please enter your email and password.');
      return;
    }
    setLoading(true);
    const { error } = await supabase.auth.signInWithPassword({
      email: email.trim().toLowerCase(),
      password: password,
    });
    setLoading(false);
    if (error) {
      Alert.alert('Login Failed', error.message);
    } else {
      navigation.replace('Home');
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

          <Text style={[styles.title, { color: theme.text }]}>Welcome back</Text>
          <Text style={[styles.subtitle, { color: theme.subtext }]}>Sign in to your workforce workspace.</Text>

          <View style={[styles.roleBox, { backgroundColor: theme.inputBg }]}>
            <Text style={[styles.roleLabel, { color: theme.subtext }]}>ROLE</Text>
            <View style={[styles.roleBtn, { backgroundColor: GREEN }]}>
              <Text style={styles.roleBtnText}>Employee</Text>
            </View>
          </View>

          <Text style={[styles.fieldLabel, { color: theme.subtext }]}>EMAIL</Text>
          <View style={[styles.inputBox, { backgroundColor: theme.inputBg, borderColor: theme.border }]}>
            <Text style={styles.inputIcon}>✉</Text>
            <TextInput
              style={[styles.input, { color: theme.text }]}
              value={email}
              onChangeText={setEmail}
              placeholder="Enter your email"
              placeholderTextColor={theme.placeholder}
              keyboardType="email-address"
              autoCapitalize="none"
            />
          </View>

          <Text style={[styles.fieldLabel, { color: theme.subtext }]}>PASSWORD</Text>
          <View style={[styles.inputBox, { backgroundColor: theme.inputBg, borderColor: theme.border }]}>
            <Text style={styles.inputIcon}>🔒</Text>
            <TextInput
              style={[styles.input, { color: theme.text }]}
              value={password}
              onChangeText={setPassword}
              placeholder="Enter your password"
              placeholderTextColor={theme.placeholder}
              secureTextEntry={!showPassword}
            />
            <TouchableOpacity onPress={() => setShowPassword(!showPassword)} style={styles.eyeBtn}>
              <Text style={styles.eyeIcon}>{showPassword ? '🙈' : '👁'}</Text>
            </TouchableOpacity>
          </View>

          <View style={styles.rememberRow}>
            <TouchableOpacity style={styles.rememberLeft} onPress={() => setRememberMe(!rememberMe)} activeOpacity={0.7}>
              <View style={[styles.checkbox, { borderColor: GREEN }, rememberMe ? styles.checkboxChecked : styles.checkboxUnchecked]}>
                {rememberMe && <Text style={styles.checkmark}>✓</Text>}
              </View>
              <Text style={[styles.rememberText, { color: theme.text }]}>Remember me</Text>
            </TouchableOpacity>
            <TouchableOpacity onPress={() => navigation.navigate('ForgotPassword')}>
              <Text style={styles.forgotText}>Forgot password?</Text>
            </TouchableOpacity>
          </View>

          <TouchableOpacity
            style={[styles.loginBtn, loading && styles.loginBtnDisabled]}
            onPress={handleLogin}
            disabled={loading}
            activeOpacity={0.85}
          >
            {loading
              ? <ActivityIndicator color="#FFF" />
              : <Text style={styles.loginBtnText}>Login as Employee</Text>
            }
          </TouchableOpacity>

          <TouchableOpacity style={styles.signupRow} onPress={() => navigation.navigate('Signup')}>
            <Text style={[styles.signupText, { color: theme.subtext }]}>Don't have an account?  </Text>
            <Text style={styles.signupLink}>Sign Up</Text>
          </TouchableOpacity>

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
  topRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 },
  brandLabel: { color: GREEN, fontSize: 12, fontWeight: '800', letterSpacing: 2 },
  themeToggle: { width: 36, height: 36, borderRadius: 18, alignItems: 'center', justifyContent: 'center' },
  themeIcon: { fontSize: 16 },
  title: { fontSize: 26, fontWeight: '800', marginBottom: 6 },
  subtitle: { fontSize: 14, marginBottom: 24, lineHeight: 20 },
  roleBox: { borderRadius: 14, padding: 14, marginBottom: 20 },
  roleLabel: { fontSize: 11, fontWeight: '700', letterSpacing: 1, marginBottom: 10 },
  roleBtn: { borderRadius: 10, paddingVertical: 10, alignItems: 'center' },
  roleBtnText: { color: '#FFF', fontWeight: '700', fontSize: 14 },
  fieldLabel: { fontSize: 11, fontWeight: '700', letterSpacing: 1, marginBottom: 8 },
  inputBox: { flexDirection: 'row', alignItems: 'center', borderRadius: 12, borderWidth: 1, paddingHorizontal: 14, paddingVertical: Platform.OS === 'ios' ? 14 : 4, marginBottom: 16, gap: 10 },
  inputIcon: { fontSize: 16 },
  input: { flex: 1, fontSize: 14 },
  eyeBtn: { padding: 4 },
  eyeIcon: { fontSize: 16 },
  rememberRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 },
  rememberLeft: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  checkbox: { width: 18, height: 18, borderRadius: 4, borderWidth: 2, alignItems: 'center', justifyContent: 'center' },
  checkboxChecked: { backgroundColor: GREEN },
  checkboxUnchecked: { backgroundColor: 'transparent' },
  checkmark: { color: '#FFF', fontSize: 11, fontWeight: '800' },
  rememberText: { fontSize: 13 },
  forgotText: { color: GREEN, fontSize: 13, fontWeight: '600' },
  loginBtn: { backgroundColor: GREEN, borderRadius: 14, paddingVertical: 16, alignItems: 'center', marginBottom: 16, shadowColor: GREEN, shadowOffset: { width: 0, height: 6 }, shadowOpacity: 0.35, shadowRadius: 10, elevation: 6 },
  loginBtnDisabled: { backgroundColor: '#3A7A50', shadowOpacity: 0 },
  loginBtnText: { color: '#FFF', fontSize: 16, fontWeight: '700' },
  signupRow: { flexDirection: 'row', justifyContent: 'center', alignItems: 'center', marginTop: 4 },
  signupText: { fontSize: 13 },
  signupLink: { color: GREEN, fontSize: 13, fontWeight: '700' },
});
