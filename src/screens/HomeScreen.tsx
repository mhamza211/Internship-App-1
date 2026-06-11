import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  StatusBar,
  SafeAreaView,
  Platform,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import type { RootStackParamList } from '../types/navigation';

type NavigationProp = NativeStackNavigationProp<RootStackParamList, 'Home'>;

type AttendanceRecord = {
  id: string;
  date: string;
  timeRange: string;
  status: 'Present' | 'Absent' | 'Leave';
};

const ATTENDANCE_HISTORY: AttendanceRecord[] = [
  { id: '1', date: 'June 8, 2026', timeRange: '09:00 AM - 05:30 PM', status: 'Present' },
  { id: '2', date: 'June 7, 2026', timeRange: '08:55 AM - 05:45 PM', status: 'Present' },
  { id: '3', date: 'June 6, 2026', timeRange: '09:10 AM - 05:20 PM', status: 'Present' },
  { id: '4', date: 'June 5, 2026', timeRange: '09:00 AM - 05:30 PM', status: 'Present' },
  { id: '5', date: 'June 4, 2026', timeRange: '-- : --', status: 'Absent' },
];

function getGreeting(): string {
  const hour = new Date().getHours();
  if (hour < 12) return 'Good Morning';
  if (hour < 17) return 'Good Afternoon';
  return 'Good Evening';
}

export default function HomeScreen() {
  const navigation = useNavigation<NavigationProp>();
  const [activeTab, setActiveTab] = useState<'Home' | 'Attendance' | 'Profile'>('Home');
  const isCheckedIn = false;

  const renderAttendanceRow = (item: AttendanceRecord) => {
    const isPresent = item.status === 'Present';
    return (
      <View key={item.id} style={styles.attendanceRow}>
        <View style={styles.attendanceLeft}>
          <View style={[styles.statusCircle, isPresent ? styles.circlePresent : styles.circleAbsent]}>
            <Text style={styles.circleIcon}>{isPresent ? '✓' : '✕'}</Text>
          </View>
          <View style={styles.attendanceInfo}>
            <Text style={styles.attendanceDate}>{item.date}</Text>
            <Text style={styles.attendanceTime}>{item.timeRange}</Text>
          </View>
        </View>
        {isPresent ? (
          <View style={styles.presentBadge}>
            <Text style={styles.presentBadgeText}>Present</Text>
          </View>
        ) : (
          <Text style={styles.absentText}>Absent</Text>
        )}
      </View>
    );
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar barStyle="light-content" backgroundColor="#3D2C8D" />

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* ── Header ── */}
        <View style={styles.header}>
          <View style={styles.headerTop}>
            <View>
              <Text style={styles.greeting}>{getGreeting()}</Text>
              <Text style={styles.userName}>Muhammad Hamza</Text>
            </View>
            <View style={styles.avatarCircle}>
              <Text style={styles.avatarIcon}>👤</Text>
            </View>
          </View>

          {/* Today's Status */}
          <View style={styles.statusBox}>
            <View>
              <Text style={styles.statusBoxLabel}>Today's Status</Text>
              <Text style={styles.statusBoxValue}>
                {isCheckedIn ? 'Checked In' : 'Not Checked In'}
              </Text>
            </View>
            <Text style={styles.clockIcon}>🕐</Text>
          </View>
        </View>

        <View style={styles.body}>

          {/* ── Check In Now Button ── */}
          <TouchableOpacity
            style={styles.checkInButton}
            onPress={() => navigation.navigate('CheckIn')}
            activeOpacity={0.85}
          >
            <Text style={styles.checkInArrow}>→</Text>
            <Text style={styles.checkInText}>Check In Now</Text>
          </TouchableOpacity>

          {/* ── Location Status ── */}
          <View style={styles.card}>
            <View style={styles.cardHeader}>
              <View style={styles.cardTitleRow}>
                <Text style={styles.locationPin}>📍</Text>
                <Text style={styles.cardTitle}>Location Status</Text>
              </View>
              <View style={styles.verifiedBadge}>
                <Text style={styles.verifiedText}>Verified</Text>
              </View>
            </View>
            <Text style={styles.locationName}>Main Office, Islamabad</Text>
            <Text style={styles.locationAddress}>123 Market Street</Text>
          </View>

          {/* ── This Month ── */}
          <View style={styles.card}>
            <View style={styles.cardTitleRow}>
              <Text style={styles.calendarIcon}>📅</Text>
              <Text style={styles.cardTitle}>This Month</Text>
            </View>
            <View style={styles.statsRow}>
              <View style={styles.statItem}>
                <View style={[styles.statCircle, styles.circleGreen]}>
                  <Text style={styles.statNumber}>18</Text>
                </View>
                <Text style={styles.statLabel}>Present</Text>
              </View>
              <View style={styles.statItem}>
                <View style={[styles.statCircle, styles.circleGray]}>
                  <Text style={[styles.statNumber, styles.statNumberDark]}>2</Text>
                </View>
                <Text style={styles.statLabel}>Absent</Text>
              </View>
              <View style={styles.statItem}>
                <View style={[styles.statCircle, styles.circleLeave]}>
                  <Text style={[styles.statNumber, styles.statNumberDark]}>1</Text>
                </View>
                <Text style={styles.statLabel}>Leave</Text>
              </View>
            </View>
          </View>

          {/* ── Recent Attendance ── */}
          <View style={styles.card}>
            <Text style={styles.cardTitle}>Recent Attendance</Text>
            <View style={styles.attendanceList}>
              {ATTENDANCE_HISTORY.map(renderAttendanceRow)}
            </View>
          </View>

        </View>
      </ScrollView>

      {/* ── Bottom Tab Bar ── */}
      <View style={styles.tabBar}>
        <TouchableOpacity
          style={styles.tabItem}
          onPress={() => setActiveTab('Home')}
        >
          <Text style={styles.tabIcon}>🏠</Text>
          <Text style={[styles.tabLabel, activeTab === 'Home' && styles.tabLabelActive]}>
            Home
          </Text>
          {activeTab === 'Home' && <View style={styles.tabActiveIndicator} />}
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.tabItem}
          onPress={() => setActiveTab('Attendance')}
        >
          <Text style={styles.tabIcon}>🕐</Text>
          <Text style={[styles.tabLabel, activeTab === 'Attendance' && styles.tabLabelActive]}>
            Attendance
          </Text>
          {activeTab === 'Attendance' && <View style={styles.tabActiveIndicator} />}
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.tabItem}
          onPress={() => setActiveTab('Profile')}
        >
          <Text style={styles.tabIcon}>👤</Text>
          <Text style={[styles.tabLabel, activeTab === 'Profile' && styles.tabLabelActive]}>
            Profile
          </Text>
          {activeTab === 'Profile' && <View style={styles.tabActiveIndicator} />}
        </TouchableOpacity>
      </View>

    </SafeAreaView>
  );
}

const PURPLE = '#3D2C8D';
const GREEN = '#5DBB7A';

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: PURPLE },
  scrollView: { flex: 1 },
  scrollContent: { paddingBottom: 24 },

  // Header
  header: {
    backgroundColor: PURPLE,
    paddingHorizontal: 20,
    paddingTop: Platform.OS === 'android' ? (StatusBar.currentHeight ?? 32) + 10 : 16,
    paddingBottom: 24,
    borderBottomLeftRadius: 24,
    borderBottomRightRadius: 24,
  },
  headerTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  greeting: { color: '#C8C0F0', fontSize: 14 },
  userName: { color: '#FFFFFF', fontSize: 22, fontWeight: '800', marginTop: 2 },
  avatarCircle: {
    width: 42, height: 42, borderRadius: 21,
    backgroundColor: 'rgba(255,255,255,0.2)',
    alignItems: 'center', justifyContent: 'center',
  },
  avatarIcon: { fontSize: 20 },

  // Status box inside header
  statusBox: {
    backgroundColor: 'rgba(255,255,255,0.15)',
    borderRadius: 14,
    paddingHorizontal: 16,
    paddingVertical: 12,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  statusBoxLabel: { color: '#C8C0F0', fontSize: 12, marginBottom: 4 },
  statusBoxValue: { color: '#FFFFFF', fontSize: 17, fontWeight: '700' },
  clockIcon: { fontSize: 22 },

  // Body
  body: { backgroundColor: '#F5F5F8', paddingHorizontal: 16, paddingTop: 20, gap: 14 },

  // Check In Button
  checkInButton: {
    backgroundColor: GREEN,
    borderRadius: 14,
    paddingVertical: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    shadowColor: GREEN,
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.35,
    shadowRadius: 10,
    elevation: 6,
  },
  checkInArrow: { color: '#FFFFFF', fontSize: 18, fontWeight: '700' },
  checkInText: { color: '#FFFFFF', fontSize: 17, fontWeight: '700' },

  // Cards
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 6,
    elevation: 3,
  },
  cardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 },
  cardTitleRow: { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 10 },
  cardTitle: { fontSize: 16, fontWeight: '700', color: '#1A1A2E' },
  locationPin: { fontSize: 16 },
  calendarIcon: { fontSize: 16 },
  verifiedBadge: {
    backgroundColor: '#E8F5E9', borderRadius: 20,
    paddingHorizontal: 10, paddingVertical: 3,
  },
  verifiedText: { color: '#388E3C', fontSize: 12, fontWeight: '600' },
  locationName: { color: GREEN, fontSize: 14, fontWeight: '600', marginBottom: 2 },
  locationAddress: { color: GREEN, fontSize: 12 },

  // This Month Stats
  statsRow: { flexDirection: 'row', justifyContent: 'space-around', marginTop: 8 },
  statItem: { alignItems: 'center', gap: 8 },
  statCircle: {
    width: 60, height: 60, borderRadius: 30,
    alignItems: 'center', justifyContent: 'center',
  },
  circleGreen: { backgroundColor: GREEN },
  circleGray: { backgroundColor: '#EEEEF3' },
  circleLeave: { backgroundColor: '#D8ECC0' },
  statNumber: { fontSize: 20, fontWeight: '800', color: '#FFFFFF' },
  statNumberDark: { color: '#4A4A6A' },
  statLabel: { fontSize: 13, color: '#888', fontWeight: '500' },

  // Attendance List
  attendanceList: { marginTop: 10, gap: 14 },
  attendanceRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingBottom: 14,
    borderBottomWidth: 1,
    borderBottomColor: '#F0F0F5',
  },
  attendanceLeft: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  statusCircle: {
    width: 32, height: 32, borderRadius: 16,
    alignItems: 'center', justifyContent: 'center',
  },
  circlePresent: { backgroundColor: '#E8F5E9', borderWidth: 2, borderColor: GREEN },
  circleAbsent: { backgroundColor: '#FFEBEE', borderWidth: 2, borderColor: '#E53935' },
  circleIcon: { fontSize: 14, fontWeight: '700', color: '#388E3C' },
  attendanceInfo: { gap: 2 },
  attendanceDate: { fontSize: 14, fontWeight: '600', color: '#1A1A2E' },
  attendanceTime: { fontSize: 12, color: '#888' },
  presentBadge: {
    backgroundColor: '#E8F5E9',
    paddingHorizontal: 12, paddingVertical: 4,
    borderRadius: 20,
  },
  presentBadgeText: { color: '#388E3C', fontSize: 12, fontWeight: '700' },
  absentText: { color: '#888', fontSize: 13, fontWeight: '500' },

  // Tab Bar
  tabBar: {
    flexDirection: 'row',
    backgroundColor: '#FFFFFF',
    borderTopWidth: 1,
    borderTopColor: '#EFEFEF',
    paddingBottom: 8,
    paddingTop: 10,
  },
  tabItem: { flex: 1, alignItems: 'center', gap: 3 },
  tabIcon: { fontSize: 20 },
  tabLabel: { fontSize: 12, color: '#888' },
  tabLabelActive: { color: PURPLE, fontWeight: '700' },
  tabActiveIndicator: {
    position: 'absolute', bottom: -10, width: 20, height: 3,
    backgroundColor: PURPLE, borderRadius: 2,
  },
});
