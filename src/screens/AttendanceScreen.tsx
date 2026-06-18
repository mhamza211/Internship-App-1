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
  TextInput,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import type { RootStackParamList } from '../types/navigation';

type NavigationProp = NativeStackNavigationProp<RootStackParamList, 'Attendance'>;

const PURPLE = '#3D2C8D';
const GREEN  = '#5DBB7A';
const LIGHT_BG = '#F5F5F8';

type AttendanceEntry = {
  id: string;
  date: string;
  timeIn: string;
  timeOut: string;
  status: 'Present' | 'Late' | 'Absent';
  location: string;
  hours: string;
};

const ENTRIES: AttendanceEntry[] = [
  { id: '1', date: 'Jun 09', timeIn: '09:00 AM', timeOut: '05:30 PM', status: 'Present', location: 'Main Office', hours: '8h 30m' },
  { id: '2', date: 'Jun 08', timeIn: '08:55 AM', timeOut: '05:45 PM', status: 'Present', location: 'Main Office', hours: '8h 50m' },
  { id: '3', date: 'Jun 07', timeIn: '09:10 AM', timeOut: '05:20 PM', status: 'Late',    location: 'Remote',      hours: '8h 10m' },
  { id: '4', date: 'Jun 06', timeIn: '--',        timeOut: '--',        status: 'Absent',  location: '--',          hours: '0h' },
  { id: '5', date: 'Jun 05', timeIn: '09:00 AM', timeOut: '05:30 PM', status: 'Present', location: 'Main Office', hours: '8h 30m' },
  { id: '6', date: 'Jun 04', timeIn: '08:50 AM', timeOut: '05:00 PM', status: 'Present', location: 'Main Office', hours: '8h 10m' },
  { id: '7', date: 'Jun 03', timeIn: '09:30 AM', timeOut: '05:30 PM', status: 'Late',    location: 'Main Office', hours: '8h 00m' },
];

type FilterType = 'All' | 'Present' | 'Late' | 'Absent';

function StatusBadge({ status }: { status: AttendanceEntry['status'] }) {
  const color =
    status === 'Present' ? '#388E3C' :
    status === 'Late'    ? '#F57C00' : '#E53935';
  const bg =
    status === 'Present' ? '#E8F5E9' :
    status === 'Late'    ? '#FFF3E0' : '#FFEBEE';
  return (
    <View style={[styles.badge, { backgroundColor: bg }]}>
      <Text style={[styles.badgeText, { color }]}>{status}</Text>
    </View>
  );
}

export default function AttendanceScreen() {
  const navigation = useNavigation<NavigationProp>();
  const [activeTab, setActiveTab] = useState<'Home' | 'Attendance' | 'History' | 'Settings'>('Attendance');
  const [filter, setFilter] = useState<FilterType>('All');
  const [search, setSearch] = useState('');

  const filtered = ENTRIES.filter(e => {
    const matchFilter = filter === 'All' || e.status === filter;
    const matchSearch = search === '' ||
      e.location.toLowerCase().includes(search.toLowerCase()) ||
      e.status.toLowerCase().includes(search.toLowerCase()) ||
      e.date.toLowerCase().includes(search.toLowerCase());
    return matchFilter && matchSearch;
  });

  const totalDays = 20;
  const presentDays = ENTRIES.filter(e => e.status === 'Present').length;
  const lateDays    = ENTRIES.filter(e => e.status === 'Late').length;
  const absentDays  = ENTRIES.filter(e => e.status === 'Absent').length;

  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar barStyle="light-content" backgroundColor={PURPLE} />

      {/* ── Header ── */}
      <View style={styles.header}>
        <View style={styles.headerTop}>
          <View style={styles.headerBrand}>
            <Text style={styles.headerPin}>📍</Text>
            <View>
              <Text style={styles.headerApp}>GEOLOCK</Text>
              <Text style={styles.headerRole}>Employee</Text>
            </View>
          </View>
          <TouchableOpacity style={styles.headerThemeBtn}>
            <Text style={styles.headerThemeIcon}>🌙</Text>
          </TouchableOpacity>
        </View>
        <Text style={styles.headerTitle}>Attendance</Text>

        {/* Month summary strip */}
        <View style={styles.monthStrip}>
          <Text style={styles.monthStripLabel}>This Month</Text>
          <Text style={styles.monthStripValue}>
            {presentDays} present  •  {lateDays} late  •  {absentDays} absent
          </Text>
        </View>
      </View>

      <ScrollView style={styles.scroll} contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>

        {/* ── Stats Grid ── */}
        <View style={styles.statsGrid}>
          <View style={styles.statCard}>
            <View style={[styles.statIconBox, { backgroundColor: '#E8F5E9' }]}>
              <Text style={styles.statIcon}>📅</Text>
            </View>
            <Text style={styles.statNum}>{totalDays}</Text>
            <Text style={styles.statLabel}>Total Days</Text>
          </View>
          <View style={styles.statCard}>
            <View style={[styles.statIconBox, { backgroundColor: '#E8F5E9' }]}>
              <Text style={styles.statIcon}>✅</Text>
            </View>
            <Text style={styles.statNum}>{presentDays}</Text>
            <Text style={styles.statLabel}>Present</Text>
          </View>
          <View style={styles.statCard}>
            <View style={[styles.statIconBox, { backgroundColor: '#FFF3E0' }]}>
              <Text style={styles.statIcon}>🕐</Text>
            </View>
            <Text style={styles.statNum}>{lateDays}</Text>
            <Text style={styles.statLabel}>Late</Text>
          </View>
          <View style={styles.statCard}>
            <View style={[styles.statIconBox, { backgroundColor: '#FFEBEE' }]}>
              <Text style={styles.statIcon}>❌</Text>
            </View>
            <Text style={styles.statNum}>{absentDays}</Text>
            <Text style={styles.statLabel}>Absent</Text>
          </View>
        </View>

        {/* ── Search and Filter ── */}
        <View style={styles.card}>
          <View style={styles.searchRow}>
            <Text style={styles.searchIcon}>🔍</Text>
            <TextInput
              style={styles.searchInput}
              placeholder="Search location or status"
              placeholderTextColor="#AAA"
              value={search}
              onChangeText={setSearch}
            />
          </View>
          <View style={styles.filterRow}>
            <ScrollView horizontal showsHorizontalScrollIndicator={false}>
              <View style={styles.filterChips}>
                {(['All', 'Present', 'Late', 'Absent'] as FilterType[]).map(f => (
                  <TouchableOpacity
                    key={f}
                    style={[styles.chip, filter === f && styles.chipActive]}
                    onPress={() => setFilter(f)}
                  >
                    <Text style={[styles.chipText, filter === f && styles.chipTextActive]}>{f}</Text>
                  </TouchableOpacity>
                ))}
              </View>
            </ScrollView>
            <TouchableOpacity style={styles.exportBtn}>
              <Text style={styles.exportIcon}>⬇</Text>
              <Text style={styles.exportText}>Export</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* ── Recent Entries ── */}
        <View style={styles.card}>
          <Text style={styles.sectionTitle}>RECENT ENTRIES</Text>
          <View style={styles.entriesList}>
            {filtered.map((entry, idx) => (
              <View key={entry.id} style={[styles.entryRow, idx === filtered.length - 1 && { borderBottomWidth: 0 }]}>
                <View style={styles.entryLeft}>
                  <Text style={styles.entryDate}>{entry.date}</Text>
                  {entry.status !== 'Absent' ? (
                    <Text style={styles.entryTime}>{entry.timeIn} – {entry.timeOut}</Text>
                  ) : (
                    <Text style={styles.entryTime}>-- : --</Text>
                  )}
                  <View style={styles.entryLocationRow}>
                    <Text style={styles.locationPin}>📍</Text>
                    <Text style={styles.entryLocation}>{entry.location}</Text>
                  </View>
                </View>
                <View style={styles.entryRight}>
                  <StatusBadge status={entry.status} />
                  <Text style={styles.entryHours}>{entry.hours}</Text>
                </View>
              </View>
            ))}
            {filtered.length === 0 && (
              <Text style={styles.noResults}>No entries found</Text>
            )}
          </View>
        </View>

        {/* ── Monthly Summary ── */}
        <View style={styles.card}>
          <Text style={styles.cardTitle}>Monthly Summary</Text>
          <Text style={styles.cardSubtitle}>Your attendance overview for this month.</Text>
          <View style={styles.summaryRow}>
            <View>
              <Text style={styles.summaryLabel}>Present Days</Text>
              <Text style={styles.summarySub}>Attendance completed on time</Text>
            </View>
            <Text style={[styles.summaryNum, { color: GREEN }]}>{presentDays}</Text>
          </View>
          <View style={[styles.summaryRow, { borderBottomWidth: 0 }]}>
            <View>
              <Text style={styles.summaryLabel}>Late Arrivals</Text>
              <Text style={styles.summarySub}>One delayed check-in this month</Text>
            </View>
            <Text style={[styles.summaryNum, { color: '#F57C00' }]}>{lateDays}</Text>
          </View>
        </View>

      </ScrollView>

      {/* ── Bottom Tab Bar ── */}
      <View style={styles.tabBar}>
        <TouchableOpacity
          style={styles.tabItem}
          onPress={() => { setActiveTab('Home'); navigation.navigate('Home'); }}
        >
          <Text style={styles.tabIcon}>🏠</Text>
          <Text style={[styles.tabLabel, activeTab === 'Home' && styles.tabLabelActive]}>Home</Text>
          {activeTab === 'Home' && <View style={styles.tabIndicator} />}
        </TouchableOpacity>

        <TouchableOpacity style={styles.tabItem} onPress={() => setActiveTab('Attendance')}>
          <Text style={styles.tabIcon}>🕐</Text>
          <Text style={[styles.tabLabel, activeTab === 'Attendance' && styles.tabLabelActive]}>Attendance</Text>
          {activeTab === 'Attendance' && <View style={styles.tabIndicator} />}
        </TouchableOpacity>

        <TouchableOpacity style={styles.tabItem} onPress={() => setActiveTab('History')}>
          <Text style={styles.tabIcon}>🕒</Text>
          <Text style={[styles.tabLabel, activeTab === 'History' && styles.tabLabelActive]}>History</Text>
          {activeTab === 'History' && <View style={styles.tabIndicator} />}
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.tabItem}
          onPress={() => { setActiveTab('Settings'); navigation.navigate('Settings'); }}
        >
          <Text style={styles.tabIcon}>⚙️</Text>
          <Text style={[styles.tabLabel, activeTab === 'Settings' && styles.tabLabelActive]}>Settings</Text>
          {activeTab === 'Settings' && <View style={styles.tabIndicator} />}
        </TouchableOpacity>
      </View>

    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: LIGHT_BG },

  // Header
  header: {
    backgroundColor: PURPLE,
    paddingHorizontal: 20,
    paddingTop: Platform.OS === 'android' ? (StatusBar.currentHeight ?? 24) + 10 : 16,
    paddingBottom: 24,
    borderBottomLeftRadius: 24,
    borderBottomRightRadius: 24,
  },
  headerTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 },
  headerBrand: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  headerPin: { fontSize: 16 },
  headerApp:  { color: '#FFFFFF', fontSize: 13, fontWeight: '800', letterSpacing: 1.5 },
  headerRole: { color: 'rgba(255,255,255,0.7)', fontSize: 11 },
  headerThemeBtn: { width: 36, height: 36, borderRadius: 18, backgroundColor: 'rgba(255,255,255,0.15)', alignItems: 'center', justifyContent: 'center' },
  headerThemeIcon: { fontSize: 16 },
  headerTitle: { color: '#FFFFFF', fontSize: 26, fontWeight: '800', marginBottom: 14 },

  monthStrip: { backgroundColor: 'rgba(255,255,255,0.15)', borderRadius: 12, paddingHorizontal: 14, paddingVertical: 10 },
  monthStripLabel: { color: 'rgba(255,255,255,0.7)', fontSize: 11, marginBottom: 4 },
  monthStripValue: { color: '#FFFFFF', fontSize: 15, fontWeight: '700' },

  // Scroll
  scroll: { flex: 1 },
  scrollContent: { padding: 16, gap: 14, paddingBottom: 32 },

  // Stats grid
  statsGrid: { flexDirection: 'row', gap: 10 },
  statCard: {
    flex: 1, backgroundColor: '#FFFFFF', borderRadius: 14, padding: 12,
    alignItems: 'center', gap: 6,
    shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.06, shadowRadius: 6, elevation: 3,
  },
  statIconBox: { width: 36, height: 36, borderRadius: 10, alignItems: 'center', justifyContent: 'center' },
  statIcon: { fontSize: 18 },
  statNum: { fontSize: 22, fontWeight: '800', color: '#1A1A2E' },
  statLabel: { fontSize: 11, color: '#888', fontWeight: '500', textAlign: 'center' },

  // Card
  card: {
    backgroundColor: '#FFFFFF', borderRadius: 16, padding: 16,
    shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.06, shadowRadius: 6, elevation: 3,
  },

  // Search
  searchRow: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#F5F5F8', borderRadius: 10, paddingHorizontal: 12, paddingVertical: 10, gap: 8, marginBottom: 12 },
  searchIcon: { fontSize: 15 },
  searchInput: { flex: 1, fontSize: 13, color: '#1A1A2E' },

  // Filter
  filterRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  filterChips: { flexDirection: 'row', gap: 8 },
  chip: { backgroundColor: '#F0F0F5', borderRadius: 20, paddingHorizontal: 14, paddingVertical: 7 },
  chipActive: { backgroundColor: PURPLE },
  chipText: { fontSize: 12, color: '#888', fontWeight: '600' },
  chipTextActive: { color: '#FFFFFF' },
  exportBtn: { flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: GREEN, borderRadius: 10, paddingHorizontal: 14, paddingVertical: 8 },
  exportIcon: { fontSize: 13, color: '#FFFFFF' },
  exportText: { color: '#FFFFFF', fontSize: 13, fontWeight: '700' },

  // Entries
  sectionTitle: { fontSize: 11, fontWeight: '700', color: '#AAA', letterSpacing: 1, marginBottom: 12 },
  entriesList: { gap: 0 },
  entryRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 14, borderBottomWidth: 1, borderBottomColor: '#F0F0F5' },
  entryLeft: { gap: 3 },
  entryDate: { fontSize: 14, fontWeight: '700', color: '#1A1A2E' },
  entryTime: { fontSize: 12, color: '#888' },
  entryLocationRow: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  locationPin: { fontSize: 11 },
  entryLocation: { fontSize: 11, color: '#888' },
  entryRight: { alignItems: 'flex-end', gap: 6 },
  badge: { borderRadius: 20, paddingHorizontal: 10, paddingVertical: 4 },
  badgeText: { fontSize: 12, fontWeight: '700' },
  entryHours: { fontSize: 12, color: '#888', fontWeight: '500' },
  noResults: { textAlign: 'center', color: '#AAA', fontSize: 13, paddingVertical: 20 },

  // Monthly Summary
  cardTitle: { fontSize: 15, fontWeight: '700', color: '#1A1A2E', marginBottom: 4 },
  cardSubtitle: { fontSize: 12, color: '#888', marginBottom: 14 },
  summaryRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 14, borderBottomWidth: 1, borderBottomColor: '#F0F0F5' },
  summaryLabel: { fontSize: 14, fontWeight: '600', color: '#1A1A2E', marginBottom: 3 },
  summarySub: { fontSize: 11, color: '#AAA' },
  summaryNum: { fontSize: 22, fontWeight: '800' },

  // Tab Bar
  tabBar: { flexDirection: 'row', backgroundColor: '#FFFFFF', borderTopWidth: 1, borderTopColor: '#EFEFEF', paddingBottom: 8, paddingTop: 10 },
  tabItem: { flex: 1, alignItems: 'center', gap: 3 },
  tabIcon: { fontSize: 20 },
  tabLabel: { fontSize: 11, color: '#888' },
  tabLabelActive: { color: PURPLE, fontWeight: '700' },
  tabIndicator: { position: 'absolute', bottom: -10, width: 20, height: 3, backgroundColor: PURPLE, borderRadius: 2 },
});
