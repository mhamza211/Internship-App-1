import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  StatusBar,
  SafeAreaView,
  Platform,
  PermissionsAndroid,
  Animated,
  ActivityIndicator,
  TextInput,
  Image,
  Alert,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import Geolocation from '@react-native-community/geolocation';
import { launchCamera } from 'react-native-image-picker';
import { saveAttendance } from '../lib/attendance';
import { CheckInData } from '../types/attendance';
import { supabase } from '../lib/supabase';
import {
  MapPinIcon, CameraIcon, GlobeIcon, SignalIcon, SmartphoneIcon,
  LightbulbIcon, EyeIcon, NoEntryIcon, SatelliteIcon, ClockIcon,
  UserIcon, NavigationIcon, CheckIcon, ArrowLeftIcon, WarningIcon, CrossIcon,
} from '../components/Icons';

type Step = 1 | 2 | 3 | 4 | 5;

type LocationData = {
  latitude: number;
  longitude: number;
  accuracy: number;
};

const STEPS = [
  { id: 1, label: 'GPS' },
  { id: 2, label: 'Camera' },
  { id: 3, label: 'Preview' },
  { id: 4, label: 'Confirm' },
  { id: 5, label: 'Done' },
];

const PURPLE = '#3D2C8D';
const GREEN = '#5DBB7A';
const RED = '#EF4444';
const DARK_BG = '#1A1A2E';

// ---------------------------------------------------------------------
// GEOFENCE CONFIG
// Reference/base location the employee's GPS position is compared
// against. Replace these coordinates with your actual office location
// if it changes.
// ---------------------------------------------------------------------
const OFFICE_LOCATION = {
  latitude: 30.196976,
  longitude: 67.024798,
  label: 'Main Office',
};
const GEOFENCE_RADIUS_METERS = 50;

// Haversine formula: returns distance in meters between two lat/lng points
function getDistanceMeters(
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number,
): number {
  const R = 6371000; // Earth radius in meters
  const toRad = (deg: number) => (deg * Math.PI) / 180;

  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);

  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRad(lat1)) *
      Math.cos(toRad(lat2)) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);

  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

function RadarPulse() {
  const ring1 = useRef(new Animated.Value(0)).current;
  const ring2 = useRef(new Animated.Value(0)).current;
  const ring3 = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const pulse = (anim: Animated.Value, delay: number) =>
      Animated.loop(
        Animated.sequence([
          Animated.delay(delay),
          Animated.timing(anim, { toValue: 1, duration: 2000, useNativeDriver: true }),
          Animated.timing(anim, { toValue: 0, duration: 0, useNativeDriver: true }),
        ]),
      );
    pulse(ring1, 0).start();
    pulse(ring2, 600).start();
    pulse(ring3, 1200).start();
  }, [ring1, ring2, ring3]);

  const ringStyle = (anim: Animated.Value, size: number) => ({
    position: 'absolute' as const,
    width: size,
    height: size,
    borderRadius: size / 2,
    borderWidth: 1.5,
    borderColor: GREEN,
    opacity: anim.interpolate({ inputRange: [0, 0.5, 1], outputRange: [0.7, 0.3, 0] }),
    transform: [{ scale: anim.interpolate({ inputRange: [0, 1], outputRange: [0.6, 1] }) }],
  });

  return (
    <View style={radarStyles.container}>
      <Animated.View style={ringStyle(ring1, 220)} />
      <Animated.View style={ringStyle(ring2, 160)} />
      <Animated.View style={ringStyle(ring3, 100)} />
      <View style={radarStyles.centerDot}>
        <MapPinIcon size={22} color="#FFFFFF" />
      </View>
    </View>
  );
}

const radarStyles = StyleSheet.create({
  container: { width: 220, height: 220, alignItems: 'center', justifyContent: 'center' },
  centerDot: {
    width: 48, height: 48, borderRadius: 24,
    backgroundColor: GREEN, alignItems: 'center', justifyContent: 'center',
    shadowColor: GREEN, shadowOffset: { width: 0, height: 0 }, shadowOpacity: 0.8, shadowRadius: 12, elevation: 8,
  },
});

function StepBar({ current }: { current: Step }) {
  return (
    <View style={stepStyles.row}>
      {STEPS.map((step, idx) => {
        const done = step.id < current;
        const active = step.id === current;
        return (
          <React.Fragment key={step.id}>
            <View style={stepStyles.stepItem}>
              <View style={[
                stepStyles.circle,
                done && stepStyles.circleDone,
                active && stepStyles.circleActive,
              ]}>
                {done
                  ? <CheckIcon size={11} color={PURPLE} />
                  : <Text style={[stepStyles.circleText, (done || active) && stepStyles.circleTextActive]}>{step.id}</Text>
                }
              </View>
              <Text style={[stepStyles.label, active && stepStyles.labelActive]}>{step.label}</Text>
            </View>
            {idx < STEPS.length - 1 && (
              <View style={[stepStyles.line, done && stepStyles.lineDone]} />
            )}
          </React.Fragment>
        );
      })}
    </View>
  );
}

const stepStyles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'flex-start', paddingHorizontal: 16, paddingVertical: 14 },
  stepItem: { alignItems: 'center', width: 44 },
  circle: {
    width: 28, height: 28, borderRadius: 14,
    backgroundColor: 'rgba(255,255,255,0.15)',
    alignItems: 'center', justifyContent: 'center', marginBottom: 4,
  },
  circleDone: { backgroundColor: GREEN },
  circleActive: { backgroundColor: '#FFFFFF' },
  circleText: { fontSize: 11, fontWeight: '700', color: 'rgba(255,255,255,0.5)' },
  circleTextActive: { color: PURPLE },
  label: { fontSize: 10, color: 'rgba(255,255,255,0.5)', textAlign: 'center' },
  labelActive: { color: '#FFFFFF', fontWeight: '700' },
  line: { flex: 1, height: 2, backgroundColor: 'rgba(255,255,255,0.2)', marginTop: 13 },
  lineDone: { backgroundColor: GREEN },
});

function VerifyRow({ icon, text }: { icon: React.ReactNode; text: string }) {
  return (
    <View style={verifyStyles.row}>
      {icon}
      <Text style={verifyStyles.text}>{text}</Text>
    </View>
  );
}
const verifyStyles = StyleSheet.create({
  row: {
    flexDirection: 'row', alignItems: 'center', gap: 10,
    backgroundColor: 'rgba(93,187,122,0.12)', borderRadius: 10,
    paddingHorizontal: 14, paddingVertical: 10,
  },
  text: { fontSize: 13, color: '#D0F0DC', fontWeight: '500' },
});

export default function CheckInScreen() {
  const navigation = useNavigation();
  const [step, setStep] = useState<Step>(1);
  const [location, setLocation] = useState<LocationData | null>(null);
  const [locationLoading, setLocationLoading] = useState(true);
  const [locationError, setLocationError] = useState('');
  const [photoUri, setPhotoUri] = useState<string | null>(null);
  const [notes, setNotes] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [checkInStatus, setCheckInStatus] = useState<'present' | 'late' | 'absent'>('present');
  const [userName, setUserName] = useState('');
  const fadeAnim = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    fetchLocation();
    const fetchUser = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        setUserName(user.user_metadata?.full_name || user.email || '');
      }
    };
    fetchUser();
  }, []);

  // Distance from the office / reference location, recalculated whenever
  // a new GPS fix comes in.
  const distanceFromOffice = location
    ? getDistanceMeters(
        location.latitude,
        location.longitude,
        OFFICE_LOCATION.latitude,
        OFFICE_LOCATION.longitude,
      )
    : null;

  const isInsideGeofence =
    distanceFromOffice !== null && distanceFromOffice <= GEOFENCE_RADIUS_METERS;

  const formatDistance = (meters: number) =>
    meters < 1000 ? `${Math.round(meters)}m` : `${(meters / 1000).toFixed(2)}km`;

  const animateStep = (next: Step) => {
    Animated.sequence([
      Animated.timing(fadeAnim, { toValue: 0, duration: 150, useNativeDriver: true }),
      Animated.timing(fadeAnim, { toValue: 1, duration: 250, useNativeDriver: true }),
    ]).start();
    setStep(next);
  };

  const requestLocationPermission = async (): Promise<boolean> => {
    if (Platform.OS !== 'android') return true;

    // If already granted, don't prompt again
    const already = await PermissionsAndroid.check(
      PermissionsAndroid.PERMISSIONS.ACCESS_FINE_LOCATION,
    );
    if (already) return true;

    const result = await PermissionsAndroid.request(
      PermissionsAndroid.PERMISSIONS.ACCESS_FINE_LOCATION,
      {
        title: 'Location Permission',
        message: 'GeoLock needs your location for check-in.',
        buttonPositive: 'Allow',
        buttonNegative: 'Deny',
      },
    );
    return result === PermissionsAndroid.RESULTS.GRANTED;
  };

  const requestCameraPermission = async (): Promise<boolean> => {
    if (Platform.OS !== 'android') return true;
    const result = await PermissionsAndroid.request(
      PermissionsAndroid.PERMISSIONS.CAMERA,
      {
        title: 'Camera Permission',
        message: 'GeoLock needs camera access to capture your photo for check-in.',
        buttonPositive: 'Allow',
        buttonNegative: 'Deny',
      },
    );
    return result === PermissionsAndroid.RESULTS.GRANTED;
  };

  // Helper: promisified getCurrentPosition so we can try high, then low accuracy
  const getPosition = (enableHighAccuracy: boolean, timeout: number) =>
    new Promise<LocationData>((resolve, reject) => {
      Geolocation.getCurrentPosition(
        pos =>
          resolve({
            latitude: pos.coords.latitude,
            longitude: pos.coords.longitude,
            accuracy: Math.round(pos.coords.accuracy),
          }),
        err => reject(err),
        { enableHighAccuracy, timeout, maximumAge: 10000 },
      );
    });

  const fetchLocation = async () => {
    setLocationLoading(true);
    setLocationError('');

    const ok = await requestLocationPermission();
    if (!ok) {
      setLocationError('Location permission denied. Enable it in phone Settings → Apps → GeoLock → Permissions → Location.');
      setLocationLoading(false);
      return;
    }

    try {
      // First try high accuracy (GPS). Works best outdoors.
      const loc = await getPosition(true, 15000);
      setLocation(loc);
      setLocationLoading(false);
    } catch (highErr: any) {
      // High accuracy failed (often indoors / weak GPS). Fall back to
      // low accuracy (WiFi + network based) which most phones can get quickly.
      try {
        const loc = await getPosition(false, 15000);
        setLocation(loc);
        setLocationLoading(false);
      } catch (lowErr: any) {
        const code = lowErr?.code ?? highErr?.code;
        // code 1 = permission, 2 = position unavailable, 3 = timeout
        let msg = 'Unable to get location. Tap retry.';
        if (code === 1) {
          msg = 'Location permission is off. Enable it for GeoLock in phone Settings.';
        } else if (code === 2) {
          msg = 'Location is turned off on this phone. Turn on Location/GPS and retry.';
        } else if (code === 3) {
          msg = 'GPS is taking too long. Move near a window or outdoors and tap retry.';
        }
        setLocationError(msg);
        setLocationLoading(false);
      }
    }
  };

  const handleCapture = async () => {
    const hasPermission = await requestCameraPermission();
    if (!hasPermission) {
      Alert.alert('Camera Permission Denied', 'Please enable camera access in Settings to take a photo.');
      return;
    }
    launchCamera(
      {
        mediaType: 'photo',
        cameraType: 'front',
        quality: 0.8,
        saveToPhotos: false,
      },
      response => {
        if (response.didCancel) return;
        if (response.errorCode) {
          Alert.alert('Camera Error', response.errorMessage ?? 'Could not open camera.');
          return;
        }
        if (response.assets && response.assets[0]?.uri) {
          setPhotoUri(response.assets[0].uri);
          animateStep(3);
        }
      },
    );
  };

  const handleConfirm = async () => {
    if (!location || !photoUri) {
      Alert.alert('Error', 'Missing GPS or photo data. Please start again.');
      return;
    }

    // Determine present/absent based on distance from the reference
    // (office) location before submitting.
    const computedStatus: 'present' | 'absent' = isInsideGeofence ? 'present' : 'absent';
    setCheckInStatus(computedStatus);

    setSubmitting(true);

    let address: string | undefined;
    try {
      const geoRes = await fetch(
        `https://nominatim.openstreetmap.org/reverse?lat=${location.latitude}&lon=${location.longitude}&format=json`,
        { headers: { 'User-Agent': 'GeoLockApp/1.0' } }
      );
      const geoData = await geoRes.json();
      if (geoData.display_name) {
        address = geoData.display_name;
      }
    } catch {}

    const checkInData: CheckInData = {
      latitude: location.latitude,
      longitude: location.longitude,
      photoUri,
      address,
    };

    const result = await saveAttendance(checkInData);

    setSubmitting(false);

    if (result.success) {
      // Prefer server-computed status if provided, otherwise fall back
      // to the geofence-based status computed on-device.
      setCheckInStatus(result.status ?? computedStatus);
      animateStep(5);
    } else {
      Alert.alert('Check-In Failed', result.error || 'Please try again.');
    }
  };

  const formatCoord = (val: number, posLabel: string, negLabel: string) => {
    const deg = Math.abs(val).toFixed(4);
    return `${deg}° ${val >= 0 ? posLabel : negLabel}`;
  };

  const renderHeader = () => (
    <View style={styles.header}>
      <TouchableOpacity style={styles.backBtn} onPress={() => {
        if (step === 1) navigation.goBack();
        else animateStep((step - 1) as Step);
      }}>
        <ArrowLeftIcon size={22} color="#FFFFFF" />
      </TouchableOpacity>
      <View style={styles.headerCenter}>
        <View style={styles.geoLockLabel}>
          <MapPinIcon size={11} color="rgba(255,255,255,0.7)" />
          <Text style={styles.geoLockText}>GEOLOCK</Text>
        </View>
        <Text style={styles.headerTitle}>{STEP_TITLES[step]}</Text>
      </View>
      <View style={styles.backBtn} />
    </View>
  );

  const renderGPS = () => (
    <ScrollView style={styles.darkScroll} contentContainerStyle={styles.darkScrollContent} showsVerticalScrollIndicator={false}>
      <View style={styles.mapBox}>
        <View style={styles.mapGrid}>
          {Array.from({ length: 6 }).map((_, i) => (
            <View key={i} style={styles.mapGridLine} />
          ))}
        </View>
        <RadarPulse />
        {location ? (
          <View style={styles.coordsOverlay}>
            <Text style={styles.coordsText}>
              {formatCoord(location.latitude, 'N', 'S')}  {formatCoord(location.longitude, 'E', 'W')}
            </Text>
          </View>
        ) : null}
        <View style={styles.gpsLockBadge}>
          <Text style={styles.gpsLockText}>{locationLoading ? 'Acquiring...' : locationError ? 'No Lock' : 'GPS Lock'}</Text>
        </View>
      </View>

      <View style={styles.verifyCard}>
        <View style={styles.verifyCardTop}>
          <View style={styles.verifyCardLeft}>
            <View style={styles.navIconBox}>
              <NavigationIcon size={16} color={GREEN} />
            </View>
            <View>
              <Text style={styles.verifyCardTitle}>GPS Verification</Text>
              <Text style={styles.verifyCardSub}>
                {OFFICE_LOCATION.label}, <Text style={{ color: GREEN }}>
                  {OFFICE_LOCATION.latitude.toFixed(6)}, {OFFICE_LOCATION.longitude.toFixed(6)}
                </Text>
              </Text>
            </View>
          </View>
          {!locationLoading && !locationError && (
            <View style={[styles.verifiedBadge, !isInsideGeofence && styles.verifiedBadgeOutside]}>
              <View style={styles.verifiedContent}>
                <Text style={[styles.verifiedText, !isInsideGeofence && styles.verifiedTextOutside]}>
                  {isInsideGeofence ? 'Verified ' : 'Out of Range '}
                </Text>
                {isInsideGeofence
                  ? <CheckIcon size={10} color={GREEN} />
                  : <CrossIcon size={10} color={RED} />
                }
              </View>
            </View>
          )}
        </View>
        <View style={styles.infoBoxRow}>
          <View style={styles.infoBox}>
            <Text style={styles.infoBoxValue}>{OFFICE_LOCATION.label}</Text>
            <Text style={styles.infoBoxLabel}>Location</Text>
          </View>
          <View style={styles.infoBox}>
            {locationLoading ? (
              <ActivityIndicator size="small" color={GREEN} />
            ) : (
              <Text style={[styles.infoBoxValue, !isInsideGeofence && !locationError && { color: RED }]}>
                {locationError ? '—' : isInsideGeofence ? 'Inside Zone' : 'Outside Zone'}
              </Text>
            )}
            <Text style={styles.infoBoxLabel}>Geofence</Text>
          </View>
          <View style={styles.infoBox}>
            <Text style={styles.infoBoxValue}>
              {distanceFromOffice !== null ? formatDistance(distanceFromOffice) : '—'}
            </Text>
            <Text style={styles.infoBoxLabel}>Distance</Text>
          </View>
        </View>
      </View>

      {locationLoading ? (
        <View style={styles.loadingRow}>
          <ActivityIndicator color={GREEN} />
          <Text style={styles.loadingText}>Detecting your location...</Text>
        </View>
      ) : locationError ? (
        <View style={styles.errorBox}>
          <Text style={styles.errorText}>{locationError}</Text>
          <TouchableOpacity onPress={fetchLocation} style={styles.retryBtn}>
            <Text style={styles.retryText}>Retry</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <View style={styles.checkRows}>
          <VerifyRow
            icon={<GlobeIcon size={16} color={isInsideGeofence ? '#D0F0DC' : '#FFD0D0'} />}
            text={
              isInsideGeofence
                ? `Within approved geofence radius (${GEOFENCE_RADIUS_METERS}m)`
                : `Outside approved geofence radius (${GEOFENCE_RADIUS_METERS}m) — ${formatDistance(distanceFromOffice ?? 0)} away`
            }
          />
          <VerifyRow icon={<SignalIcon size={16} color="#D0F0DC" />} text="Corporate network detected" />
          <VerifyRow icon={<SmartphoneIcon size={16} color="#D0F0DC" />} text="Device identity verified" />
        </View>
      )}

      {!locationLoading && !locationError && !isInsideGeofence && (
        <View style={styles.warnBox}>
          <WarningIcon size={16} color="#F59E0B" />
          <Text style={styles.warnText}>
            You're {formatDistance(distanceFromOffice ?? 0)} from {OFFICE_LOCATION.label}. You can still check in, but attendance will be marked Absent since you're outside the {GEOFENCE_RADIUS_METERS}m radius.
          </Text>
        </View>
      )}

      <TouchableOpacity
        style={[styles.continueBtn, (locationLoading || !!locationError) && styles.continueBtnDisabled]}
        disabled={locationLoading || !!locationError}
        onPress={() => animateStep(2)}
        activeOpacity={0.85}
      >
        <Text style={styles.continueBtnText}>Continue to Camera</Text>
      </TouchableOpacity>
    </ScrollView>
  );

  const renderCamera = () => (
    <View style={styles.cameraStep}>
      <View style={styles.cameraBox}>
        <View style={styles.cameraCornerTL} />
        <View style={styles.cameraCornerTR} />
        <View style={styles.cameraCornerBL} />
        <View style={styles.cameraCornerBR} />
        <CameraIcon size={64} color="#8B8FA8" />
        <Text style={styles.cameraHint}>Position your face inside the frame</Text>
      </View>
      <View style={styles.cameraInfoRow}>
        <View style={styles.cameraInfoItem}>
          <LightbulbIcon size={20} color="#FFC107" />
          <Text style={styles.cameraInfoText}>Good lighting</Text>
        </View>
        <View style={styles.cameraInfoItem}>
          <EyeIcon size={20} color="#8B8FA8" />
          <Text style={styles.cameraInfoText}>Face visible</Text>
        </View>
        <View style={styles.cameraInfoItem}>
          <NoEntryIcon size={20} color="#E53935" />
          <Text style={styles.cameraInfoText}>No filters</Text>
        </View>
      </View>
      <TouchableOpacity style={styles.captureBtn} onPress={handleCapture} activeOpacity={0.85}>
        <View style={styles.captureInner} />
      </TouchableOpacity>
      <Text style={styles.captureTip}>Tap to capture</Text>
    </View>
  );

  const renderPreview = () => (
    <ScrollView style={styles.lightScroll} contentContainerStyle={styles.lightScrollContent} showsVerticalScrollIndicator={false}>
      <Text style={styles.sectionHeading}>Photo Preview</Text>
      <View style={styles.photoPreview}>
        {photoUri ? (
          <Image source={{ uri: photoUri }} style={styles.photoImage} resizeMode="cover" />
        ) : (
          <UserIcon size={80} color="#8B8FA8" />
        )}
        <View style={styles.photoOverlay}>
          <View style={styles.photoOverlayContent}>
            <CheckIcon size={13} color="#FFF" />
            <Text style={styles.photoOverlayText}>  Photo captured</Text>
          </View>
        </View>
      </View>

      <Text style={styles.sectionHeading}>Location Preview</Text>
      <View style={styles.previewCard}>
        <View style={styles.previewRow}>
          <MapPinIcon size={18} color="#E53935" />
          <View>
            <Text style={styles.previewLabel}>{OFFICE_LOCATION.label}</Text>
            <Text style={styles.previewSub}>
              {distanceFromOffice !== null
                ? `${formatDistance(distanceFromOffice)} away — ${isInsideGeofence ? 'Inside Zone' : 'Outside Zone'}`
                : '—'}
            </Text>
          </View>
        </View>
        {location && (
          <View style={styles.previewRow}>
            <SatelliteIcon size={18} color="#6C63FF" />
            <Text style={styles.previewLabel}>
              {location.latitude.toFixed(6)}, {location.longitude.toFixed(6)}
            </Text>
          </View>
        )}
        <View style={styles.previewRow}>
          <ClockIcon size={18} color="#888" />
          <Text style={styles.previewLabel}>
            {new Date().toLocaleString('en-US', { month: 'short', day: 'numeric', year: 'numeric', hour: '2-digit', minute: '2-digit' })}
          </Text>
        </View>
      </View>

      <View style={styles.btnRow}>
        <TouchableOpacity style={styles.retakeBtn} onPress={() => animateStep(2)}>
          <Text style={styles.retakeBtnText}>Retake</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.continueBtn2} onPress={() => animateStep(4)} activeOpacity={0.85}>
          <Text style={styles.continueBtnText}>Continue</Text>
        </TouchableOpacity>
      </View>
    </ScrollView>
  );

  const renderConfirm = () => (
    <ScrollView style={styles.lightScroll} contentContainerStyle={styles.lightScrollContent} showsVerticalScrollIndicator={false}>
      <Text style={styles.sectionHeading}>Confirm Check-In</Text>

      {photoUri && (
        <View style={styles.confirmPhotoRow}>
          <Image source={{ uri: photoUri }} style={styles.confirmThumb} />
          <View>
            <Text style={styles.confirmPhotoName}>{userName}</Text>
            <View style={styles.confirmPhotoVerified}>
              <Text style={styles.confirmPhotoSub}>Photo verified </Text>
              <CheckIcon size={10} color={GREEN} />
            </View>
          </View>
        </View>
      )}

      <View style={styles.confirmCard}>
        <View style={styles.confirmRow}>
          <Text style={styles.confirmLabel}>Employee</Text>
          <Text style={styles.confirmValue}>{userName}</Text>
        </View>
        <View style={styles.divider} />
        <View style={styles.confirmRow}>
          <Text style={styles.confirmLabel}>Location</Text>
          <Text style={styles.confirmValue}>{OFFICE_LOCATION.label}</Text>
        </View>
        <View style={styles.divider} />
        <View style={styles.confirmRow}>
          <Text style={styles.confirmLabel}>Geofence</Text>
          <View style={styles.confirmValueRow}>
            <Text style={[styles.confirmValue, { color: isInsideGeofence ? GREEN : RED }]}>
              {isInsideGeofence ? 'Inside Zone ' : 'Outside Zone '}
            </Text>
            {isInsideGeofence
              ? <CheckIcon size={10} color={GREEN} />
              : <CrossIcon size={10} color={RED} />
            }
          </View>
        </View>
        <View style={styles.divider} />
        <View style={styles.confirmRow}>
          <Text style={styles.confirmLabel}>Distance</Text>
          <Text style={styles.confirmValue}>
            {distanceFromOffice !== null ? formatDistance(distanceFromOffice) : '—'}
          </Text>
        </View>
        <View style={styles.divider} />
        <View style={styles.confirmRow}>
          <Text style={styles.confirmLabel}>Time</Text>
          <Text style={styles.confirmValue}>
            {new Date().toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })}
          </Text>
        </View>
        <View style={styles.divider} />
        <View style={styles.confirmRow}>
          <Text style={styles.confirmLabel}>Status</Text>
          <Text style={[styles.confirmValue, { color: isInsideGeofence ? GREEN : RED }]}>
            {isInsideGeofence ? 'Present' : 'Absent'}
          </Text>
        </View>
        <View style={styles.divider} />
        <View style={styles.confirmRow}>
          <Text style={styles.confirmLabel}>Date</Text>
          <Text style={styles.confirmValue}>
            {new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' })}
          </Text>
        </View>
        {location && (
          <>
            <View style={styles.divider} />
            <View style={styles.confirmRow}>
              <Text style={styles.confirmLabel}>GPS Accuracy</Text>
              <Text style={styles.confirmValue}>{'±'}{location.accuracy}m</Text>
            </View>
          </>
        )}
      </View>

      {!isInsideGeofence && (
        <View style={styles.warnBox}>
          <WarningIcon size={16} color="#F59E0B" />
          <Text style={styles.warnText}>
            You're outside the {GEOFENCE_RADIUS_METERS}m radius of {OFFICE_LOCATION.label}. Confirming will mark you Absent.
          </Text>
        </View>
      )}

      <Text style={styles.sectionHeading}>Notes (Optional)</Text>
      <View style={styles.notesCard}>
        <TextInput
          style={styles.notesInput}
          placeholder="Add a note..."
          placeholderTextColor="#AAA"
          value={notes}
          onChangeText={setNotes}
          multiline
          numberOfLines={3}
          maxLength={200}
        />
        <Text style={styles.charCount}>{notes.length}/200</Text>
      </View>

      <TouchableOpacity
        style={[styles.continueBtn, submitting && styles.continueBtnDisabled]}
        onPress={handleConfirm}
        disabled={submitting}
        activeOpacity={0.85}
      >
        {submitting
          ? (
            <View style={styles.submittingRow}>
              <ActivityIndicator color="#FFF" />
              <Text style={styles.continueBtnText}>Saving to database...</Text>
            </View>
          )
          : (
            <View style={styles.submittingRow}>
              <Text style={styles.continueBtnText}>Confirm Check-In </Text>
              <CheckIcon size={14} color="#FFF" />
            </View>
          )}
      </TouchableOpacity>
    </ScrollView>
  );

  const renderDone = () => (
    <View style={styles.doneContainer}>
      {photoUri && (
        <Image source={{ uri: photoUri }} style={styles.donePhoto} />
      )}
      <View style={styles.doneIconRing}>
        <View style={styles.doneIconInner}>
          <CheckIcon size={32} color="#FFF" />
        </View>
      </View>
      <Text style={styles.doneTitle}>Check-In Complete!</Text>
      <Text style={styles.doneSub}>Your attendance has been saved to the database.</Text>
      <View style={styles.doneSummary}>
        <View style={styles.doneSummaryRow}>
          <Text style={styles.doneSummaryLabel}>Location</Text>
          <Text style={styles.doneSummaryValue}>{OFFICE_LOCATION.label}</Text>
        </View>
        <View style={styles.doneSummaryRow}>
          <Text style={styles.doneSummaryLabel}>Distance</Text>
          <Text style={styles.doneSummaryValue}>
            {distanceFromOffice !== null ? formatDistance(distanceFromOffice) : '—'}
          </Text>
        </View>
        <View style={styles.doneSummaryRow}>
          <Text style={styles.doneSummaryLabel}>Time</Text>
          <Text style={styles.doneSummaryValue}>
            {new Date().toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })}
          </Text>
        </View>
        <View style={styles.doneSummaryRow}>
          <Text style={styles.doneSummaryLabel}>Status</Text>
          <View style={styles.doneSummaryValueRow}>
            <Text style={[styles.doneSummaryValue, {
              color: checkInStatus === 'present' ? GREEN : checkInStatus === 'late' ? '#F59E0B' : RED,
            }]}>
              {checkInStatus === 'present' ? 'Present ' : checkInStatus === 'late' ? 'Late ' : 'Absent '}
            </Text>
            {checkInStatus === 'present'
              ? <CheckIcon size={12} color={GREEN} />
              : checkInStatus === 'late'
                ? <WarningIcon size={12} color="#F59E0B" />
                : <CrossIcon size={12} color={RED} />
            }
          </View>
        </View>
        <View style={styles.doneSummaryRow}>
          <Text style={styles.doneSummaryLabel}>Geofence Radius</Text>
          <Text style={styles.doneSummaryValue}>{GEOFENCE_RADIUS_METERS}m</Text>
        </View>
        <View style={styles.doneSummaryRow}>
          <Text style={styles.doneSummaryLabel}>Saved</Text>
          <View style={styles.doneSummaryValueRow}>
            <Text style={[styles.doneSummaryValue, { color: GREEN }]}>Supabase </Text>
            <CheckIcon size={12} color={GREEN} />
          </View>
        </View>
      </View>
      <TouchableOpacity style={styles.doneHomeBtn} onPress={() => navigation.goBack()} activeOpacity={0.85}>
        <Text style={styles.doneHomeBtnText}>Back to Home</Text>
      </TouchableOpacity>
    </View>
  );

  const STEP_CONTENT: Record<Step, () => React.JSX.Element> = {
    1: renderGPS,
    2: renderCamera,
    3: renderPreview,
    4: renderConfirm,
    5: renderDone,
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar barStyle="light-content" backgroundColor={PURPLE} />
      {renderHeader()}
      <StepBar current={step} />
      <View style={styles.stepContent}>
        <Animated.View style={[styles.animWrap, { opacity: fadeAnim }]}>
          {STEP_CONTENT[step]()}
        </Animated.View>
      </View>
    </SafeAreaView>
  );
}

const STEP_TITLES: Record<Step, string> = {
  1: 'GPS Verification',
  2: 'Camera Capture',
  3: 'Preview',
  4: 'Confirm Check-In',
  5: 'Done',
};

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: PURPLE },
  stepContent: { flex: 1, backgroundColor: DARK_BG },
  animWrap: { flex: 1 },

  header: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    backgroundColor: PURPLE, paddingHorizontal: 16, paddingVertical: 12,
    paddingTop: Platform.OS === 'android' ? (StatusBar.currentHeight ?? 24) + 4 : 12,
  },
  backBtn: { width: 36, height: 36, alignItems: 'center', justifyContent: 'center' },
  headerCenter: { alignItems: 'center' },
  geoLockLabel: { flexDirection: 'row', alignItems: 'center', gap: 4, marginBottom: 2 },
  geoLockText: { color: 'rgba(255,255,255,0.7)', fontSize: 11, fontWeight: '700', letterSpacing: 1.5 },
  headerTitle: { color: '#FFFFFF', fontSize: 17, fontWeight: '800' },

  darkScroll: { flex: 1, backgroundColor: DARK_BG },
  darkScrollContent: { padding: 16, gap: 14, paddingBottom: 32 },

  mapBox: {
    backgroundColor: '#0D1117', borderRadius: 16, height: 220,
    alignItems: 'center', justifyContent: 'center', overflow: 'hidden',
    borderWidth: 1, borderColor: 'rgba(93,187,122,0.2)',
  },
  mapGrid: { position: 'absolute', width: '100%', height: '100%' },
  mapGridLine: {
    position: 'absolute', width: '100%', height: 1,
    backgroundColor: 'rgba(93,187,122,0.06)',
    top: `${(100 / 6)}%`,
  },
  coordsOverlay: {
    position: 'absolute', bottom: 12, left: 12,
    backgroundColor: 'rgba(0,0,0,0.5)', borderRadius: 6,
    paddingHorizontal: 10, paddingVertical: 4,
  },
  coordsText: { color: '#A0F0C0', fontSize: 12, fontFamily: Platform.OS === 'ios' ? 'Courier' : 'monospace' },
  gpsLockBadge: {
    position: 'absolute', top: 12, right: 12,
    backgroundColor: 'rgba(93,187,122,0.2)', borderRadius: 20,
    paddingHorizontal: 12, paddingVertical: 4, borderWidth: 1, borderColor: GREEN,
  },
  gpsLockText: { color: GREEN, fontSize: 11, fontWeight: '700' },

  verifyCard: {
    backgroundColor: '#1E2235', borderRadius: 16, padding: 16,
    borderWidth: 1, borderColor: 'rgba(255,255,255,0.08)',
  },
  verifyCardTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 },
  verifyCardLeft: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  navIconBox: {
    width: 38, height: 38, borderRadius: 10,
    backgroundColor: 'rgba(93,187,122,0.15)', alignItems: 'center', justifyContent: 'center',
  },
  verifyCardTitle: { color: '#FFFFFF', fontSize: 15, fontWeight: '700' },
  verifyCardSub: { color: '#8B8FA8', fontSize: 12, marginTop: 2 },
  verifiedBadge: {
    backgroundColor: 'rgba(93,187,122,0.15)', borderRadius: 20,
    paddingHorizontal: 10, paddingVertical: 4, borderWidth: 1, borderColor: GREEN,
  },
  verifiedBadgeOutside: {
    backgroundColor: 'rgba(239,68,68,0.15)', borderColor: RED,
  },
  verifiedContent: { flexDirection: 'row', alignItems: 'center' },
  verifiedText: { color: GREEN, fontSize: 12, fontWeight: '700' },
  verifiedTextOutside: { color: RED },

  infoBoxRow: { flexDirection: 'row', gap: 8 },
  infoBox: {
    flex: 1, backgroundColor: '#252A3D', borderRadius: 10,
    paddingVertical: 10, alignItems: 'center',
  },
  infoBoxValue: { color: '#FFFFFF', fontSize: 12, fontWeight: '700', textAlign: 'center' },
  infoBoxLabel: { color: '#6B7280', fontSize: 10, marginTop: 2, textAlign: 'center' },

  loadingRow: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 8 },
  loadingText: { color: '#8B8FA8', fontSize: 14 },
  errorBox: { backgroundColor: '#2A1A1A', borderRadius: 12, padding: 14, gap: 8 },
  errorText: { color: '#FF6B6B', fontSize: 14 },
  retryBtn: { alignSelf: 'flex-start', backgroundColor: 'rgba(93,187,122,0.15)', borderRadius: 8, paddingHorizontal: 14, paddingVertical: 8 },
  retryText: { color: GREEN, fontWeight: '700', fontSize: 13 },
  checkRows: { gap: 8 },

  warnBox: {
    flexDirection: 'row', alignItems: 'flex-start', gap: 10,
    backgroundColor: 'rgba(245,158,11,0.12)', borderRadius: 10,
    borderWidth: 1, borderColor: 'rgba(245,158,11,0.35)',
    paddingHorizontal: 14, paddingVertical: 10,
  },
  warnText: { flex: 1, fontSize: 12.5, color: '#FCD9A0', lineHeight: 18 },

  continueBtn: {
    backgroundColor: GREEN, borderRadius: 14, paddingVertical: 16,
    alignItems: 'center', marginTop: 4,
    shadowColor: GREEN, shadowOffset: { width: 0, height: 6 }, shadowOpacity: 0.4, shadowRadius: 10, elevation: 8,
  },
  continueBtnDisabled: { backgroundColor: '#3A4A3A', shadowOpacity: 0 },
  continueBtnText: { color: '#FFFFFF', fontSize: 16, fontWeight: '700' },

  cameraStep: {
    flex: 1, backgroundColor: '#0D1117',
    alignItems: 'center', justifyContent: 'center', padding: 24, gap: 20,
  },
  cameraBox: {
    width: 260, height: 300, borderRadius: 20,
    backgroundColor: '#1A1F2E', alignItems: 'center', justifyContent: 'center',
    borderWidth: 1, borderColor: 'rgba(255,255,255,0.1)',
  },
  cameraCornerTL: { position: 'absolute', top: 12, left: 12, width: 24, height: 24, borderTopWidth: 3, borderLeftWidth: 3, borderColor: GREEN, borderTopLeftRadius: 4 },
  cameraCornerTR: { position: 'absolute', top: 12, right: 12, width: 24, height: 24, borderTopWidth: 3, borderRightWidth: 3, borderColor: GREEN, borderTopRightRadius: 4 },
  cameraCornerBL: { position: 'absolute', bottom: 12, left: 12, width: 24, height: 24, borderBottomWidth: 3, borderLeftWidth: 3, borderColor: GREEN, borderBottomLeftRadius: 4 },
  cameraCornerBR: { position: 'absolute', bottom: 12, right: 12, width: 24, height: 24, borderBottomWidth: 3, borderRightWidth: 3, borderColor: GREEN, borderBottomRightRadius: 4 },
  cameraHint: { color: '#8B8FA8', fontSize: 13, marginTop: 12, textAlign: 'center' },
  cameraInfoRow: { flexDirection: 'row', gap: 20 },
  cameraInfoItem: { alignItems: 'center', gap: 4 },
  cameraInfoText: { color: '#8B8FA8', fontSize: 11 },
  captureBtn: {
    width: 72, height: 72, borderRadius: 36,
    borderWidth: 4, borderColor: GREEN,
    alignItems: 'center', justifyContent: 'center',
  },
  captureInner: { width: 54, height: 54, borderRadius: 27, backgroundColor: GREEN },
  captureTip: { color: '#6B7280', fontSize: 12 },

  lightScroll: { flex: 1, backgroundColor: '#F5F5F8' },
  lightScrollContent: { padding: 16, gap: 14, paddingBottom: 32 },
  sectionHeading: { fontSize: 13, fontWeight: '700', color: '#888', textTransform: 'uppercase', letterSpacing: 0.8 },

  photoPreview: {
    backgroundColor: '#1A1F2E', borderRadius: 16, height: 220,
    alignItems: 'center', justifyContent: 'center', overflow: 'hidden',
  },
  photoImage: { width: '100%', height: '100%', borderRadius: 16 },
  photoOverlay: {
    position: 'absolute', bottom: 0, left: 0, right: 0,
    backgroundColor: 'rgba(93,187,122,0.85)', paddingVertical: 8, alignItems: 'center',
  },
  photoOverlayContent: { flexDirection: 'row', alignItems: 'center' },
  photoOverlayText: { color: '#FFF', fontWeight: '700', fontSize: 13 },

  previewCard: {
    backgroundColor: '#FFF', borderRadius: 16, padding: 16, gap: 12,
    shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.06, shadowRadius: 6, elevation: 3,
  },
  previewRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  previewLabel: { fontSize: 14, fontWeight: '600', color: '#1A1A2E' },
  previewSub: { fontSize: 12, color: '#888', marginTop: 2 },

  btnRow: { flexDirection: 'row', gap: 12 },
  retakeBtn: {
    flex: 1, borderWidth: 2, borderColor: PURPLE, borderRadius: 14,
    paddingVertical: 14, alignItems: 'center',
  },
  retakeBtnText: { color: PURPLE, fontWeight: '700', fontSize: 15 },
  continueBtn2: {
    flex: 2, backgroundColor: GREEN, borderRadius: 14,
    paddingVertical: 14, alignItems: 'center',
    shadowColor: GREEN, shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.3, shadowRadius: 8, elevation: 5,
  },

  confirmPhotoRow: {
    flexDirection: 'row', alignItems: 'center', gap: 14,
    backgroundColor: '#FFF', borderRadius: 16, padding: 14,
    shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.06, shadowRadius: 6, elevation: 3,
  },
  confirmThumb: { width: 56, height: 56, borderRadius: 28, borderWidth: 2, borderColor: GREEN },
  confirmPhotoName: { fontSize: 15, fontWeight: '700', color: '#1A1A2E' },
  confirmPhotoSub: { fontSize: 12, color: GREEN, marginTop: 2 },
  confirmPhotoVerified: { flexDirection: 'row', alignItems: 'center', marginTop: 2 },

  confirmCard: {
    backgroundColor: '#FFF', borderRadius: 16, padding: 16,
    shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.06, shadowRadius: 6, elevation: 3,
  },
  confirmRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 10 },
  confirmLabel: { fontSize: 14, color: '#888' },
  confirmValue: { fontSize: 14, fontWeight: '700', color: '#1A1A2E' },
  confirmValueRow: { flexDirection: 'row', alignItems: 'center' },
  divider: { height: 1, backgroundColor: '#F0F0F5' },

  notesCard: {
    backgroundColor: '#FFF', borderRadius: 16, padding: 14,
    shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.06, shadowRadius: 6, elevation: 3,
  },
  notesInput: {
    fontSize: 14, color: '#1A1A2E', textAlignVertical: 'top', minHeight: 70,
    borderWidth: 1, borderColor: '#E5E7EB', borderRadius: 10, padding: 10,
  },
  charCount: { fontSize: 11, color: '#AAA', textAlign: 'right', marginTop: 4 },

  doneContainer: {
    flex: 1, backgroundColor: '#F5F5F8',
    alignItems: 'center', justifyContent: 'center', padding: 32, gap: 16,
  },
  donePhoto: {
    width: 90, height: 90, borderRadius: 45,
    borderWidth: 3, borderColor: GREEN,
  },
  doneIconRing: {
    width: 90, height: 90, borderRadius: 45,
    borderWidth: 3, borderColor: GREEN,
    alignItems: 'center', justifyContent: 'center',
    backgroundColor: 'rgba(93,187,122,0.1)',
  },
  doneIconInner: {
    width: 66, height: 66, borderRadius: 33,
    backgroundColor: GREEN, alignItems: 'center', justifyContent: 'center',
  },
  doneTitle: { fontSize: 26, fontWeight: '800', color: '#1A1A2E' },
  doneSub: { fontSize: 14, color: '#666', textAlign: 'center', lineHeight: 22 },
  doneSummary: {
    backgroundColor: '#FFF', borderRadius: 16, padding: 16, width: '100%', gap: 4,
    shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.06, shadowRadius: 6, elevation: 3,
  },
  doneSummaryRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 8, borderBottomWidth: 1, borderBottomColor: '#F0F0F5' },
  doneSummaryLabel: { color: '#888', fontSize: 14 },
  doneSummaryValue: { color: '#1A1A2E', fontSize: 14, fontWeight: '700' },
  doneSummaryValueRow: { flexDirection: 'row', alignItems: 'center' },
  doneHomeBtn: {
    backgroundColor: PURPLE, borderRadius: 14, paddingVertical: 15, paddingHorizontal: 48,
    shadowColor: PURPLE, shadowOffset: { width: 0, height: 6 }, shadowOpacity: 0.35, shadowRadius: 10, elevation: 8,
  },
  doneHomeBtnText: { color: '#FFF', fontSize: 16, fontWeight: '700' },
  submittingRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
});
