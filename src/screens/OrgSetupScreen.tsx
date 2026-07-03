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
  PermissionsAndroid,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import type { RootStackParamList } from '../types/navigation';
import Geolocation from '@react-native-community/geolocation';
import { createOrganization, joinOrganizationByInviteCode } from '../lib/organization';
import {
  GlobeIcon, MapPinIcon, KeyIcon, NavigationIcon, CheckCircleIcon, SunIcon, MoonIcon,
} from '../components/Icons';

type NavigationProp = NativeStackNavigationProp<RootStackParamList, 'OrgSetup'>;

const PURPLE = '#3D2C8D';
const GREEN = '#5DBB7A';

type Mode = 'create' | 'join';

export default function OrgSetupScreen() {
  const navigation = useNavigation<NavigationProp>();
  const [darkMode, setDarkMode] = useState(true);
  const [mode, setMode] = useState<Mode>('create');

  // Create-organization fields
  const [orgName, setOrgName] = useState('');
  const [officeLat, setOfficeLat] = useState<number | null>(null);
  const [officeLng, setOfficeLng] = useState<number | null>(null);
  const [radius, setRadius] = useState('50');
  const [locatingOffice, setLocatingOffice] = useState(false);

  // Join-organization field
  const [inviteCode, setInviteCode] = useState('');

  const [submitting, setSubmitting] = useState(false);

  const theme = darkMode ? dark : light;

  const requestLocationPermission = async (): Promise<boolean> => {
    if (Platform.OS !== 'android') return true;
    const already = await PermissionsAndroid.check(PermissionsAndroid.PERMISSIONS.ACCESS_FINE_LOCATION);
    if (already) return true;
    const result = await PermissionsAndroid.request(
      PermissionsAndroid.PERMISSIONS.ACCESS_FINE_LOCATION,
      {
        title: 'Location Permission',
        message: 'GeoLock needs location access to set your office coordinates.',
        buttonPositive: 'Allow',
        buttonNegative: 'Deny',
      },
    );
    return result === PermissionsAndroid.RESULTS.GRANTED;
  };

  const useCurrentLocationAsOffice = async () => {
    const ok = await requestLocationPermission();
    if (!ok) {
      Alert.alert('Permission Denied', 'Location permission is required to set the office location.');
      return;
    }
    setLocatingOffice(true);
    Geolocation.getCurrentPosition(
      pos => {
        setOfficeLat(pos.coords.latitude);
        setOfficeLng(pos.coords.longitude);
        setLocatingOffice(false);
      },
      () => {
        setLocatingOffice(false);
        Alert.alert('Location Error', 'Could not get your current location. Please try again outdoors or near a window.');
      },
      { enableHighAccuracy: true, timeout: 15000, maximumAge: 10000 },
    );
  };

  const handleCreate = async () => {
    if (!orgName.trim()) {
      Alert.alert('Missing Field', 'Please enter your organization name.');
      return;
    }
    if (officeLat === null || officeLng === null) {
      Alert.alert('Missing Location', 'Please set the office location before continuing.');
      return;
    }
    const radiusNum = parseInt(radius, 10);
    if (!radiusNum || radiusNum <= 0) {
      Alert.alert('Invalid Radius', 'Please enter a valid geofence radius in meters.');
      return;
    }

    setSubmitting(true);
    const result = await createOrganization(orgName.trim(), officeLat, officeLng, radiusNum);
    setSubmitting(false);

    if (result.success) {
      Alert.alert('Organization Created', `${orgName} is ready. You're set as the admin.`, [
        { text: 'Continue', onPress: () => navigation.replace('Home') },
      ]);
    } else {
      Alert.alert('Error', result.error || 'Failed to create organization.');
    }
  };

  const handleJoin = async () => {
    if (!inviteCode.trim()) {
      Alert.alert('Missing Field', 'Please enter your invite code.');
      return;
    }

    setSubmitting(true);
    const result = await joinOrganizationByInviteCode(inviteCode.trim());
    setSubmitting(false);

    if (result.success) {
      Alert.alert('Joined!', `You're now part of ${result.organization?.name}.`, [
        { text: 'Continue', onPress: () => navigation.replace('Home') },
      ]);
    } else {
      Alert.alert('Error', result.error || 'Failed to join organization.');
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

          <View style={styles.iconBox}>
            <GlobeIcon size={48} color={GREEN} />
          </View>

          <Text style={[styles.title, { color: theme.text }]}>Set Up Your Workspace</Text>
          <Text style={[styles.subtitle, { color: theme.subtext }]}>
            Create a new organization or join an existing one with an invite code.
          </Text>

          {/* Mode switch */}
          <View style={[styles.modeSwitch, { backgroundColor: theme.inputBg }]}>
            <TouchableOpacity
              style={[styles.modeBtn, mode === 'create' && styles.modeBtnActive]}
              onPress={() => setMode('create')}
            >
              <Text style={[styles.modeBtnText, { color: mode === 'create' ? '#FFF' : theme.subtext }]}>Create Org</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.modeBtn, mode === 'join' && styles.modeBtnActive]}
              onPress={() => setMode('join')}
            >
              <Text style={[styles.modeBtnText, { color: mode === 'join' ? '#FFF' : theme.subtext }]}>Join Org</Text>
            </TouchableOpacity>
          </View>

          {mode === 'create' ? (
            <>
              <Text style={[styles.fieldLabel, { color: theme.subtext }]}>ORGANIZATION NAME</Text>
              <View style={[styles.inputBox, { backgroundColor: theme.inputBg, borderColor: theme.border }]}>
                <GlobeIcon size={16} color={theme.subtext} />
                <TextInput
                  style={[styles.input, { color: theme.text }]}
                  value={orgName}
                  onChangeText={setOrgName}
                  placeholder="e.g. Acme Corp"
                  placeholderTextColor={theme.placeholder}
                />
              </View>

              <Text style={[styles.fieldLabel, { color: theme.subtext }]}>OFFICE LOCATION</Text>
              <TouchableOpacity
                style={[styles.locateBtn, { backgroundColor: theme.inputBg, borderColor: theme.border }]}
                onPress={useCurrentLocationAsOffice}
                disabled={locatingOffice}
              >
                <NavigationIcon size={16} color={GREEN} />
                <Text style={[styles.locateBtnText, { color: theme.text }]}>
                  {locatingOffice ? 'Getting location...' : 'Use my current location as office'}
                </Text>
                {locatingOffice && <ActivityIndicator size="small" color={GREEN} />}
              </TouchableOpacity>
              {officeLat !== null && officeLng !== null && (
                <View style={styles.coordsRow}>
                  <MapPinIcon size={14} color={GREEN} />
                  <Text style={[styles.coordsText, { color: theme.subtext }]}>
                    {officeLat.toFixed(6)}, {officeLng.toFixed(6)}
                  </Text>
                </View>
              )}

              <Text style={[styles.fieldLabel, { color: theme.subtext, marginTop: 16 }]}>GEOFENCE RADIUS (METERS)</Text>
              <View style={[styles.inputBox, { backgroundColor: theme.inputBg, borderColor: theme.border }]}>
                <TextInput
                  style={[styles.input, { color: theme.text }]}
                  value={radius}
                  onChangeText={setRadius}
                  placeholder="50"
                  placeholderTextColor={theme.placeholder}
                  keyboardType="number-pad"
                />
              </View>

              <TouchableOpacity
                style={[styles.submitBtn, submitting && styles.submitBtnDisabled]}
                onPress={handleCreate}
                disabled={submitting}
                activeOpacity={0.85}
              >
                {submitting
                  ? <ActivityIndicator color="#FFF" />
                  : <Text style={styles.submitBtnText}>Create Organization</Text>
                }
              </TouchableOpacity>
            </>
          ) : (
            <>
              <Text style={[styles.fieldLabel, { color: theme.subtext }]}>INVITE CODE</Text>
              <View style={[styles.inputBox, { backgroundColor: theme.inputBg, borderColor: theme.border }]}>
                <KeyIcon size={16} color={theme.subtext} />
                <TextInput
                  style={[styles.input, { color: theme.text, letterSpacing: 2 }]}
                  value={inviteCode}
                  onChangeText={setInviteCode}
                  placeholder="e.g. 7K3PX9QZ"
                  placeholderTextColor={theme.placeholder}
                  autoCapitalize="characters"
                />
              </View>
              <Text style={[styles.hint, { color: theme.subtext }]}>
                Ask your admin for the invite code for your organization.
              </Text>

              <TouchableOpacity
                style={[styles.submitBtn, submitting && styles.submitBtnDisabled]}
                onPress={handleJoin}
                disabled={submitting}
                activeOpacity={0.85}
              >
                {submitting
                  ? <ActivityIndicator color="#FFF" />
                  : <Text style={styles.submitBtnText}>Join Organization</Text>
                }
              </TouchableOpacity>
            </>
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
  iconBox: { alignItems: 'center', marginTop: 8, marginBottom: 16 },
  title: { fontSize: 24, fontWeight: '800', marginBottom: 8, textAlign: 'center' },
  subtitle: { fontSize: 14, marginBottom: 22, lineHeight: 20, textAlign: 'center' },

  modeSwitch: { flexDirection: 'row', borderRadius: 12, padding: 4, marginBottom: 22 },
  modeBtn: { flex: 1, paddingVertical: 10, borderRadius: 9, alignItems: 'center' },
  modeBtnActive: { backgroundColor: GREEN },
  modeBtnText: { fontSize: 13, fontWeight: '700' },

  fieldLabel: { fontSize: 11, fontWeight: '700', letterSpacing: 1, marginBottom: 8 },
  inputBox: { flexDirection: 'row', alignItems: 'center', borderRadius: 12, borderWidth: 1, paddingHorizontal: 14, paddingVertical: Platform.OS === 'ios' ? 14 : 4, marginBottom: 16, gap: 10 },
  input: { flex: 1, fontSize: 14 },

  locateBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 10,
    borderRadius: 12, borderWidth: 1, paddingHorizontal: 14, paddingVertical: 14,
  },
  locateBtnText: { flex: 1, fontSize: 13, fontWeight: '600' },
  coordsRow: { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 8, marginLeft: 2 },
  coordsText: { fontSize: 12 },

  hint: { fontSize: 12, marginBottom: 20, marginTop: -6 },

  submitBtn: { backgroundColor: GREEN, borderRadius: 14, paddingVertical: 16, alignItems: 'center', marginTop: 8, shadowColor: GREEN, shadowOffset: { width: 0, height: 6 }, shadowOpacity: 0.35, shadowRadius: 10, elevation: 6 },
  submitBtnDisabled: { backgroundColor: '#3A7A50', shadowOpacity: 0 },
  submitBtnText: { color: '#FFF', fontSize: 16, fontWeight: '700' },
});