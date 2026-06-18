import React, { useState, useEffect } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity,
  ScrollView, StatusBar, SafeAreaView, Platform,
  ActivityIndicator,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import type { RootStackParamList } from '../types/navigation';
import { hasCheckedInToday, fetchMyAttendance } from '../lib/attendance';  // ← NEW
import { AttendanceRecord } from '../types/attendance';                     // ← NEW

type NavigationProp = NativeStackNavigationProp<RootStackParamList, 'Home'>;

function getGreeting(): string {
  const h = new Date().getHours();
  if (h < 12) return 'Good Morning';
  if (h < 17) return 'Good Afternoon';
  return 'Good Evening';
}

export default function HomeScreen() {
  const navigation = useNavigation<NavigationProp>();
  const [activeTab, setActiveTab] = useState<'Home' | 'Attendance' | 'History' | 'Settings'>('Home');

  // ── Supabase state ────────────────────────────────────────
  const [checkedInToday, setCheckedInToday] = useState(false);
  const [recentRecords, setRecentRecords] = useState<AttendanceRecord[]>([]);
  const [loadingStatus, setLoadingStatus] = useState(true);
  const [monthStats, setMonthStats] = useState({ present: 0, absent: 0, leave: 0 });

  // ── Load attendance data from Supabase ───────────────────
  useEffect(() => {
    loadAttendanceData();
  }, []);

  // Reload when user comes back from CheckIn screen
  useEffect(() => {
    const unsubscribe = navigation.addListener('focus', () => {
      loadAttendanceData();
    });
    return unsubscribe;
  }, [navigation]);

  const loadAttendanceData = async () => {
    setLoadingStatus(true);
    try {
      const [alreadyCheckedIn, recent] = await Promise.all([
        hasCheckedInToday(),
        fetchMyAttendance(10),
      ]);
      setCheckedInToday(alreadyCheckedIn);
      setRecentRecords(recent);

      // Calculate this month's stats from real data
      const now = new Date();
      const thisMonth = recent.filter(r => {
        const d = new Date(r.check_in_time);
        return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear();
      });
      const presentCount = thisMonth.filter(r => r.status === 'present').length;
      const lateCount = thisMonth.filter(r => r.status === 'late').length;
      setMonthStats({
        present: presentCount + lateCount,
        absent: 0,
        leave: 0,
      });
    } catch (e) {
      console.error('Failed to load attendance:', e);
    }
    setLoadingStatus(false);
  };

  // ── Render recent attendance rows ─────────────────────────
  const renderRow = (item: AttendanceRecord, index: number) => {
    const isPresent = item.status === 'present' || item.status === 'late';
    const isLast = index === recentRecords.length - 1;
    const date = new Date(item.check_in_time);
    const dateStr = date.toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' });
    const timeStr = date.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });

    return (
      <View
        key={item.id}
        style={[
          styles.attendanceRow,
          isLast ? { borderBottomWidth: 0 } : { borderBottomWidth: 1, borderBottomColor: '#F0F0F5' },
        ]}
      >
        <View style={styles.attendanceLeft}>
          <View style={[styles.statusCircle, isPresent ? styles.circlePresent : styles.circleAbsent]}>
            <Text style={[styles.circleIcon, !isPresent && styles.circleIconAbsent]}>
              {isPresent ? '✓' : '✕'}
            </Text>
          </View>
          <View style={styles.attendanceInfo}>
            <Text style={styles.attendanceDate}>{dateStr}</Text>
            <Text style={styles.attendanceTime}>{timeStr}</Text>
          </View>
        </View>
        {item.status === 'present' && (
          <View style={styles.presentBadge}><Text style={styles.presentBadgeText}>Present</Text></View>
        )}
        {item.status === 'late' && (
          <View style={styles.lateBadge}><Text style={styles.lateBadgeText}>Late</Text></View>
        )}
        {item.status === 'absent' && (
          <View style={styles.absentBadge}><Text style={styles.absentBadgeText}>Absent</Text></View>
        )}
      </View>
    );
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar barStyle="light-content" backgroundColor="#3D2C8D" />

      {/* ── FIXED HEADER ── */}
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

        {/* Today's status — now from Supabase */}
        <View style={styles.statusBox}>
          <View>
            <Text style={styles.statusBoxLabel}>Today's Status</Text>
            {loadingStatus ? (
              <ActivityIndicator color="#fff" size="small" style={{ marginTop: 4 }} />
            ) : (
              <Text style={styles.statusBoxValue}>
                {checkedInToday ? '✅ Checked In' : '⚠️ Not Checked In'}
              </Text>
            )}
          </View>
          <Text style={styles.clockIcon}>🕐</Text>
        </View>
      </View>

      {/* ── SCROLLABLE BODY ── */}
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Check In Button — changes color if already checked in */}
        <TouchableOpacity
          style={[styles.checkInButton, checkedInToday && styles.checkInButtonDone]}
          onPress={() => navigation.navigate('CheckIn')}
          activeOpacity={0.85}
          disabled={checkedInToday}
        >
          <Text style={styles.checkInArrow}>{checkedInToday ? '✓' : '→'}</Text>
          <Text style={styles.checkInText}>
            {checkedInToday ? 'Already Checked In Today' : 'Check In Now'}
          </Text>
        </TouchableOpacity>

        {/* Location Status */}
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

        {/* This Month — now from real Supabase data */}
        <View style={styles.card}>
          <View style={styles.cardTitleRow}>
            <Text style={styles.calendarIcon}>📅</Text>
            <Text style={styles.cardTitle}>This Month</Text>
          </View>
          {loadingStatus ? (
            <ActivityIndicator color={GREEN} style={{ marginVertical: 16 }} />
          ) : (
            <View style={styles.statsRow}>
              <View style={styles.statItem}>
                <View style={[styles.statCircle, styles.circleGreen]}>
                  <Text style={styles.statNumber}>{monthStats.present}</Text>
                </View>
                <Text style={styles.statLabel}>Present</Text>
              </View>
              <View style={styles.statItem}>
                <View style={[styles.statCircle, styles.circleGray]}>
                  <Text style={[styles.statNumber, styles.statNumberDark]}>{monthStats.absent}</Text>
                </View>
                <Text style={styles.statLabel}>Absent</Text>
              </View>
              <View style={styles.statItem}>
                <View style={[styles.statCircle, styles.circleLeave]}>
                  <Text style={[styles.statNumber, styles.statNumberDark]}>{monthStats.leave}</Text>
                </View>
                <Text style={styles.statLabel}>Leave</Text>
              </View>
            </View>
          )}
        </View>

        {/* Recent Attendance — now from real Supabase data */}
        <View style={styles.card}>
          <View style={styles.cardTitleRow}>
            <Text style={styles.cardTitle}>Recent Attendance</Text>
            {loadingStatus && <ActivityIndicator color={GREEN} size="small" style={{ marginLeft: 8 }} />}
          </View>

          {!loadingStatus && recentRecords.length === 0 ? (
            <View style={styles.emptyBox}>
              <Text style={styles.emptyText}>No attendance records yet.</Text>
              <Text style={styles.emptySubText}>Complete your first check-in!</Text>
            </View>
          ) : (
            <View style={styles.attendanceList}>
              {recentRecords.slice(0, 5).map((item, index) => renderRow(item, index))}
            </View>
          )}
        </View>

        <View style={{ height: 16 }} />
      </ScrollView>

      {/* ── FIXED BOTTOM TAB BAR ── */}
      <View style={styles.tabBar}>
        <TouchableOpacity style={styles.tabItem} onPress={() => setActiveTab('Home')}>
          <Text style={styles.tabIcon}>🏠</Text>
          <Text style={[styles.tabLabel, activeTab === 'Home' && styles.tabLabelActive]}>Home</Text>
          {activeTab === 'Home' && <View style={styles.tabActiveIndicator} />}
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.tabItem}
          onPress={() => { setActiveTab('Attendance'); navigation.navigate('Attendance'); }}
        >
          <Text style={styles.tabIcon}>🕐</Text>
          <Text style={[styles.tabLabel, activeTab === 'Attendance' && styles.tabLabelActive]}>Attendance</Text>
          {activeTab === 'Attendance' && <View style={styles.tabActiveIndicator} />}
        </TouchableOpacity>

        <TouchableOpacity style={styles.tabItem} onPress={() => setActiveTab('History')}>
          <Text style={styles.tabIcon}>🕒</Text>
          <Text style={[styles.tabLabel, activeTab === 'History' && styles.tabLabelActive]}>History</Text>
          {activeTab === 'History' && <View style={styles.tabActiveIndicator} />}
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.tabItem}
          onPress={() => { setActiveTab('Settings'); navigation.navigate('Settings'); }}
        >
          <Text style={styles.tabIcon}>⚙️</Text>
          <Text style={[styles.tabLabel, activeTab === 'Settings' && styles.tabLabelActive]}>Settings</Text>
          {activeTab === 'Settings' && <View style={styles.tabActiveIndicator} />}
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

const PURPLE = '#3D2C8D';
const GREEN  = '#5DBB7A';

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: '#F5F5F8' },

  // ── Header ────────────────────────────────────────────────
  header: {
    backgroundColor: PURPLE,
    paddingHorizontal: 20,
    paddingTop: Platform.OS === 'android' ? (StatusBar.currentHeight ?? 32) + 10 : 16,
    paddingBottom: 24,
    borderBottomLeftRadius: 24,
    borderBottomRightRadius: 24,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
    elevation: 8,
    zIndex: 10,
  },
  headerTop: {
    flexDirection: 'row', justifyContent: 'space-between',
    alignItems: 'center', marginBottom: 16,
  },
  greeting: { color: '#C8C0F0', fontSize: 14 },
  userName: { color: '#FFFFFF', fontSize: 22, fontWeight: '800', marginTop: 2 },
  avatarCircle: {
    width: 42, height: 42, borderRadius: 21,
    backgroundColor: 'rgba(255,255,255,0.2)',
    alignItems: 'center', justifyContent: 'center',
  },
  avatarIcon: { fontSize: 20 },
  statusBox: {
    backgroundColor: 'rgba(255,255,255,0.15)', borderRadius: 14,
    paddingHorizontal: 16, paddingVertical: 12,
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
  },
  statusBoxLabel: { color: '#C8C0F0', fontSize: 12, marginBottom: 4 },
  statusBoxValue: { color: '#FFFFFF', fontSize: 17, fontWeight: '700' },
  clockIcon: { fontSize: 22 },

  // ── Scroll ────────────────────────────────────────────────
  scrollView: { flex: 1 },
  scrollContent: { paddingHorizontal: 16, paddingTop: 20, paddingBottom: 24, gap: 14 },

  // Check In Button
  checkInButton: {
    backgroundColor: GREEN, borderRadius: 14, paddingVertical: 16,
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 10,
    shadowColor: GREEN, shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.35, shadowRadius: 10, elevation: 6,
  },
  checkInButtonDone: {
    backgroundColor: '#A5C8A5',
    shadowOpacity: 0,
    elevation: 0,
  },
  checkInArrow: { color: '#FFFFFF', fontSize: 18, fontWeight: '700' },
  checkInText:  { color: '#FFFFFF', fontSize: 17, fontWeight: '700' },

  // Cards
  card: {
    backgroundColor: '#FFFFFF', borderRadius: 16, padding: 16,
    shadowColor: '#000', shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06, shadowRadius: 6, elevation: 3,
  },
  cardHeader: {
    flexDirection: 'row', justifyContent: 'space-between',
    alignItems: 'center', marginBottom: 10,
  },
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

  // Stats
  statsRow: { flexDirection: 'row', justifyContent: 'space-around', marginTop: 8 },
  statItem: { alignItems: 'center', gap: 8 },
  statCircle: { width: 60, height: 60, borderRadius: 30, alignItems: 'center', justifyContent: 'center' },
  circleGreen: { backgroundColor: GREEN },
  circleGray:  { backgroundColor: '#EEEEF3' },
  circleLeave: { backgroundColor: '#D8ECC0' },
  statNumber:     { fontSize: 20, fontWeight: '800', color: '#FFFFFF' },
  statNumberDark: { color: '#4A4A6A' },
  statLabel: { fontSize: 13, color: '#888', fontWeight: '500' },

  // Empty state
  emptyBox: { alignItems: 'center', paddingVertical: 20 },
  emptyText: { fontSize: 14, fontWeight: '600', color: '#888' },
  emptySubText: { fontSize: 12, color: '#AAA', marginTop: 4 },

  // Attendance list
  attendanceList: { marginTop: 10 },
  attendanceRow: {
    flexDirection: 'row', alignItems: 'center',
    justifyContent: 'space-between', paddingVertical: 12,
  },
  attendanceLeft: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  statusCircle: {
    width: 32, height: 32, borderRadius: 16,
    alignItems: 'center', justifyContent: 'center',
  },
  circlePresent: { backgroundColor: '#E8F5E9', borderWidth: 2, borderColor: GREEN },
  circleAbsent:  { backgroundColor: '#FFEBEE', borderWidth: 2, borderColor: '#E53935' },
  circleIcon:       { fontSize: 14, fontWeight: '700', color: '#388E3C' },
  circleIconAbsent: { color: '#E53935' },
  attendanceInfo: { gap: 2 },
  attendanceDate: { fontSize: 14, fontWeight: '600', color: '#1A1A2E' },
  attendanceTime: { fontSize: 12, color: '#888' },

  // Badges
  presentBadge: {
    backgroundColor: '#E8F5E9', paddingHorizontal: 12, paddingVertical: 4, borderRadius: 20,
  },
  presentBadgeText: { color: '#388E3C', fontSize: 12, fontWeight: '700' },
  lateBadge: {
    backgroundColor: '#FFF3E0', paddingHorizontal: 12, paddingVertical: 4, borderRadius: 20,
  },
  lateBadgeText: { color: '#FFA500', fontSize: 12, fontWeight: '700' },
  absentBadge: {
    backgroundColor: '#FFEBEE', paddingHorizontal: 12, paddingVertical: 4, borderRadius: 20,
  },
  absentBadgeText: { color: '#E53935', fontSize: 12, fontWeight: '700' },

  // Tab Bar
  tabBar: {
    flexDirection: 'row', backgroundColor: '#FFFFFF',
    borderTopWidth: 1, borderTopColor: '#EFEFEF',
    paddingBottom: Platform.OS === 'ios' ? 20 : 8,
    paddingTop: 10,
  },
  tabItem: { flex: 1, alignItems: 'center', gap: 3 },
  tabIcon: { fontSize: 20 },
  tabLabel: { fontSize: 11, color: '#888' },
  tabLabelActive: { color: PURPLE, fontWeight: '700' },
  tabActiveIndicator: {
    position: 'absolute', bottom: -10,
    width: 20, height: 3,
    backgroundColor: PURPLE, borderRadius: 2,
  },
});