import React, { useState, useEffect } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity,
  ScrollView, StatusBar, SafeAreaView, Platform,
  ActivityIndicator,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import type { RootStackParamList } from '../types/navigation';
import { hasCheckedInToday, fetchMyAttendance } from '../lib/attendance';
import { getMyProfile, getMyOrganization } from '../lib/organization';
import { AttendanceRecord } from '../types/attendance';
import { Organization } from '../types/organization';
import { supabase } from '../lib/supabase';
import {
  UserIcon, ClockIcon, CheckCircleIcon, WarningIcon,
  MapPinIcon, CalendarIcon, HomeIcon, SettingsIcon,
  CheckIcon, CrossIcon, ArrowRightIcon,
} from '../components/Icons';

type NavigationProp = NativeStackNavigationProp<RootStackParamList, 'Home'>;

const PURPLE = '#3D2C8D';
const GREEN  = '#5DBB7A';

function getGreeting(): string {
  const h = new Date().getHours();
  if (h < 12) return 'Good Morning';
  if (h < 17) return 'Good Afternoon';
  return 'Good Evening';
}

export default function HomeScreen() {
  const navigation = useNavigation<NavigationProp>();
  const [activeTab, setActiveTab] = useState<'Home' | 'Attendance' | 'History' | 'Settings'>('Home');
  const [userName, setUserName] = useState('');

  const [checkedInToday, setCheckedInToday] = useState(false);
  const [recentRecords, setRecentRecords] = useState<AttendanceRecord[]>([]);
  const [loadingStatus, setLoadingStatus] = useState(true);
  const [monthStats, setMonthStats] = useState({ present: 0, absent: 0, leave: 0 });

  // Multi-tenant: which org this user belongs to. If they don't
  // belong to one yet, they're bounced to OrgSetup before they can
  // use the rest of the app.
  const [organization, setOrganization] = useState<Organization | null>(null);
  const [checkingOrg, setCheckingOrg] = useState(true);

  useEffect(() => {
    const fetchUser = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        setUserName(user.user_metadata?.full_name || user.email || '');
      }
    };
    fetchUser();
  }, []);

  useEffect(() => {
    const checkOrg = async () => {
      setCheckingOrg(true);
      const profile = await getMyProfile();
      if (!profile || !profile.org_id) {
        navigation.replace('OrgSetup');
        return;
      }
      const org = await getMyOrganization();
      setOrganization(org);
      setCheckingOrg(false);
    };
    checkOrg();
  }, [navigation]);

  useEffect(() => {
    loadAttendanceData();
  }, []);

  useEffect(() => {
    const unsubscribe = navigation.addListener('focus', () => {
      loadAttendanceData();
    });
    return unsubscribe;
  }, [navigation]);

  const loadAttendanceData = async () => {
    setLoadingStatus(true);
    try {
      const now = new Date();
      const year = now.getFullYear();
      const month = now.getMonth();
      const todayDate = now.getDate();

      const [alreadyCheckedIn, recent] = await Promise.all([
        hasCheckedInToday(),
        fetchMyAttendance(60),
      ]);
      setCheckedInToday(alreadyCheckedIn);
      setRecentRecords(recent);

      // Build the month the SAME way the Attendance screen does, so the
      // numbers on both screens always match.
      const monthRecords = recent.filter(r => {
        const d = new Date(r.check_in_time);
        return d.getFullYear() === year && d.getMonth() === month;
      });

      const recordsByDay = new Map<number, AttendanceRecord>();
      monthRecords.forEach(r => {
        const day = new Date(r.check_in_time).getDate();
        if (!recordsByDay.has(day)) recordsByDay.set(day, r);
      });

      let presentCount = 0;
      let lateCount = 0;
      let absentCount = 0;

      for (let day = todayDate; day >= 1; day--) {
        const d = new Date(year, month, day);
        const dow = d.getDay();
        const isWorkday = dow !== 0 && dow !== 6;
        const record = recordsByDay.get(day);

        if (record) {
          if (record.status === 'present') presentCount++;
          else if (record.status === 'late') lateCount++;
          else if (record.status === 'absent') absentCount++;
        } else if (isWorkday && day < todayDate) {
          absentCount++;
        }
      }

      setMonthStats({
        present: presentCount + lateCount,
        absent: absentCount,
        leave: 0,
      });
    } catch (e) {
      console.error('Failed to load attendance:', e);
    }
    setLoadingStatus(false);
  };

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
          isLast ? styles.noBorderBottom : styles.rowBorderBottom,
        ]}
      >
        <View style={styles.attendanceLeft}>
          <View style={[styles.statusCircle, isPresent ? styles.circlePresent : styles.circleAbsent]}>
            {isPresent
              ? <CheckIcon size={14} color="#388E3C" />
              : <CrossIcon size={14} color="#E53935" />
            }
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

  // Still resolving which org this user is in (and possibly about to
  // redirect to OrgSetup) — avoid flashing stale Home content.
  if (checkingOrg) {
    return (
      <SafeAreaView style={[styles.safeArea, styles.centerFill]}>
        <ActivityIndicator color={PURPLE} size="large" />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar barStyle="light-content" backgroundColor="#3D2C8D" />

      <View style={styles.header}>
        <View style={styles.headerTop}>
          <View>
            <Text style={styles.greeting}>{getGreeting()}</Text>
            <Text style={styles.userName}>{userName}</Text>
            {organization && (
              <Text style={styles.orgBadge}>{organization.name}</Text>
            )}
          </View>
          <View style={styles.avatarCircle}>
            <UserIcon size={20} color="#FFFFFF" />
          </View>
        </View>

        <View style={styles.statusBox}>
          <View>
            <Text style={styles.statusBoxLabel}>Today's Status</Text>
            {loadingStatus ? (
              <ActivityIndicator color="#fff" size="small" style={styles.statusLoader} />
            ) : (
              <View style={styles.statusValueRow}>
                {checkedInToday
                  ? <><CheckCircleIcon size={18} color="#4CAF50" /><Text style={styles.statusBoxValue}> Checked In</Text></>
                  : <><WarningIcon size={18} color="#F59E0B" /><Text style={styles.statusBoxValue}> Not Checked In</Text></>
                }
              </View>
            )}
          </View>
          <ClockIcon size={22} color="#FFFFFF" />
        </View>
      </View>

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        <TouchableOpacity
          style={[styles.checkInButton, checkedInToday && styles.checkInButtonDone]}
          onPress={() => navigation.navigate('CheckIn')}
          activeOpacity={0.85}
          disabled={checkedInToday}
        >
          {checkedInToday
            ? <CheckIcon size={18} color="#FFFFFF" />
            : <ArrowRightIcon size={18} color="#FFFFFF" />
          }
          <Text style={styles.checkInText}>
            {checkedInToday ? 'Already Checked In Today' : 'Check In Now'}
          </Text>
        </TouchableOpacity>

        <View style={styles.card}>
          <View style={styles.cardHeader}>
            <View style={styles.cardTitleRow}>
              <MapPinIcon size={16} color="#E53935" />
              <Text style={styles.cardTitle}>Location Status</Text>
            </View>
            <View style={styles.verifiedBadge}>
              <Text style={styles.verifiedText}>{organization ? 'Verified' : '—'}</Text>
            </View>
          </View>
          <Text style={styles.locationName}>{organization?.name ?? 'No organization'}</Text>
          <Text style={styles.locationAddress}>
            {organization
              ? `${organization.office_latitude.toFixed(6)}, ${organization.office_longitude.toFixed(6)} · ${organization.geofence_radius_meters}m radius`
              : 'Set up your organization to enable check-in'}
          </Text>
        </View>

        <View style={styles.card}>
          <View style={styles.cardTitleRow}>
            <CalendarIcon size={16} color="#6C63FF" />
            <Text style={styles.cardTitle}>This Month</Text>
          </View>
          {loadingStatus ? (
            <ActivityIndicator color={GREEN} style={styles.statsLoader} />
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

        <View style={styles.card}>
          <View style={styles.cardTitleRow}>
            <Text style={styles.cardTitle}>Recent Attendance</Text>
            {loadingStatus && <ActivityIndicator color={GREEN} size="small" style={styles.recentLoader} />}
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

        <View style={styles.bottomSpacer} />
      </ScrollView>

      <View style={styles.tabBar}>
        <TouchableOpacity style={styles.tabItem} onPress={() => setActiveTab('Home')}>
          <HomeIcon size={20} color={activeTab === 'Home' ? PURPLE : '#888'} />
          <Text style={[styles.tabLabel, activeTab === 'Home' && styles.tabLabelActive]}>Home</Text>
          {activeTab === 'Home' && <View style={styles.tabActiveIndicator} />}
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.tabItem}
          onPress={() => { setActiveTab('Attendance'); navigation.navigate('Attendance'); }}
        >
          <ClockIcon size={20} color={activeTab === 'Attendance' ? PURPLE : '#888'} />
          <Text style={[styles.tabLabel, activeTab === 'Attendance' && styles.tabLabelActive]}>Attendance</Text>
          {activeTab === 'Attendance' && <View style={styles.tabActiveIndicator} />}
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.tabItem}
          onPress={() => { setActiveTab('Settings'); navigation.navigate('Settings'); }}
        >
          <SettingsIcon size={20} color={activeTab === 'Settings' ? PURPLE : '#888'} />
          <Text style={[styles.tabLabel, activeTab === 'Settings' && styles.tabLabelActive]}>Settings</Text>
          {activeTab === 'Settings' && <View style={styles.tabActiveIndicator} />}
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: '#F5F5F8' },
  centerFill: { alignItems: 'center', justifyContent: 'center' },

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
  orgBadge: { color: '#A8F0C0', fontSize: 12, fontWeight: '600', marginTop: 4 },
  avatarCircle: {
    width: 42, height: 42, borderRadius: 21,
    backgroundColor: 'rgba(255,255,255,0.2)',
    alignItems: 'center', justifyContent: 'center',
  },
  statusBox: {
    backgroundColor: 'rgba(255,255,255,0.15)', borderRadius: 14,
    paddingHorizontal: 16, paddingVertical: 12,
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
  },
  statusBoxLabel: { color: '#C8C0F0', fontSize: 12, marginBottom: 4 },
  statusBoxValue: { color: '#FFFFFF', fontSize: 17, fontWeight: '700' },
  statusValueRow: { flexDirection: 'row', alignItems: 'center' },

  scrollView: { flex: 1 },
  scrollContent: { paddingHorizontal: 16, paddingTop: 20, paddingBottom: 24, gap: 14 },

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
  checkInText: { color: '#FFFFFF', fontSize: 17, fontWeight: '700' },

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
  verifiedBadge: {
    backgroundColor: '#E8F5E9', borderRadius: 20,
    paddingHorizontal: 10, paddingVertical: 3,
  },
  verifiedText: { color: '#388E3C', fontSize: 12, fontWeight: '600' },
  locationName: { color: GREEN, fontSize: 14, fontWeight: '600', marginBottom: 2 },
  locationAddress: { color: GREEN, fontSize: 12 },

  statsRow: { flexDirection: 'row', justifyContent: 'space-around', marginTop: 8 },
  statItem: { alignItems: 'center', gap: 8 },
  statCircle: { width: 60, height: 60, borderRadius: 30, alignItems: 'center', justifyContent: 'center' },
  circleGreen: { backgroundColor: GREEN },
  circleGray:  { backgroundColor: '#EEEEF3' },
  circleLeave: { backgroundColor: '#D8ECC0' },
  statNumber:     { fontSize: 20, fontWeight: '800', color: '#FFFFFF' },
  statNumberDark: { color: '#4A4A6A' },
  statLabel: { fontSize: 13, color: '#888', fontWeight: '500' },

  emptyBox: { alignItems: 'center', paddingVertical: 20 },
  emptyText: { fontSize: 14, fontWeight: '600', color: '#888' },
  emptySubText: { fontSize: 12, color: '#AAA', marginTop: 4 },

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
  attendanceInfo: { gap: 2 },
  attendanceDate: { fontSize: 14, fontWeight: '600', color: '#1A1A2E' },
  attendanceTime: { fontSize: 12, color: '#888' },

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
  noBorderBottom: { borderBottomWidth: 0 },
  rowBorderBottom: { borderBottomWidth: 1, borderBottomColor: '#F0F0F5' },
  statusLoader: { marginTop: 4 },
  statsLoader: { marginVertical: 16 },
  recentLoader: { marginLeft: 8 },
  bottomSpacer: { height: 16 },

  tabBar: {
    flexDirection: 'row', backgroundColor: '#FFFFFF',
    borderTopWidth: 1, borderTopColor: '#EFEFEF',
    paddingBottom: Platform.OS === 'ios' ? 20 : 8,
    paddingTop: 10,
  },
  tabItem: { flex: 1, alignItems: 'center', gap: 3 },
  tabLabel: { fontSize: 11, color: '#888' },
  tabLabelActive: { color: PURPLE, fontWeight: '700' },
  tabActiveIndicator: {
    position: 'absolute', bottom: -10,
    width: 20, height: 3,
    backgroundColor: PURPLE, borderRadius: 2,
  },
});