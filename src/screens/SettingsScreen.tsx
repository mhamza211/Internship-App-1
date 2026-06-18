import React, { useState } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity,
  ScrollView, StatusBar, SafeAreaView, Platform, Alert, Switch,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import type { RootStackParamList } from '../types/navigation';
import { supabase } from '../lib/supabase';

type NavigationProp = NativeStackNavigationProp<RootStackParamList, 'Settings'>;

const PURPLE = '#3D2C8D';
const GREEN  = '#5DBB7A';

export default function SettingsScreen() {
  const navigation = useNavigation<NavigationProp>();
  const [lightMode, setLightMode] = useState(true);
  const [notifications, setNotifications] = useState(true);
  const [activeTab, setActiveTab] = useState<'Home' | 'Attendance' | 'History' | 'Settings'>('Settings');

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
        '🔔 Notifications Enabled',
        'You will now receive attendance reminders and check-in alerts.',
        [{ text: 'OK' }]
      );
    } else {
      Alert.alert(
        '🔕 Notifications Disabled',
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

  return (
    <SafeAreaView style={[styles.safeArea, { backgroundColor: bg }]}>
      <StatusBar barStyle="light-content" backgroundColor={PURPLE} />

      {/* Fixed Header */}
      <View style={styles.header}>
        <View style={styles.headerTop}>
          <View style={styles.headerBrand}>
            <Text style={styles.headerLock}>🔒</Text>
            <View>
              <Text style={styles.headerAppName}>GEOLOCK</Text>
              <Text style={styles.headerRole}>EMPLOYEE</Text>
            </View>
          </View>
          <TouchableOpacity
            style={styles.headerThemeBtn}
            onPress={() => setLightMode(!lightMode)}
          >
            <Text style={styles.headerThemeIcon}>{lightMode ? '🌙' : '☀️'}</Text>
          </TouchableOpacity>
        </View>
        <Text style={styles.headerTitle}>Settings</Text>
      </View>

      <ScrollView style={styles.scrollView} contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>

        {/* Profile Settings */}
        <View style={[styles.section, { backgroundColor: cardBg }]}>
          <View style={styles.sectionTitleRow}>
            <Text style={styles.sectionIcon}>👤</Text>
            <Text style={[styles.sectionTitle, { color: textColor }]}>Profile settings</Text>
          </View>
          <View style={[styles.fieldBox, { backgroundColor: fieldBg }]}>
            <Text style={styles.fieldLabel}>NAME</Text>
            <Text style={[styles.fieldValue, { color: textColor }]}>Muhammad Hamza</Text>
          </View>
          <View style={[styles.fieldBox, { backgroundColor: fieldBg }]}>
            <Text style={styles.fieldLabel}>EMAIL</Text>
            <Text style={[styles.fieldValue, { color: textColor }]}>mhamza8732@gmail.com</Text>
          </View>
          <View style={[styles.fieldBox, { backgroundColor: fieldBg, marginBottom: 0 }]}>
            <Text style={styles.fieldLabel}>ROLE</Text>
            <Text style={[styles.fieldValue, { color: textColor }]}>Employee</Text>
          </View>
        </View>

        {/* Theme and Notifications */}
        <View style={[styles.section, { backgroundColor: cardBg }]}>
          <View style={styles.sectionTitleRow}>
            <Text style={styles.sectionIcon}>🌐</Text>
            <Text style={[styles.sectionTitle, { color: textColor }]}>Theme and notifications</Text>
          </View>

          {/* Light/Dark Mode */}
          <View style={[styles.settingRow, { backgroundColor: fieldBg }]}>
            <View style={styles.settingLeft}>
              <Text style={styles.settingRowIcon}>{lightMode ? '☀️' : '🌙'}</Text>
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

          {/* Notifications */}
          <View style={[styles.settingRow, { backgroundColor: fieldBg, marginBottom: 0 }]}>
            <View style={styles.settingLeft}>
              <Text style={styles.settingRowIcon}>{notifications ? '🔔' : '🔕'}</Text>
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

        {/* Password Change */}
        <View style={[styles.section, { backgroundColor: cardBg }]}>
          <View style={styles.sectionTitleRow}>
            <Text style={styles.sectionIcon}>🔒</Text>
            <Text style={[styles.sectionTitle, { color: textColor }]}>Password change</Text>
          </View>
          <TouchableOpacity
            style={[styles.actionBtn, { backgroundColor: fieldBg }]}
            onPress={() => Alert.alert('Update Password', 'This feature will be available soon.')}
            activeOpacity={0.7}
          >
            <Text style={[styles.actionBtnText, { color: textColor }]}>Update password</Text>
          </TouchableOpacity>
        </View>

        {/* Security */}
        <View style={[styles.section, { backgroundColor: cardBg }]}>
          <View style={styles.sectionTitleRow}>
            <Text style={styles.sectionIcon}>🛡️</Text>
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
            <Text style={styles.logoutIcon}>→</Text>
            <Text style={styles.logoutText}>Logout</Text>
          </TouchableOpacity>
        </View>

        <View style={{ height: 8 }} />
      </ScrollView>

      {/* Bottom Tab Bar — 3 tabs */}
      <View style={[styles.tabBar, { backgroundColor: cardBg, borderTopColor: borderColor }]}>
        <TouchableOpacity
          style={styles.tabItem}
          onPress={() => { setActiveTab('Home'); navigation.navigate('Home'); }}
        >
          <Text style={styles.tabIcon}>🏠</Text>
          <Text style={[styles.tabLabel, { color: subColor }, activeTab === 'Home' && styles.tabLabelActive]}>Home</Text>
          {activeTab === 'Home' && <View style={styles.tabActiveIndicator} />}
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.tabItem}
          onPress={() => { setActiveTab('Attendance'); navigation.navigate('Attendance'); }}
        >
          <Text style={styles.tabIcon}>🕐</Text>
          <Text style={[styles.tabLabel, { color: subColor }, activeTab === 'Attendance' && styles.tabLabelActive]}>Attendance</Text>
          {activeTab === 'Attendance' && <View style={styles.tabActiveIndicator} />}
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.tabItem}
          onPress={() => setActiveTab('Settings')}
        >
          <Text style={styles.tabIcon}>⚙️</Text>
          <Text style={[styles.tabLabel, { color: subColor }, activeTab === 'Settings' && styles.tabLabelActive]}>Settings</Text>
          {activeTab === 'Settings' && <View style={styles.tabActiveIndicator} />}
        </TouchableOpacity>
      </View>
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
  headerLock: { fontSize: 18 },
  headerAppName: { color: '#FFFFFF', fontSize: 13, fontWeight: '800', letterSpacing: 1.5 },
  headerRole: { color: 'rgba(255,255,255,0.6)', fontSize: 10, fontWeight: '600', letterSpacing: 1 },
  headerThemeBtn: { width: 36, height: 36, borderRadius: 18, backgroundColor: 'rgba(255,255,255,0.15)', alignItems: 'center', justifyContent: 'center' },
  headerThemeIcon: { fontSize: 16 },
  headerTitle: { color: '#FFFFFF', fontSize: 26, fontWeight: '800' },
  scrollView: { flex: 1 },
  scrollContent: { padding: 16, gap: 14, paddingBottom: 32 },
  section: { borderRadius: 16, padding: 16, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.05, shadowRadius: 6, elevation: 2 },
  sectionTitleRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 14 },
  sectionIcon: { fontSize: 16 },
  sectionTitle: { fontSize: 15, fontWeight: '700' },
  fieldBox: { borderRadius: 10, paddingHorizontal: 14, paddingVertical: 12, marginBottom: 10 },
  fieldLabel: { fontSize: 10, fontWeight: '700', color: '#AAA', letterSpacing: 1, marginBottom: 4 },
  fieldValue: { fontSize: 14, fontWeight: '600' },
  settingRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', borderRadius: 10, paddingHorizontal: 14, paddingVertical: 12, marginBottom: 10 },
  settingLeft: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  settingRowIcon: { fontSize: 16 },
  settingRowText: { fontSize: 14, fontWeight: '600' },
  settingRowSub: { fontSize: 11, marginTop: 2 },
  actionBtn: { borderRadius: 10, paddingHorizontal: 14, paddingVertical: 14 },
  actionBtnText: { fontSize: 14, fontWeight: '600' },
  securityText: { fontSize: 13, lineHeight: 20, marginBottom: 14 },
  logoutBtn: { flexDirection: 'row', alignItems: 'center', gap: 8, borderRadius: 10, paddingHorizontal: 14, paddingVertical: 14 },
  logoutIcon: { fontSize: 16, color: '#E53935' },
  logoutText: { fontSize: 14, fontWeight: '700', color: '#E53935' },
  tabBar: { flexDirection: 'row', borderTopWidth: 1, paddingBottom: Platform.OS === 'ios' ? 20 : 8, paddingTop: 10 },
  tabItem: { flex: 1, alignItems: 'center', gap: 3 },
  tabIcon: { fontSize: 20 },
  tabLabel: { fontSize: 11 },
  tabLabelActive: { color: PURPLE, fontWeight: '700' },
  tabActiveIndicator: { position: 'absolute', bottom: -10, width: 20, height: 3, backgroundColor: PURPLE, borderRadius: 2 },
});