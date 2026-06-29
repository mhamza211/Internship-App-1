import React, { useState, useEffect } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity,
  ScrollView, StatusBar, SafeAreaView, Platform, Alert, Switch,
  Modal, TextInput, ActivityIndicator, DimensionValue,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import type { RootStackParamList } from '../types/navigation';
import { supabase } from '../lib/supabase';
import {
  LockIcon, SunIcon, MoonIcon, UserIcon, GlobeIcon, ShieldIcon,
  LogoutIcon, BellIcon, BellOffIcon, HomeIcon, ClockIcon, SettingsIcon,
} from '../components/Icons';

type NavigationProp = NativeStackNavigationProp<RootStackParamList, 'Settings'>;

const PURPLE = '#3D2C8D';
const GREEN  = '#5DBB7A';

export default function SettingsScreen() {
  const navigation = useNavigation<NavigationProp>();
  const [lightMode, setLightMode] = useState(true);
  const [notifications, setNotifications] = useState(true);
  const [activeTab, setActiveTab] = useState<'Home' | 'Attendance' | 'History' | 'Settings'>('Settings');
  const [showPasswordModal, setShowPasswordModal] = useState(false);
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [updatingPassword, setUpdatingPassword] = useState(false);
  const [userName, setUserName] = useState('');
  const [userEmail, setUserEmail] = useState('');

  useEffect(() => {
    const fetchUser = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        setUserEmail(user.email ?? '');
        setUserName(user.user_metadata?.full_name ?? '');
      }
    };
    fetchUser();
  }, []);

  const bg        = lightMode ? '#F0F2F8' : '#1A1A2E';
  const cardBg    = lightMode ? '#FFFFFF'  : '#252840';
  const fieldBg   = lightMode ? '#F5F5F8'  : '#1E2040';
  const textColor = lightMode ? '#1A1A2E'  : '#FFFFFF';
  const subColor  = lightMode ? '#888'     : '#8B8FA8';
  const borderColor = lightMode ? '#EFEFEF' : '#2E3255';

  const handleNotificationToggle = (value: boolean) => {
    setNotifications(value);
    if (value) {
      Alert.alert(
        'Notifications Enabled',
        'You will now receive attendance reminders and check-in alerts.',
        [{ text: 'OK' }]
      );
    } else {
      Alert.alert(
        'Notifications Disabled',
        'You will no longer receive attendance reminders and alerts.',
        [{ text: 'OK' }]
      );
    }
  };

  const handleLogout = async () => {
    Alert.alert('Logout', 'Are you sure you want to logout?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Logout', style: 'destructive',
        onPress: async () => {
          await supabase.auth.signOut();
          navigation.replace('Login');
        },
      },
    ]);
  };

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

  const passwordStrength = getPasswordStrength(newPassword);

  const handleUpdatePassword = async () => {
    if (!currentPassword || !newPassword || !confirmPassword) {
      Alert.alert('Error', 'Please fill in all fields.');
      return;
    }
    if (newPassword.length < 6) {
      Alert.alert('Error', 'Password must be at least 6 characters.');
      return;
    }
    if (newPassword !== confirmPassword) {
      Alert.alert('Error', 'Passwords do not match.');
      return;
    }

    setUpdatingPassword(true);

    const { error: signInError } = await supabase.auth.signInWithPassword({
      email: userEmail,
      password: currentPassword,
    });

    if (signInError) {
      setUpdatingPassword(false);
      Alert.alert('Failed', 'Current password is incorrect.');
      return;
    }

    const { error } = await supabase.auth.updateUser({ password: newPassword });
    setUpdatingPassword(false);

    if (error) {
      Alert.alert('Failed', error.message);
    } else {
      Alert.alert('Success', 'Your password has been updated.');
      setShowPasswordModal(false);
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
    }
  };

  return (
    <SafeAreaView style={[styles.safeArea, { backgroundColor: bg }]}>
      <StatusBar barStyle="light-content" backgroundColor={PURPLE} />

      <View style={styles.header}>
        <View style={styles.headerTop}>
          <View style={styles.headerBrand}>
            <LockIcon size={18} color="#FFFFFF" />
            <View>
              <Text style={styles.headerAppName}>GEOLOCK</Text>
              <Text style={styles.headerRole}>EMPLOYEE</Text>
            </View>
          </View>
          <TouchableOpacity
            style={styles.headerThemeBtn}
            onPress={() => setLightMode(!lightMode)}
          >
            {lightMode ? <MoonIcon size={16} color="#FFC107" /> : <SunIcon size={16} color="#FFC107" />}
          </TouchableOpacity>
        </View>
        <Text style={styles.headerTitle}>Settings</Text>
      </View>

      <ScrollView style={styles.scrollView} contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>

        <View style={[styles.section, { backgroundColor: cardBg }]}>
          <View style={styles.sectionTitleRow}>
            <UserIcon size={16} color="#6C63FF" />
            <Text style={[styles.sectionTitle, { color: textColor }]}>Profile settings</Text>
          </View>
          <View style={[styles.fieldBox, { backgroundColor: fieldBg }]}>
            <Text style={styles.fieldLabel}>NAME</Text>
            <Text style={[styles.fieldValue, { color: textColor }]}>{userName || 'N/A'}</Text>
          </View>
          <View style={[styles.fieldBox, { backgroundColor: fieldBg }]}>
            <Text style={styles.fieldLabel}>EMAIL</Text>
            <Text style={[styles.fieldValue, { color: textColor }]}>{userEmail || 'N/A'}</Text>
          </View>
          <View style={[styles.fieldBox, styles.noMarginBottom, { backgroundColor: fieldBg }]}>
            <Text style={styles.fieldLabel}>ROLE</Text>
            <Text style={[styles.fieldValue, { color: textColor }]}>Employee</Text>
          </View>
        </View>

        <View style={[styles.section, { backgroundColor: cardBg }]}>
          <View style={styles.sectionTitleRow}>
            <GlobeIcon size={16} color="#4FC3F7" />
            <Text style={[styles.sectionTitle, { color: textColor }]}>Theme and notifications</Text>
          </View>

          <View style={[styles.settingRow, { backgroundColor: fieldBg }]}>
            <View style={styles.settingLeft}>
              {lightMode ? <SunIcon size={16} color="#FFC107" /> : <MoonIcon size={16} color="#FFC107" />}
              <Text style={[styles.settingRowText, { color: textColor }]}>
                {lightMode ? 'Light mode' : 'Dark mode'}
              </Text>
            </View>
            <Switch
              value={lightMode}
              onValueChange={setLightMode}
              trackColor={{ false: '#555', true: GREEN }}
              thumbColor="#FFF"
            />
          </View>

          <View style={[styles.settingRow, styles.noMarginBottom, { backgroundColor: fieldBg }]}>
            <View style={styles.settingLeft}>
              {notifications ? <BellIcon size={16} color="#FFC107" /> : <BellOffIcon size={16} color="#888" />}
              <View>
                <Text style={[styles.settingRowText, { color: textColor }]}>Notifications</Text>
                <Text style={[styles.settingRowSub, { color: subColor }]}>
                  {notifications ? 'Alerts and reminders on' : 'All notifications off'}
                </Text>
              </View>
            </View>
            <Switch
              value={notifications}
              onValueChange={handleNotificationToggle}
              trackColor={{ false: '#555', true: GREEN }}
              thumbColor="#FFF"
            />
          </View>
        </View>

        <View style={[styles.section, { backgroundColor: cardBg }]}>
          <View style={styles.sectionTitleRow}>
            <LockIcon size={16} color="#FFC107" />
            <Text style={[styles.sectionTitle, { color: textColor }]}>Password change</Text>
          </View>
          <TouchableOpacity
            style={[styles.actionBtn, { backgroundColor: fieldBg }]}
            onPress={() => setShowPasswordModal(true)}
            activeOpacity={0.7}
          >
            <Text style={[styles.actionBtnText, { color: textColor }]}>Update password</Text>
          </TouchableOpacity>
        </View>

        <View style={[styles.section, { backgroundColor: cardBg }]}>
          <View style={styles.sectionTitleRow}>
            <ShieldIcon size={16} color="#4CAF50" />
            <Text style={[styles.sectionTitle, { color: textColor }]}>Security</Text>
          </View>
          <Text style={[styles.securityText, { color: subColor }]}>
            Keep your account secure with the latest security and device controls.
          </Text>
          <TouchableOpacity
            style={[styles.logoutBtn, { backgroundColor: fieldBg }]}
            onPress={handleLogout}
            activeOpacity={0.85}
          >
            <LogoutIcon size={16} color="#E53935" />
            <Text style={styles.logoutText}>Logout</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.bottomSpacer} />
      </ScrollView>

      <View style={[styles.tabBar, { backgroundColor: cardBg, borderTopColor: borderColor }]}>
        <TouchableOpacity
          style={styles.tabItem}
          onPress={() => { setActiveTab('Home'); navigation.navigate('Home'); }}
        >
          <HomeIcon size={20} color={activeTab === 'Home' ? PURPLE : subColor} />
          <Text style={[styles.tabLabel, { color: subColor }, activeTab === 'Home' && styles.tabLabelActive]}>Home</Text>
          {activeTab === 'Home' && <View style={styles.tabActiveIndicator} />}
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.tabItem}
          onPress={() => { setActiveTab('Attendance'); navigation.navigate('Attendance'); }}
        >
          <ClockIcon size={20} color={activeTab === 'Attendance' ? PURPLE : subColor} />
          <Text style={[styles.tabLabel, { color: subColor }, activeTab === 'Attendance' && styles.tabLabelActive]}>Attendance</Text>
          {activeTab === 'Attendance' && <View style={styles.tabActiveIndicator} />}
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.tabItem}
          onPress={() => setActiveTab('Settings')}
        >
          <SettingsIcon size={20} color={activeTab === 'Settings' ? PURPLE : subColor} />
          <Text style={[styles.tabLabel, { color: subColor }, activeTab === 'Settings' && styles.tabLabelActive]}>Settings</Text>
          {activeTab === 'Settings' && <View style={styles.tabActiveIndicator} />}
        </TouchableOpacity>
      </View>
      <Modal visible={showPasswordModal} transparent animationType="fade">
        <View style={styles.modalOverlay}>
          <View style={[styles.modalBox, { backgroundColor: cardBg }]}>
            <Text style={[styles.modalTitle, { color: textColor }]}>Update Password</Text>

            <TextInput
              style={[styles.modalInput, { backgroundColor: fieldBg, color: textColor }]}
              placeholder="Current password"
              placeholderTextColor="#AAA"
              secureTextEntry
              value={currentPassword}
              onChangeText={setCurrentPassword}
            />
            <TextInput
              style={[styles.modalInput, { backgroundColor: fieldBg, color: textColor, marginBottom: 4 }]}
              placeholder="New password"
              placeholderTextColor="#AAA"
              secureTextEntry
              value={newPassword}
              onChangeText={setNewPassword}
            />
            {newPassword.length > 0 && (
              <View style={styles.strengthContainer}>
                <View style={styles.strengthBarBg}>
                  <View style={[styles.strengthBarFill, { width: passwordStrength.width, backgroundColor: passwordStrength.color }]} />
                </View>
                <Text style={[styles.strengthLabel, { color: passwordStrength.color }]}>{passwordStrength.label}</Text>
              </View>
            )}
            <TextInput
              style={[styles.modalInput, { backgroundColor: fieldBg, color: textColor }]}
              placeholder="Confirm new password"
              placeholderTextColor="#AAA"
              secureTextEntry
              value={confirmPassword}
              onChangeText={setConfirmPassword}
            />

            <View style={styles.modalBtns}>
              <TouchableOpacity
                style={[styles.modalCancelBtn, { backgroundColor: fieldBg }]}
                onPress={() => {
                  setShowPasswordModal(false);
                  setCurrentPassword('');
                  setNewPassword('');
                  setConfirmPassword('');
                }}
              >
                <Text style={[styles.modalCancelText, { color: textColor }]}>Cancel</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.modalSaveBtn, updatingPassword && styles.modalSaveBtnDisabled]}
                onPress={handleUpdatePassword}
                disabled={updatingPassword}
              >
                {updatingPassword ? (
                  <ActivityIndicator color="#FFF" size="small" />
                ) : (
                  <Text style={styles.modalSaveText}>Update</Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1 },
  header: {
    backgroundColor: PURPLE, paddingHorizontal: 20,
    paddingTop: Platform.OS === 'android' ? (StatusBar.currentHeight ?? 24) + 10 : 16,
    paddingBottom: 24, borderBottomLeftRadius: 24, borderBottomRightRadius: 24,
    shadowColor: '#000', shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15, shadowRadius: 8, elevation: 8, zIndex: 10,
  },
  headerTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 },
  headerBrand: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  headerAppName: { color: '#FFFFFF', fontSize: 13, fontWeight: '800', letterSpacing: 1.5 },
  headerRole: { color: 'rgba(255,255,255,0.6)', fontSize: 10, fontWeight: '600', letterSpacing: 1 },
  headerThemeBtn: { width: 36, height: 36, borderRadius: 18, backgroundColor: 'rgba(255,255,255,0.15)', alignItems: 'center', justifyContent: 'center' },
  headerTitle: { color: '#FFFFFF', fontSize: 26, fontWeight: '800' },
  scrollView: { flex: 1 },
  scrollContent: { padding: 16, gap: 14, paddingBottom: 32 },
  section: { borderRadius: 16, padding: 16, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.05, shadowRadius: 6, elevation: 2 },
  sectionTitleRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 14 },
  sectionTitle: { fontSize: 15, fontWeight: '700' },
  fieldBox: { borderRadius: 10, paddingHorizontal: 14, paddingVertical: 12, marginBottom: 10 },
  fieldLabel: { fontSize: 10, fontWeight: '700', color: '#AAA', letterSpacing: 1, marginBottom: 4 },
  fieldValue: { fontSize: 14, fontWeight: '600' },
  noMarginBottom: { marginBottom: 0 },
  bottomSpacer: { height: 8 },
  settingRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', borderRadius: 10, paddingHorizontal: 14, paddingVertical: 12, marginBottom: 10 },
  settingLeft: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  settingRowText: { fontSize: 14, fontWeight: '600' },
  settingRowSub: { fontSize: 11, marginTop: 2 },
  actionBtn: { borderRadius: 10, paddingHorizontal: 14, paddingVertical: 14 },
  actionBtnText: { fontSize: 14, fontWeight: '600' },
  securityText: { fontSize: 13, lineHeight: 20, marginBottom: 14 },
  logoutBtn: { flexDirection: 'row', alignItems: 'center', gap: 8, borderRadius: 10, paddingHorizontal: 14, paddingVertical: 14 },
  logoutText: { fontSize: 14, fontWeight: '700', color: '#E53935' },
  tabBar: { flexDirection: 'row', borderTopWidth: 1, paddingBottom: Platform.OS === 'ios' ? 20 : 8, paddingTop: 10 },
  tabItem: { flex: 1, alignItems: 'center', gap: 3 },
  tabLabel: { fontSize: 11 },
  tabLabelActive: { color: PURPLE, fontWeight: '700' },
  tabActiveIndicator: { position: 'absolute', bottom: -10, width: 20, height: 3, backgroundColor: PURPLE, borderRadius: 2 },

  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', alignItems: 'center', padding: 24 },
  modalBox: { width: '100%', borderRadius: 16, padding: 20 },
  modalTitle: { fontSize: 18, fontWeight: '700', marginBottom: 16 },
  modalInput: { borderRadius: 10, paddingHorizontal: 14, paddingVertical: 12, fontSize: 14, marginBottom: 12 },
  modalBtns: { flexDirection: 'row', gap: 10, marginTop: 4 },
  modalCancelBtn: { flex: 1, borderRadius: 10, paddingVertical: 12, alignItems: 'center' },
  modalCancelText: { fontSize: 14, fontWeight: '600' },
  modalSaveBtn: { flex: 1, borderRadius: 10, paddingVertical: 12, alignItems: 'center', backgroundColor: GREEN },
  modalSaveBtnDisabled: { opacity: 0.7 },
  modalSaveText: { fontSize: 14, fontWeight: '700', color: '#FFFFFF' },
  strengthContainer: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 12, paddingHorizontal: 2 },
  strengthBarBg: { flex: 1, height: 5, borderRadius: 3, backgroundColor: '#E0E0E0' },
  strengthBarFill: { height: 5, borderRadius: 3 },
  strengthLabel: { fontSize: 11, fontWeight: '700', width: 45 },
});
