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

type NavigationProp = NativeStackNavigationProp<RootStackParamList, 'Signup'>;

const GREEN = '#5DBB7A';

export default function SignupScreen() {
  const navigation = useNavigation<NavigationProp>();
  const [darkMode, setDarkMode] = useState(true);
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [loading, setLoading] = useState(false);

  const theme = darkMode ? dark : light;

  const handleSignup = async () => {
    if (!name || !email || !password || !confirmPassword) {
      Alert.alert('Missing Fields', 'Please fill in all fields.');
      return;
    }
    if (password !== confirmPassword) {
      Alert.alert('Password Mismatch', 'Passwords do not match.');
      return;
    }
    if (password.length < 6) {
      Alert.alert('Weak Password', 'Password must be at least 6 characters.');
      return;
    }

    setLoading(true);

    const { error } = await supabase.auth.signUp({
      email: email.trim().toLowerCase(),
      password: password,
      options: {
        data: { full_name: name },
      },
    });

    setLoading(false);

    if (error) {
      Alert.alert('Signup Failed', error.message);
    } else {
      Alert.alert(
        'Account Created!',
        'Please check your email to verify your account, then log in.',
        [{ text: 'Go to Login', onPress: () => navigation.replace('Login') }]
      );
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

          {/* Top row */}
          <View style={styles.topRow}>
            <Text style={styles.brandLabel}>GEOLOCK</Text>
            <TouchableOpacity
              style={[styles.themeToggle, { backgroundColor: theme.toggleBg }]}
              onPress={() => setDarkMode(!darkMode)}
            >
              <Text style={styles.themeIcon}>{darkMode ? '☀️' : '🌙'}</Text>
            </TouchableOpacity>
          </View>

          <Text style={[styles.title, { color: theme.text }]}>Create Account</Text>
          <Text style={[styles.subtitle, { color: theme.subtext }]}>
            Sign up to join your workforce workspace.
          </Text>

          {/* Full Name */}
          <Text style={[styles.fieldLabel, { color: theme.subtext }]}>FULL NAME</Text>
          <View style={[styles.inputBox, { backgroundColor: theme.inputBg, borderColor: theme.border }]}>
            <Text style={styles.inputIcon}>👤</Text>
            <TextInput
              style={[styles.input, { color: theme.text }]}
              value={name}
              onChangeText={setName}
              placeholder="Enter your full name"
              placeholderTextColor={theme.placeholder}
              autoCapitalize="words"
            />
          </View>

          {/* Email */}
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

          {/* Password */}
          <Text style={[styles.fieldLabel, { color: theme.subtext }]}>PASSWORD</Text>
          <View style={[styles.inputBox, { backgroundColor: theme.inputBg, borderColor: theme.border }]}>
            <Text style={styles.inputIcon}>🔒</Text>
            <TextInput
              style={[styles.input, { color: theme.text }]}
              value={password}
              onChangeText={setPassword}
              placeholder="Min. 6 characters"
              placeholderTextColor={theme.placeholder}
              secureTextEntry={!showPassword}
            />
            <TouchableOpacity onPress={() => setShowPassword(!showPassword)} style={styles.eyeBtn}>
              <Text style={styles.eyeIcon}>{showPassword ? '🙈' : '👁'}</Text>
            </TouchableOpacity>
          </View>

          {/* Confirm Password */}
          <Text style={[styles.fieldLabel, { color: theme.subtext }]}>CONFIRM PASSWORD</Text>
          <View style={[styles.inputBox, { backgroundColor: theme.inputBg, borderColor: theme.border }]}>
            <Text style={styles.inputIcon}>🔒</Text>
            <TextInput
              style={[styles.input, { color: theme.text }]}
              value={confirmPassword}
              onChangeText={setConfirmPassword}
              placeholder="Re-enter your password"
              placeholderTextColor={theme.placeholder}
              secureTextEntry={!showConfirm}
            />
            <TouchableOpacity onPress={() => setShowConfirm(!showConfirm)} style={styles.eyeBtn}>
              <Text style={styles.eyeIcon}>{showConfirm ? '🙈' : '👁'}</Text>
            </TouchableOpacity>
          </View>

          {/* Signup Button */}
          <TouchableOpacity
            style={[styles.signupBtn, loading && styles.signupBtnDisabled]}
            onPress={handleSignup}
            disabled={loading}
            activeOpacity={0.85}
          >
            {loading
              ? <ActivityIndicator color="#FFF" />
              : <Text style={styles.signupBtnText}>Create Account</Text>
            }
          </TouchableOpacity>

          {/* Go to Login */}
          <TouchableOpacity style={styles.loginRow} onPress={() => navigation.navigate('Login')}>
            <Text style={[styles.loginText, { color: theme.subtext }]}>Already have an account?  </Text>
            <Text style={styles.loginLink}>Log In</Text>
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
  fieldLabel: { fontSize: 11, fontWeight: '700', letterSpacing: 1, marginBottom: 8 },
  inputBox: { flexDirection: 'row', alignItems: 'center', borderRadius: 12, borderWidth: 1, paddingHorizontal: 14, paddingVertical: Platform.OS === 'ios' ? 14 : 4, marginBottom: 16, gap: 10 },
  inputIcon: { fontSize: 16 },
  input: { flex: 1, fontSize: 14 },
  eyeBtn: { padding: 4 },
  eyeIcon: { fontSize: 16 },
  signupBtn: { backgroundColor: GREEN, borderRadius: 14, paddingVertical: 16, alignItems: 'center', marginBottom: 16, marginTop: 4, shadowColor: GREEN, shadowOffset: { width: 0, height: 6 }, shadowOpacity: 0.35, shadowRadius: 10, elevation: 6 },
  signupBtnDisabled: { backgroundColor: '#3A7A50', shadowOpacity: 0 },
  signupBtnText: { color: '#FFF', fontSize: 16, fontWeight: '700' },
  loginRow: { flexDirection: 'row', justifyContent: 'center', alignItems: 'center', marginTop: 4 },
  loginText: { fontSize: 13 },
  loginLink: { color: GREEN, fontSize: 13, fontWeight: '700' },
});
