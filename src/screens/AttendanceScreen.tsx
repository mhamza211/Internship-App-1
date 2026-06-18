import React, { useState, useEffect } from 'react';
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
  ActivityIndicator,
  Alert,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import type { RootStackParamList } from '../types/navigation';
import { fetchMyAttendance } from '../lib/attendance';
import { AttendanceRecord } from '../types/attendance';
import RNFS from 'react-native-fs';
import Share from 'react-native-share';

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

// Builds one display row out of a real Supabase record
function mapRecordToEntry(record: AttendanceRecord, day: Date): AttendanceEntry {
  const timeIn = new Date(record.check_in_time).toLocaleTimeString('en-US', {
    hour: '2-digit',
    minute: '2-digit',
  });
  const statusMap: Record<AttendanceRecord['status'], AttendanceEntry['status']> = {
    present: 'Present',
    late: 'Late',
    absent: 'Absent',
  };
  return {
    id: record.id,
    date: day.toLocaleDateString('en-US', { month: 'short', day: '2-digit' }),
    timeIn,
    timeOut: '--', // no check-out tracking in the schema yet
    status: statusMap[record.status],
    location: record.address || 'Location unavailable',
    hours: '--', // can't be computed without a check-out time
  };
}

export default function AttendanceScreen() {
  const navigation = useNavigation<NavigationProp>();
  const [activeTab, setActiveTab] = useState<'Home' | 'Attendance' | 'History' | 'Settings'>('Attendance');
  const [filter, setFilter] = useState<FilterType>('All');
  const [search, setSearch] = useState('');

  const [entries, setEntries] = useState<AttendanceEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [exporting, setExporting] = useState(false);

  useEffect(() => {
    loadAttendance();
  }, []);

  useEffect(() => {
    const unsubscribe = navigation.addListener('focus', () => {
      loadAttendance();
    });
    return unsubscribe;
  }, [navigation]);

  const loadAttendance = async () => {
    setLoading(true);
    try {
      const now = new Date();
      const year = now.getFullYear();
      const month = now.getMonth();
      const todayDate = now.getDate();

      // 60 covers a full month of daily check-ins comfortably
      const records = await fetchMyAttendance(60);

      const monthRecords = records.filter(r => {
        const d = new Date(r.check_in_time);
        return d.getFullYear() === year && d.getMonth() === month;
      });

      // records are newest-first, so the first one we see per day is the one we keep
      const recordsByDay = new Map<number, AttendanceRecord>();
      monthRecords.forEach(r => {
        const day = new Date(r.check_in_time).getDate();
        if (!recordsByDay.has(day)) recordsByDay.set(day, r);
      });

      const built: AttendanceEntry[] = [];

      // Walk from today back to the 1st of the month
      for (let day = todayDate; day >= 1; day--) {
        const d = new Date(year, month, day);
        const dow = d.getDay(); // 0 = Sun, 6 = Sat
        const isWorkday = dow !== 0 && dow !== 6; // assumes Mon–Fri work week
        const record = recordsByDay.get(day);

        if (record) {
          built.push(mapRecordToEntry(record, d));
        } else if (isWorkday && day < todayDate) {
          // a working day already passed with no check-in record = absent
          built.push({
            id: `absent-${year}-${month}-${day}`,
            date: d.toLocaleDateString('en-US', { month: 'short', day: '2-digit' }),
            timeIn: '--',
            timeOut: '--',
            status: 'Absent',
            location: '--',
            hours: '0h',
          });
        }
        // today with no record yet, or weekends, are simply skipped (not absent yet / not a workday)
      }

      setEntries(built);
    } catch (e) {
      console.error('Failed to load attendance:', e);
    }
    setLoading(false);
  };

  const filtered = entries.filter(e => {
    const matchFilter = filter === 'All' || e.status === filter;
    const matchSearch = search === '' ||
      e.location.toLowerCase().includes(search.toLowerCase()) ||
      e.status.toLowerCase().includes(search.toLowerCase()) ||
      e.date.toLowerCase().includes(search.toLowerCase());
    return matchFilter && matchSearch;
  });

  const totalDays   = entries.length;
  const presentDays = entries.filter(e => e.status === 'Present').length;
  const lateDays    = entries.filter(e => e.status === 'Late').length;
  const absentDays  = entries.filter(e => e.status === 'Absent').length;

  // ── Export full month history as CSV, then hand it to the native share sheet ──
  const handleExport = async () => {
    if (entries.length === 0) {
      Alert.alert('Nothing to Export', 'There are no attendance records for this month yet.');
      return;
    }

    setExporting(true);
    try {
      const now = new Date();
      const monthLabel = now.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });

      const summaryLines = [
        `Attendance Report - ${monthLabel}`,
        `Total Days,${totalDays}`,
        `Present,${presentDays}`,
        `Late,${lateDays}`,
        `Absent,${absentDays}`,
        '',
        'Date,Status,Check-In Time,Hours,Location',
      ];

      const dataLines = entries.map(e => {
        const safeLocation = e.location.replace(/"/g, '""'); // escape quotes for CSV
        return `${e.date},${e.status},${e.timeIn},${e.hours},"${safeLocation}"`;
      });

      const csvContent = [...summaryLines, ...dataLines].join('\n');

      const fileName = `Attendance_${now.toLocaleDateString('en-US', { month: 'short' })}_${now.getFullYear()}.csv`;
      // App-private storage — no Android permissions needed to write here
      const filePath = `${RNFS.DocumentDirectoryPath}/${fileName}`;

      await RNFS.writeFile(filePath, csvContent, 'utf8');

      await Share.open({
        title: 'Export Attendance History',
        url: Platform.OS === 'android' ? `file://${filePath}` : filePath,
        type: 'text/csv',
        filename: fileName,
        failOnCancel: false, // don't throw when the user just closes the share sheet
      });
    } catch (error: any) {
      // react-native-share throws when the user cancels — ignore that case
      if (error?.message !== 'User did not share') {
        console.error('Export failed:', error);
        Alert.alert('Export Failed', 'Something went wrong while exporting your attendance history.');
      }
    } finally {
      setExporting(false);
    }
  };

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
          {loading ? (
            <ActivityIndicator color="#fff" size="small" style={{ marginTop: 4, alignSelf: 'flex-start' }} />
          ) : (
            <Text style={styles.monthStripValue}>
              {presentDays} present  •  {lateDays} late  •  {absentDays} absent
            </Text>
          )}
        </View>
      </View>

      <ScrollView style={styles.scroll} contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>

        {/* ── Stats Grid ── */}
        {loading ? (
          <ActivityIndicator color={GREEN} style={{ marginVertical: 20 }} />
        ) : (
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
        )}

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
            <TouchableOpacity
              style={[styles.exportBtn, exporting && { opacity: 0.7 }]}
              onPress={handleExport}
              disabled={exporting}
            >
              {exporting ? (
                <ActivityIndicator color="#FFFFFF" size="small" />
              ) : (
                <>
                  <Text style={styles.exportIcon}>⬇</Text>
                  <Text style={styles.exportText}>Export</Text>
                </>
              )}
            </TouchableOpacity>
          </View>
        </View>

        {/* ── Recent Entries ── */}
        <View style={styles.card}>
          <Text style={styles.sectionTitle}>RECENT ENTRIES</Text>
          {loading ? (
            <ActivityIndicator color={GREEN} style={{ marginVertical: 16 }} />
          ) : (
            <View style={styles.entriesList}>
              {filtered.map((entry, idx) => (
                <View key={entry.id} style={[styles.entryRow, idx === filtered.length - 1 && { borderBottomWidth: 0 }]}>
                  <View style={styles.entryLeft}>
                    <Text style={styles.entryDate}>{entry.date}</Text>
                    {entry.status !== 'Absent' ? (
                      <Text style={styles.entryTime}>Checked in {entry.timeIn}</Text>
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
          )}
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
              <Text style={styles.summarySub}>
                {lateDays === 0 ? 'No delayed check-ins this month' : `${lateDays} delayed check-in${lateDays === 1 ? '' : 's'} this month`}
              </Text>
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
  exportBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6,
    backgroundColor: GREEN, borderRadius: 10, paddingHorizontal: 14, paddingVertical: 8,
    minWidth: 90,
  },
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