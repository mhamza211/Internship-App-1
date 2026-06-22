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
  Share,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import type { RootStackParamList } from '../types/navigation';
import { fetchMyAttendance } from '../lib/attendance';
import { AttendanceRecord } from '../types/attendance';

type NavigationProp = NativeStackNavigationProp<RootStackParamList, 'Attendance'>;

const PURPLE = '#3D2C8D';
const GREEN  = '#5DBB7A';

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
    timeOut: '--',
    status: statusMap[record.status],
    location: record.address || 'Location unavailable',
    hours: '--',
  };
}

export default function AttendanceScreen() {
  const navigation = useNavigation<NavigationProp>();
  const [activeTab, setActiveTab] = useState<'Home' | 'Attendance' | 'History' | 'Settings'>('Attendance');
  const [filter, setFilter] = useState<FilterType>('All');
  const [search, setSearch] = useState('');
  const [lightMode, setLightMode] = useState(true);

  const [entries, setEntries] = useState<AttendanceEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [exporting, setExporting] = useState(false);

  const bg        = lightMode ? '#F5F5F8' : '#1A1A2E';
  const cardBg    = lightMode ? '#FFFFFF' : '#252840';
  const textColor = lightMode ? '#1A1A2E' : '#FFFFFF';
  const subColor  = lightMode ? '#888'    : '#8B8FA8';
  const fieldBg   = lightMode ? '#F5F5F8' : '#1E2040';
  const borderColor = lightMode ? '#F0F0F5' : '#2E3255';

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

      const records = await fetchMyAttendance(60);

      const monthRecords = records.filter(r => {
        const d = new Date(r.check_in_time);
        return d.getFullYear() === year && d.getMonth() === month;
      });

      const recordsByDay = new Map<number, AttendanceRecord>();
      monthRecords.forEach(r => {
        const day = new Date(r.check_in_time).getDate();
        if (!recordsByDay.has(day)) recordsByDay.set(day, r);
      });

      const built: AttendanceEntry[] = [];

      for (let day = todayDate; day >= 1; day--) {
        const d = new Date(year, month, day);
        const dow = d.getDay();
        const isWorkday = dow !== 0 && dow !== 6;
        const record = recordsByDay.get(day);

        if (record) {
          built.push(mapRecordToEntry(record, d));
        } else if (isWorkday && day < todayDate) {
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
        const safeLocation = e.location.replace(/"/g, '""');
        return `${e.date},${e.status},${e.timeIn},${e.hours},"${safeLocation}"`;
      });

      const csvContent = [...summaryLines, ...dataLines].join('\n');

      await Share.share({
        title: 'Export Attendance History',
        message: csvContent,
      });
    } catch (error: any) {
      console.error('Export failed:', error);
      Alert.alert('Export Failed', 'Something went wrong while exporting your attendance history.');
    } finally {
      setExporting(false);
    }
  };

  return (
    <SafeAreaView style={[styles.safeArea, { backgroundColor: bg }]}>
      <StatusBar barStyle="light-content" backgroundColor={PURPLE} />

      <View style={styles.header}>
        <View style={styles.headerTop}>
          <View style={styles.headerBrand}>
            <Text style={styles.headerPin}>📍</Text>
            <View>
              <Text style={styles.headerApp}>GEOLOCK</Text>
              <Text style={styles.headerRole}>Employee</Text>
            </View>
          </View>
          <TouchableOpacity style={styles.headerThemeBtn} onPress={() => setLightMode(!lightMode)}>
            <Text style={styles.headerThemeIcon}>{lightMode ? '🌙' : '☀️'}</Text>
          </TouchableOpacity>
        </View>
        <Text style={styles.headerTitle}>Attendance</Text>

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

        {loading ? (
          <ActivityIndicator color={GREEN} style={{ marginVertical: 20 }} />
        ) : (
          <View style={styles.statsGrid}>
            <View style={[styles.statCard, { backgroundColor: cardBg }]}>
              <View style={[styles.statIconBox, { backgroundColor: '#E8F5E9' }]}>
                <Text style={styles.statIcon}>📅</Text>
              </View>
              <Text style={[styles.statNum, { color: textColor }]}>{totalDays}</Text>
              <Text style={[styles.statLabel, { color: subColor }]}>Total Days</Text>
            </View>
            <View style={[styles.statCard, { backgroundColor: cardBg }]}>
              <View style={[styles.statIconBox, { backgroundColor: '#E8F5E9' }]}>
                <Text style={styles.statIcon}>✅</Text>
              </View>
              <Text style={[styles.statNum, { color: textColor }]}>{presentDays}</Text>
              <Text style={[styles.statLabel, { color: subColor }]}>Present</Text>
            </View>
            <View style={[styles.statCard, { backgroundColor: cardBg }]}>
              <View style={[styles.statIconBox, { backgroundColor: '#FFF3E0' }]}>
                <Text style={styles.statIcon}>🕐</Text>
              </View>
              <Text style={[styles.statNum, { color: textColor }]}>{lateDays}</Text>
              <Text style={[styles.statLabel, { color: subColor }]}>Late</Text>
            </View>
            <View style={[styles.statCard, { backgroundColor: cardBg }]}>
              <View style={[styles.statIconBox, { backgroundColor: '#FFEBEE' }]}>
                <Text style={styles.statIcon}>❌</Text>
              </View>
              <Text style={[styles.statNum, { color: textColor }]}>{absentDays}</Text>
              <Text style={[styles.statLabel, { color: subColor }]}>Absent</Text>
            </View>
          </View>
        )}

        <View style={[styles.card, { backgroundColor: cardBg }]}>
          <View style={[styles.searchRow, { backgroundColor: fieldBg }]}>
            <Text style={styles.searchIcon}>🔍</Text>
            <TextInput
              style={[styles.searchInput, { color: textColor }]}
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

        <View style={[styles.card, { backgroundColor: cardBg }]}>
          <Text style={[styles.sectionTitle, { color: subColor }]}>RECENT ENTRIES</Text>
          {loading ? (
            <ActivityIndicator color={GREEN} style={{ marginVertical: 16 }} />
          ) : (
            <View style={styles.entriesList}>
              {filtered.map((entry, idx) => (
                <View key={entry.id} style={[styles.entryRow, { borderBottomColor: borderColor }, idx === filtered.length - 1 && { borderBottomWidth: 0 }]}>
                  <View style={styles.entryLeft}>
                    <Text style={[styles.entryDate, { color: textColor }]}>{entry.date}</Text>
                    {entry.status !== 'Absent' ? (
                      <Text style={[styles.entryTime, { color: subColor }]}>Checked in {entry.timeIn}</Text>
                    ) : (
                      <Text style={[styles.entryTime, { color: subColor }]}>-- : --</Text>
                    )}
                    <View style={styles.entryLocationRow}>
                      <Text style={styles.locationPin}>📍</Text>
                      <Text style={[styles.entryLocation, { color: subColor }]}>{entry.location}</Text>
                    </View>
                  </View>
                  <View style={styles.entryRight}>
                    <StatusBadge status={entry.status} />
                    <Text style={[styles.entryHours, { color: subColor }]}>{entry.hours}</Text>
                  </View>
                </View>
              ))}
              {filtered.length === 0 && (
                <Text style={[styles.noResults, { color: subColor }]}>No entries found</Text>
              )}
            </View>
          )}
        </View>

        <View style={[styles.card, { backgroundColor: cardBg }]}>
          <Text style={[styles.cardTitle, { color: textColor }]}>Monthly Summary</Text>
          <Text style={[styles.cardSubtitle, { color: subColor }]}>Your attendance overview for this month.</Text>
          <View style={[styles.summaryRow, { borderBottomColor: borderColor }]}>
            <View>
              <Text style={[styles.summaryLabel, { color: textColor }]}>Present Days</Text>
              <Text style={[styles.summarySub, { color: subColor }]}>Attendance completed on time</Text>
            </View>
            <Text style={[styles.summaryNum, { color: GREEN }]}>{presentDays}</Text>
          </View>
          <View style={[styles.summaryRow, { borderBottomWidth: 0 }]}>
            <View>
              <Text style={[styles.summaryLabel, { color: textColor }]}>Late Arrivals</Text>
              <Text style={[styles.summarySub, { color: subColor }]}>
                {lateDays === 0 ? 'No delayed check-ins this month' : `${lateDays} delayed check-in${lateDays === 1 ? '' : 's'} this month`}
              </Text>
            </View>
            <Text style={[styles.summaryNum, { color: '#F57C00' }]}>{lateDays}</Text>
          </View>
        </View>

      </ScrollView>

      <View style={[styles.tabBar, { backgroundColor: cardBg, borderTopColor: borderColor }]}>
        <TouchableOpacity
          style={styles.tabItem}
          onPress={() => { setActiveTab('Home'); navigation.navigate('Home'); }}
        >
          <Text style={styles.tabIcon}>🏠</Text>
          <Text style={[styles.tabLabel, { color: subColor }, activeTab === 'Home' && styles.tabLabelActive]}>Home</Text>
          {activeTab === 'Home' && <View style={styles.tabIndicator} />}
        </TouchableOpacity>

        <TouchableOpacity style={styles.tabItem} onPress={() => setActiveTab('Attendance')}>
          <Text style={styles.tabIcon}>🕐</Text>
          <Text style={[styles.tabLabel, { color: subColor }, activeTab === 'Attendance' && styles.tabLabelActive]}>Attendance</Text>
          {activeTab === 'Attendance' && <View style={styles.tabIndicator} />}
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.tabItem}
          onPress={() => { setActiveTab('Settings'); navigation.navigate('Settings'); }}
        >
          <Text style={styles.tabIcon}>⚙️</Text>
          <Text style={[styles.tabLabel, { color: subColor }, activeTab === 'Settings' && styles.tabLabelActive]}>Settings</Text>
          {activeTab === 'Settings' && <View style={styles.tabIndicator} />}
        </TouchableOpacity>
      </View>

    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1 },

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

  scroll: { flex: 1 },
  scrollContent: { padding: 16, gap: 14, paddingBottom: 32 },

  statsGrid: { flexDirection: 'row', gap: 10 },
  statCard: {
    flex: 1, borderRadius: 14, padding: 12,
    alignItems: 'center', gap: 6,
    shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.06, shadowRadius: 6, elevation: 3,
  },
  statIconBox: { width: 36, height: 36, borderRadius: 10, alignItems: 'center', justifyContent: 'center' },
  statIcon: { fontSize: 18 },
  statNum: { fontSize: 22, fontWeight: '800' },
  statLabel: { fontSize: 11, fontWeight: '500', textAlign: 'center' },

  card: {
    borderRadius: 16, padding: 16,
    shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.06, shadowRadius: 6, elevation: 3,
  },

  searchRow: { flexDirection: 'row', alignItems: 'center', borderRadius: 10, paddingHorizontal: 12, paddingVertical: 10, gap: 8, marginBottom: 12 },
  searchIcon: { fontSize: 15 },
  searchInput: { flex: 1, fontSize: 13 },

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

  sectionTitle: { fontSize: 11, fontWeight: '700', letterSpacing: 1, marginBottom: 12 },
  entriesList: { gap: 0 },
  entryRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 14, borderBottomWidth: 1 },
  entryLeft: { gap: 3 },
  entryDate: { fontSize: 14, fontWeight: '700' },
  entryTime: { fontSize: 12 },
  entryLocationRow: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  locationPin: { fontSize: 11 },
  entryLocation: { fontSize: 11 },
  entryRight: { alignItems: 'flex-end', gap: 6 },
  badge: { borderRadius: 20, paddingHorizontal: 10, paddingVertical: 4 },
  badgeText: { fontSize: 12, fontWeight: '700' },
  entryHours: { fontSize: 12, fontWeight: '500' },
  noResults: { textAlign: 'center', fontSize: 13, paddingVertical: 20 },

  cardTitle: { fontSize: 15, fontWeight: '700', marginBottom: 4 },
  cardSubtitle: { fontSize: 12, marginBottom: 14 },
  summaryRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 14, borderBottomWidth: 1 },
  summaryLabel: { fontSize: 14, fontWeight: '600', marginBottom: 3 },
  summarySub: { fontSize: 11 },
  summaryNum: { fontSize: 22, fontWeight: '800' },

  tabBar: { flexDirection: 'row', borderTopWidth: 1, paddingBottom: 8, paddingTop: 10 },
  tabItem: { flex: 1, alignItems: 'center', gap: 3 },
  tabIcon: { fontSize: 20 },
  tabLabel: { fontSize: 11 },
  tabLabelActive: { color: PURPLE, fontWeight: '700' },
  tabIndicator: { position: 'absolute', bottom: -10, width: 20, height: 3, backgroundColor: PURPLE, borderRadius: 2 },
});