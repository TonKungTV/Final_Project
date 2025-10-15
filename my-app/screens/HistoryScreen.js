import React, { useEffect, useState, useCallback, useMemo } from 'react';
import {
  View, Text, StyleSheet, FlatList, RefreshControl,
  TouchableOpacity, ActivityIndicator, ScrollView, TextInput, Alert
} from 'react-native';
import DateTimePicker from '@react-native-community/datetimepicker';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { BASE_URL } from './config';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { BarChart } from 'react-native-chart-kit';
import { Dimensions } from 'react-native';


const formatLocalDate = (d) => {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
};

const displayDate = (d) => d.toLocaleDateString('th-TH', {
  day: 'numeric',
  month: 'short',
  year: 'numeric'
});

const formatMinutesToTime = (minutes) => {
  if (!minutes || minutes === 0) return '0 นาที';
  const hours = Math.floor(minutes / 60);
  const mins = Math.round(minutes % 60);
  if (hours > 0) {
    return mins > 0 ? `${hours} ชม. ${mins} นาที` : `${hours} ชั่วโมง`;
  }
  return `${mins} นาที`;
};

const getStatusColor = (status, isLate = false) => {
  if (status === 'กินแล้ว') return isLate ? '#ff9800' : '#28a745';
  if (status === 'ข้าม') return '#dc3545';
  if (status === 'ไม่ระบุ') return '#6c757d';
  return '#ffc107';
};

const getStatusIcon = (status, isLate = false) => {
  if (status === 'กินแล้ว') return isLate ? 'time' : 'checkmark-circle';
  if (status === 'ข้าม') return 'close-circle';
  if (status === 'ไม่ระบุ') return 'help-circle';
  return 'hourglass-outline';
};

const HistoryScreen = () => {

  const [fromDate, setFromDate] = useState(() => {
    const d = new Date();
    d.setDate(d.getDate() - 6);
    return d;
  });
  const [toDate, setToDate] = useState(new Date());
  const [showPicker, setShowPicker] = useState(null);
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [rows, setRows] = useState([]);
  const [summary, setSummary] = useState({
    total: 0, onTime: 0, late: 0, taken: 0, skipped: 0, unknown: 0, avgLateMinutes: 0
  });
  const [medStats, setMedStats] = useState([]);
  const [viewMode, setViewMode] = useState('summary');
  const [displayMode, setDisplayMode] = useState('count');
  const [lateThreshold, setLateThreshold] = useState('1');
  const [tempThreshold, setTempThreshold] = useState('1');
  const [searchQuery, setSearchQuery] = useState('');
  const [filterStatus, setFilterStatus] = useState('all');
  const [sortBy, setSortBy] = useState('date'); // 'date' | 'name' | 'status'
  const [expandedCards, setExpandedCards] = useState(new Set());
  const [advancedStats, setAdvancedStats] = useState({
    medications: [],
    timeDistribution: [],
    dailyTrend: []
  });
  const [chartMode, setChartMode] = useState('adherence'); // 'adherence' | 'onTime' | 'late' | 'compliance'
  const [statsFilter, setStatsFilter] = useState('all'); // 'all' | 'max' | 'min' | 'avg'
  const [selectedPeriod, setSelectedPeriod] = useState('all'); // 'all' | 'เช้า' | 'กลางวัน' | 'เย็น' | 'ก่อนนอน'
  const [summaryChartMode, setSummaryChartMode] = useState('adherence'); // 'adherence' | 'compliance'
  const [medTimeStats, setMedTimeStats] = useState({});
  


  // ===================================
  // 📅 Quick Date Presets
  // ===================================

  const datePresets = [
    { label: '7 วัน', days: 7 },
    { label: '14 วัน', days: 14 },
    { label: '30 วัน', days: 30 },
    { label: '90 วัน', days: 90 },
  ];

  const applyDatePreset = (days) => {
    const today = new Date();
    const past = new Date();
    past.setDate(today.getDate() - (days - 1));
    setFromDate(past);
    setToDate(today);
  };

  // ===================================
  // 🔄 Data Fetching
  // ===================================

  const fetchData = useCallback(async (from, to) => {
  setLoading(true);
  try {
    const userId = await AsyncStorage.getItem('userId');
    if (!userId) {
      console.warn('⚠️ No userId found');
      setRows([]);
      setSummary({ total: 0, onTime: 0, late: 0, taken: 0, skipped: 0, unknown: 0, avgLateMinutes: 0 });
      setMedStats([]);
      setMedTimeStats({});
      setLoading(false);
      return;
    }

    console.log('🔄 Fetching history data:', { userId, from, to, lateThreshold });

    // ✅ แก้ไข: เพิ่ม timeStatsRes ใน destructuring
    const [summaryRes, historyRes, statsRes, advancedRes, timeStatsRes] = await Promise.all([
      fetch(`${BASE_URL}/api/history/summary?userId=${userId}&from=${from}&to=${to}&lateThresholdHours=${lateThreshold}`),
      fetch(`${BASE_URL}/api/history?userId=${userId}&from=${from}&to=${to}`),
      fetch(`${BASE_URL}/api/medicationlog/stats?userId=${userId}&from=${from}&to=${to}`),
      fetch(`${BASE_URL}/api/medicationlog/advanced-stats?userId=${userId}&from=${from}&to=${to}`),
      fetch(`${BASE_URL}/api/medicationlog/medication-time-stats?userId=${userId}&from=${from}&to=${to}`) // ✅ เพิ่มบรรทัดนี้
    ]);

    // ✅ ตรวจสอบ Response แต่ละตัว
    if (!summaryRes.ok) {
      console.error('❌ Summary API error:', summaryRes.status, summaryRes.statusText);
      const errorText = await summaryRes.text();
      console.error('Error details:', errorText);
    } else {
      const summaryJson = await summaryRes.json();
      console.log('✅ Summary data:', summaryJson);
      setSummary(summaryJson || {
        total: 0, onTime: 0, late: 0, taken: 0, skipped: 0, unknown: 0, avgLateMinutes: 0
      });
    }

    if (!historyRes.ok) {
      console.error('❌ History API error:', historyRes.status, historyRes.statusText);
      const errorText = await historyRes.text();
      console.error('Error details:', errorText);
    } else {
      const historyJson = await historyRes.json();
      console.log('✅ History rows:', historyJson.rows?.length || 0);
      setRows(Array.isArray(historyJson.rows) ? historyJson.rows : []);
    }

    if (!statsRes.ok) {
      console.error('❌ Stats API error:', statsRes.status, statsRes.statusText);
      const errorText = await statsRes.text();
      console.error('Error details:', errorText);
    } else {
      const statsJson = await statsRes.json();
      console.log('✅ Med stats:', statsJson);
      console.log('✅ Med stats count:', statsJson?.length || 0);
      setMedStats(Array.isArray(statsJson) ? statsJson : []);
    }

    // ✅ การจัดการ advancedStats
    if (!advancedRes.ok) {
      console.error('❌ Advanced Stats API error:', advancedRes.status);
    } else {
      const advancedJson = await advancedRes.json();
      console.log('✅ Advanced stats:', advancedJson);
      setAdvancedStats(advancedJson || { medications: [], timeDistribution: [], dailyTrend: [] });
    }

    // ✅ จัดการ medTimeStats
    if (!timeStatsRes.ok) {
      console.error('❌ Time Stats API error:', timeStatsRes.status);
    } else {
      const timeStatsJson = await timeStatsRes.json();
      console.log('✅ Med time stats:', timeStatsJson);
      
      // แปลงเป็น object โดยใช้ MedicationID เป็น key
      const timeStatsMap = timeStatsJson.reduce((acc, med) => {
        acc[med.MedicationID] = med.periods;
        return acc;
      }, {});
      
      setMedTimeStats(timeStatsMap);
    }

  } catch (e) {
    console.error('❌ Fetch history error:', e);
    Alert.alert('ข้อผิดพลาด', `ไม่สามารถโหลดข้อมูลได้: ${e.message}`);
  } finally {
    setLoading(false);
    setRefreshing(false);
  }
}, [lateThreshold]);

  useEffect(() => {
    fetchData(formatLocalDate(fromDate), formatLocalDate(toDate));
  }, [fromDate, toDate, fetchData]);

  const onRefresh = () => {
    setRefreshing(true);
    fetchData(formatLocalDate(fromDate), formatLocalDate(toDate));
  };

  // ===================================
  // 🔍 Search & Filter Logic
  // ===================================

  const filteredRows = useMemo(() => {
  let filtered = [...rows];

  // ✅ Search by medication name
  if (searchQuery.trim()) {
    const query = searchQuery.toLowerCase();
    filtered = filtered.filter(item =>
      item.Name?.toLowerCase().includes(query)
    );
  }

  // ✅ Filter by status (แก้ไขให้รองรับ 'taken', 'late', 'skipped', 'pending')
  if (filterStatus !== 'all') {
    filtered = filtered.filter(item => {
      // กินช้า: สถานะเป็น "กินแล้ว" และ LateMinutes > threshold
      if (filterStatus === 'late') {
        const lateMinutes = parseInt(item.LateMinutes) || 0;
        const thresholdMinutes = parseFloat(lateThreshold) * 60;
        return item.Status === 'กินแล้ว' && 
               item.IsLate === 1 && 
               lateMinutes >= thresholdMinutes;
      }
      
      // กินตรงเวลา: สถานะเป็น "กินแล้ว" และ LateMinutes < threshold หรือ 0
      if (filterStatus === 'taken') {
        const lateMinutes = parseInt(item.LateMinutes) || 0;
        const thresholdMinutes = parseFloat(lateThreshold) * 60;
        return item.Status === 'กินแล้ว' && 
               (item.IsLate === 0 || lateMinutes < thresholdMinutes);
      }
      
      // ข้าม
      if (filterStatus === 'skipped') {
        return item.Status === 'ข้าม';
      }
      
      // ไม่ระบุ (รวม 'รอกิน')
      if (filterStatus === 'pending') {
        return item.Status === 'ไม่ระบุ' || 
               item.Status === 'รอกิน' || 
               !item.Status;
      }
      
      return true;
    });
  }

  // ✅ Sort
  filtered.sort((a, b) => {
    if (sortBy === 'date') {
      const dateA = new Date(`${a.Date} ${a.Time || '00:00:00'}`);
      const dateB = new Date(`${b.Date} ${b.Time || '00:00:00'}`);
      return dateB - dateA; // ใหม่ไปเก่า
    } else if (sortBy === 'name') {
      return (a.Name || '').localeCompare(b.Name || '');
    } else if (sortBy === 'status') {
      // เรียงตามลำดับความสำคัญ: กินช้า > ข้าม > ไม่ระบุ > กินแล้ว
      const statusOrder = { 
        'late': 1, 
        'ข้าม': 2, 
        'ไม่ระบุ': 3, 
        'รอกิน': 3, 
        'กินแล้ว': 4 
      };
      
      const statusA = (a.Status === 'กินแล้ว' && a.IsLate === 1) ? 'late' : a.Status;
      const statusB = (b.Status === 'กินแล้ว' && b.IsLate === 1) ? 'late' : b.Status;
      
      return (statusOrder[statusA] || 999) - (statusOrder[statusB] || 999);
    }
    return 0;
  });

  return filtered;
}, [rows, searchQuery, filterStatus, sortBy, lateThreshold]);

  const filteredMedStats = useMemo(() => {
    if (!searchQuery.trim()) return medStats;
    const query = searchQuery.toLowerCase();
    return medStats.filter(item =>
      item.MedicationName?.toLowerCase().includes(query)
    );
  }, [medStats, searchQuery]);

  // ===================================
  // 📊 Calculated Stats
  // ===================================

  const dayCount = Math.ceil((toDate - fromDate) / (1000 * 60 * 60 * 24)) + 1;
  const avgPerDay = summary.total > 0 ? (summary.total / dayCount).toFixed(1) : 0;
  const complianceRate = summary.total > 0 ? ((summary.taken / summary.total) * 100).toFixed(1) : 0;
  const onTimeRate = summary.taken > 0 ? ((summary.onTime / summary.taken) * 100).toFixed(1) : 0;

  // ===================================
  // 🎯 Toggle Expand Card
  // ===================================

  const toggleExpand = (id) => {
    setExpandedCards(prev => {
      const newSet = new Set(prev);
      if (newSet.has(id)) {
        newSet.delete(id);
      } else {
        newSet.add(id);
      }
      return newSet;
    });
  };

  // ===================================
  // 🎨 Render Functions
  // ===================================

  const renderMedStatItem = ({ item }) => {
    // ✅ ป้องกัน NaN และ Infinity
    const totalScheduled = parseInt(item.TotalScheduled) || 0;
    const totalTaken = parseInt(item.TotalTaken) || 0;
    const totalOnTime = parseInt(item.TotalOnTime) || 0;
    const totalLate = parseInt(item.TotalLate) || 0;
    const totalSkipped = parseInt(item.TotalSkipped) || 0;
    const totalUnknown = parseInt(item.TotalUnknown) || 0;
    const avgLateMinutes = parseFloat(item.AvgLateMinutes) || 0;

    // ✅ คำนวณ percentage อย่างปลอดภัย
    const percent = totalScheduled > 0
      ? parseFloat(((totalTaken / totalScheduled) * 100).toFixed(1))
      : 0;

    const isExpanded = expandedCards.has(item.MedicationID);

    const timePeriods = medTimeStats[item.MedicationID] || [];

    return (
    <TouchableOpacity
      style={styles.medStatCard}
      onPress={() => toggleExpand(item.MedicationID)}
      activeOpacity={0.7}
    >
      <View style={styles.medStatHeader}>
        <View style={styles.medStatHeaderLeft}>
          <Text style={styles.medStatName}>{item.MedicationName}</Text>
          <Text style={styles.medStatSubtext}>
            กิน {totalTaken} จาก {totalScheduled} ครั้ง
          </Text>
        </View>
        <View style={styles.medStatHeaderRight}>
          <Text style={[
            styles.medStatPercent,
            percent >= 80 ? styles.percentHigh :
              percent >= 50 ? styles.percentMid : styles.percentLow
          ]}>
            {percent.toFixed(1)}%
          </Text>
          <Ionicons
            name={isExpanded ? 'chevron-up' : 'chevron-down'}
            size={20}
            color="#999"
          />
        </View>
      </View>

      <View style={styles.progressBarContainer}>
        <View style={[
          styles.progressBar,
          {
            width: `${Math.min(percent, 100)}%`,
            backgroundColor: '#4facfe' // ✅ เปลี่ยนเป็นสีน้ำเงิน
          }
        ]} />
      </View>

      {isExpanded && (
        <>
          {/* ✅ การกินยาตามช่วงเวลา */}
          {timePeriods.length > 0 && (
            <View style={styles.timePeriodSection}>
              <Text style={styles.timePeriodTitle}>⏰ การกินยาตามช่วงเวลา</Text>
              {timePeriods.map((period, index) => (
                <View key={index} style={styles.timePeriodItem}>
                  <View style={styles.timePeriodHeader}>
                    <Text style={styles.timePeriodName}>{period.Period}</Text>
                    <Text style={styles.timePeriodPercent}>{period.AdherenceRate}%</Text>
                  </View>
                  <View style={styles.timePeriodBar}>
                    <View 
                      style={[
                        styles.timePeriodBarFill, 
                        { 
                          width: `${period.AdherenceRate}%`,
                          backgroundColor: '#4facfe' // ✅ เปลี่ยนเป็นสีน้ำเงิน
                        }
                      ]} 
                    />
                  </View>
                  <Text style={styles.timePeriodDetails}>
                    {period.OnTime + period.Late}/{period.Total} ครั้ง
                    {period.AvgLate > 0 && ` • เฉลี่ยช้า ${formatMinutesToTime(period.AvgLate)}`}
                  </Text>
                </View>
              ))}
            </View>
          )}


          {/* ✅ แสดงข้อมูลตาม displayMode */}
          {displayMode === 'count' ? (
            <View style={styles.medStatDetails}>
              <View style={styles.statRow}>
                <View style={styles.statItem}>
                  <Ionicons name="checkmark-circle" size={16} color="#28a745" />
                  <Text style={styles.statLabel}>กินตรงเวลา</Text>
                  <Text style={styles.statValue}>
                    {totalOnTime} ({totalScheduled > 0 ? ((totalOnTime / totalScheduled) * 100).toFixed(1) : 0}%)
                  </Text>
                </View>

                <View style={styles.statItem}>
                  <Ionicons name="time" size={16} color="#ff9800" />
                  <Text style={styles.statLabel}>กินช้า</Text>
                  <Text style={styles.statValue}>
                    {totalLate} ({totalScheduled > 0 ? ((totalLate / totalScheduled) * 100).toFixed(1) : 0}%)
                  </Text>
                </View>
              </View>

              <View style={styles.statRow}>
                <View style={styles.statItem}>
                  <Ionicons name="close-circle" size={16} color="#dc3545" />
                  <Text style={styles.statLabel}>ข้าม</Text>
                  <Text style={styles.statValue}>
                    {totalSkipped} ({totalScheduled > 0 ? ((totalSkipped / totalScheduled) * 100).toFixed(1) : 0}%)
                  </Text>
                </View>

                <View style={styles.statItem}>
                  <Ionicons name="help-circle" size={16} color="#6c757d" />
                  <Text style={styles.statLabel}>ไม่ระบุ</Text>
                  <Text style={styles.statValue}>
                    {totalUnknown} ({totalScheduled > 0 ? ((totalUnknown / totalScheduled) * 100).toFixed(1) : 0}%)
                  </Text>
                </View>
              </View>
            </View>
          ) : (
            <View style={styles.chartViewContainer}>
              <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                <BarChart
                  data={{
                    labels: ['กินตรงเวลา', 'กินช้า', 'ข้าม', 'ไม่ระบุ'],
                    datasets: [{
                      data: [totalOnTime, totalLate, totalSkipped, totalUnknown]
                    }]
                  }}
                  width={Math.max(screenWidth - 80, 320)}
                  height={200}
                  chartConfig={{
                    backgroundColor: '#ffffff',
                    backgroundGradientFrom: '#f8f9fa',
                    backgroundGradientTo: '#ffffff',
                    decimalPlaces: 0,
                    color: (opacity = 1) => `rgba(79, 172, 254, ${opacity})`,
                    labelColor: (opacity = 1) => `rgba(0, 0, 0, ${opacity})`,
                    style: { borderRadius: 12 },
                    propsForLabels: { fontSize: 10 },
                    barPercentage: 0.6
                  }}
                  style={styles.miniChart}
                  fromZero
                  showValuesOnTopOfBars
                />
              </ScrollView>
            </View>
          )}

          {avgLateMinutes > 0 && (
            <View style={styles.avgLateContainer}>
              <Ionicons name="time-outline" size={16} color="#ff9800" />
              <Text style={styles.avgLateText}>
                เฉลี่ยกินช้า: {formatMinutesToTime(avgLateMinutes)}
              </Text>
            </View>
          )}
        </>
      )}
    </TouchableOpacity>
  );
};

  const renderDetailItem = ({ item }) => {
    // ✅ ตรวจสอบ LateMinutes อย่างปลอดภัย
    const lateMinutes = parseInt(item.LateMinutes) || 0;
    const isLate = item.Status === 'กินแล้ว' && item.IsLate === 1 && lateMinutes > 0;
    const isExpanded = expandedCards.has(item.ScheduleID);

    return (
      <TouchableOpacity
        style={styles.detailCard}
        onPress={() => toggleExpand(item.ScheduleID)}
        activeOpacity={0.7}
      >
        <View style={styles.detailHeader}>
          <View style={styles.dateTimeBadge}>
            <Ionicons name="calendar-outline" size={14} color="#666" />
            <Text style={styles.detailDate}>{item.Date}</Text>
            <Text style={styles.detailTime}>{item.Time ? item.Time.slice(0, 5) : '-'}</Text>
          </View>
          <View style={[
            styles.statusBadge,
            { backgroundColor: getStatusColor(item.Status, isLate) }
          ]}>
            <Ionicons
              name={getStatusIcon(item.Status, isLate)}
              size={14}
              color="#fff"
            />
            <Text style={styles.statusText}>
              {item.Status === 'กินแล้ว' && isLate ? 'กินช้า' : item.Status || 'รอกิน'}
            </Text>
          </View>
        </View>

        <Text style={styles.detailMedName}>{item.Name}</Text>

        {!isExpanded ? (
          <View style={styles.detailMetaRow}>
            <View style={styles.detailMeta}>
              <Ionicons name="medical" size={14} color="#666" />
              <Text style={styles.metaText}>
                {item.Dosage ? `${item.Dosage} ${item.DosageType || ''}` : '-'}
              </Text>
            </View>
            <Ionicons name="chevron-down" size={16} color="#999" />
          </View>
        ) : (
          <>
            <View style={styles.detailExpandedContent}>
              <View style={styles.detailMeta}>
                <Ionicons name="medical" size={14} color="#666" />
                <Text style={styles.metaText}>
                  {item.Dosage ? `${item.Dosage} ${item.DosageType || ''}` : '-'} • {item.TypeName || '-'}
                </Text>
              </View>

              {item.ActualTime && (
                <View style={styles.detailMeta}>
                  <Ionicons name="time" size={14} color={isLate ? "#ff9800" : "#28a745"} />
                  <Text style={[styles.metaText, isLate && styles.lateText]}>
                    กินเวลา: {item.ActualTime.slice(0, 5)}
                    {isLate && lateMinutes > 0 && ` (ช้า ${formatMinutesToTime(lateMinutes)})`}
                  </Text>
                </View>
              )}

              {item.SideEffects && (
                <View style={styles.sideEffectBox}>
                  <Ionicons name="warning" size={14} color="#dc3545" />
                  <Text style={styles.sideEffectText}>{item.SideEffects}</Text>
                </View>
              )}
            </View>
            <View style={styles.expandIconContainer}>
              <Ionicons name="chevron-up" size={16} color="#999" />
            </View>
          </>
        )}
      </TouchableOpacity>
    );
  };

  const renderSummaryCard = (icon, label, value, color, sublabel = null) => (
    <View style={[styles.summaryItem, { borderColor: color }]}>
      <Ionicons name={icon} size={28} color={color} />
      <Text style={styles.summaryNumber}>{value}</Text>
      <Text style={styles.summaryLabel}>{label}</Text>
      {sublabel && <Text style={styles.summarySublabel}>{sublabel}</Text>}
    </View>
  );

  // ===================================
  // 🎨 Main Render
  // ===================================

// ฟังก์ชันกรองข้อมูลตาม Filter
const getFilteredChartData = () => {
  let data = [...advancedStats.medications];
  
  // กรองตาม Period
  if (selectedPeriod !== 'all') {
    // (ในกรณีนี้ใช้ข้อมูลจาก medications โดยตรง)
    // หากต้องการกรองตาม timeDistribution ต้องแยกจัดการ
  }
  
  // เลือก Metric ตาม chartMode
  let metric = 'AdherenceRate';
  if (chartMode === 'onTime') metric = 'OnTimeRate';
  else if (chartMode === 'late') metric = 'AvgLateMinutes';
  else if (chartMode === 'compliance') metric = 'ComplianceScore';
  
  // เรียงลำดับและกรอง
  data.sort((a, b) => parseFloat(b[metric]) - parseFloat(a[metric]));
  
  if (statsFilter === 'max') {
    data = data.slice(0, 5); // Top 5
  } else if (statsFilter === 'min') {
    data = data.slice(-5).reverse(); // Bottom 5
  }
  // 'all' และ 'avg' ใช้ข้อมูลทั้งหมด
  
  return data;
};

// ฟังก์ชันสร้างข้อมูลสำหรับ BarChart
const getChartData = () => {
  const filtered = getFilteredChartData();
  
  let labels = filtered.map(m => {
    const name = m.MedicationName || '';
    return name.length > 10 ? name.substring(0, 10) + '...' : name;
  });
  
  let dataValues = filtered.map(m => {
    if (chartMode === 'adherence') return parseFloat(m.AdherenceRate) || 0;
    if (chartMode === 'onTime') return parseFloat(m.OnTimeRate) || 0;
    if (chartMode === 'late') return parseFloat(m.AvgLateMinutes) || 0;
    if (chartMode === 'compliance') return parseFloat(m.ComplianceScore) || 0;
    return 0;
  });
  
  // ถ้าเป็น avg mode ให้คำนวณค่าเฉลี่ย
  if (statsFilter === 'avg' && dataValues.length > 0) {
    const avg = dataValues.reduce((sum, val) => sum + val, 0) / dataValues.length;
    labels = ['ค่าเฉลี่ย'];
    dataValues = [avg];
  }
  
  return {
    labels,
    datasets: [{ data: dataValues }]
  };
};

const screenWidth = Dimensions.get('window').width;

// ...existing code...

const renderAdvancedStats = () => (
  <ScrollView
    refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
    contentContainerStyle={styles.scrollContent}
  >
    {/* Chart Mode Selector */}
    <View style={styles.chartModeContainer}>
      <Text style={styles.sectionTitle}>📊 เลือกประเภทกราฟ</Text>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.chartModeScroll}>
        <TouchableOpacity
          style={[styles.chartModeBtn, chartMode === 'adherence' && styles.chartModeBtnActive]}
          onPress={() => setChartMode('adherence')}
        >
          <Ionicons name="analytics" size={18} color={chartMode === 'adherence' ? '#fff' : '#4facfe'} />
          <Text style={[styles.chartModeBtnText, chartMode === 'adherence' && styles.chartModeBtnTextActive]}>
            อัตราการกิน
          </Text>
        </TouchableOpacity>
        
        <TouchableOpacity
          style={[styles.chartModeBtn, chartMode === 'onTime' && styles.chartModeBtnActive]}
          onPress={() => setChartMode('onTime')}
        >
          <Ionicons name="checkmark-circle" size={18} color={chartMode === 'onTime' ? '#fff' : '#28a745'} />
          <Text style={[styles.chartModeBtnText, chartMode === 'onTime' && styles.chartModeBtnTextActive]}>
            กินตรงเวลา
          </Text>
        </TouchableOpacity>
        
        <TouchableOpacity
          style={[styles.chartModeBtn, chartMode === 'late' && styles.chartModeBtnActive]}
          onPress={() => setChartMode('late')}
        >
          <Ionicons name="time" size={18} color={chartMode === 'late' ? '#fff' : '#ff9800'} />
          <Text style={[styles.chartModeBtnText, chartMode === 'late' && styles.chartModeBtnTextActive]}>
            เฉลี่ยกินช้า
          </Text>
        </TouchableOpacity>
        
        <TouchableOpacity
          style={[styles.chartModeBtn, chartMode === 'compliance' && styles.chartModeBtnActive]}
          onPress={() => setChartMode('compliance')}
        >
          <Ionicons name="trophy" size={18} color={chartMode === 'compliance' ? '#fff' : '#ffc107'} />
          <Text style={[styles.chartModeBtnText, chartMode === 'compliance' && styles.chartModeBtnTextActive]}>
            คะแนนปฏิบัติตาม
          </Text>
        </TouchableOpacity>
      </ScrollView>
    </View>

    {/* Filter Selector */}
    <View style={styles.filterSelectorContainer}>
      <Text style={styles.sectionTitle}>🔍 แสดงข้อมูล</Text>
      <View style={styles.filterButtons}>
        {['all', 'max', 'min', 'avg'].map(filter => (
          <TouchableOpacity
            key={filter}
            style={[styles.filterBtn, statsFilter === filter && styles.filterBtnActive]}
            onPress={() => setStatsFilter(filter)}
          >
            <Text style={[styles.filterBtnText, statsFilter === filter && styles.filterBtnTextActive]}>
              {filter === 'all' ? 'ทั้งหมด' : filter === 'max' ? 'สูงสุด 5' : filter === 'min' ? 'ต่ำสุด 5' : 'ค่าเฉลี่ย'}
            </Text>
          </TouchableOpacity>
        ))}
      </View>
    </View>

    {/* Bar Chart */}
    <View style={styles.chartContainer}>
      <View style={styles.chartHeader}>
        <Text style={styles.chartTitle}>
          {chartMode === 'adherence' ? '📈 อัตราการกินยา (%)' :
           chartMode === 'onTime' ? '✅ อัตรากินตรงเวลา (%)' :
           chartMode === 'late' ? '⏰ เฉลี่ยกินช้า (นาที)' :
           '🏆 คะแนนปฏิบัติตาม (0-100)'}
        </Text>
        <Text style={styles.chartSubtitle}>
          {statsFilter === 'all' ? 'แสดงทั้งหมด' :
           statsFilter === 'max' ? 'แสดง Top 5' :
           statsFilter === 'min' ? 'แสดง Bottom 5' :
           'ค่าเฉลี่ยทั้งหมด'}
        </Text>
      </View>
      
      {getChartData().labels.length > 0 ? (
        <ScrollView horizontal showsHorizontalScrollIndicator={false}>
          <BarChart
            data={getChartData()}
            width={Math.max(screenWidth - 40, getChartData().labels.length * 80)}
            height={280}
            yAxisSuffix={chartMode === 'late' ? ' น.' : '%'}
            chartConfig={{
              backgroundColor: '#ffffff',
              backgroundGradientFrom: '#f8f9fa',
              backgroundGradientTo: '#ffffff',
              decimalPlaces: chartMode === 'late' ? 0 : 1,
              color: (opacity = 1) => {
                if (chartMode === 'adherence') return `rgba(79, 172, 254, ${opacity})`;
                if (chartMode === 'onTime') return `rgba(40, 167, 69, ${opacity})`;
                if (chartMode === 'late') return `rgba(255, 152, 0, ${opacity})`;
                return `rgba(255, 193, 7, ${opacity})`;
              },
              labelColor: (opacity = 1) => `rgba(0, 0, 0, ${opacity})`,
              style: { borderRadius: 16 },
              propsForLabels: { fontSize: 11 },
              barPercentage: 0.7
            }}
            style={styles.chart}
            fromZero
            showValuesOnTopOfBars
          />
        </ScrollView>
      ) : (
        <View style={styles.emptyChart}>
          <Ionicons name="bar-chart-outline" size={48} color="#ccc" />
          <Text style={styles.emptyChartText}>ไม่มีข้อมูลในช่วงนี้</Text>
        </View>
      )}
    </View>

    {/* Time Distribution */}
    <View style={styles.timeDistributionCard}>
      <Text style={styles.sectionTitle}>⏰ การกินยาตามช่วงเวลา</Text>
      {advancedStats.timeDistribution.map((period, index) => (
        <View key={index} style={styles.periodItem}>
          <View style={styles.periodHeader}>
            <Text style={styles.periodName}>{period.Period}</Text>
            <Text style={styles.periodPercent}>{period.AdherenceRate}%</Text>
          </View>
          <View style={styles.periodBar}>
            <View 
              style={[
                styles.periodBarFill, 
                { 
                  width: `${period.AdherenceRate}%`,
                  backgroundColor: parseFloat(period.AdherenceRate) >= 80 ? '#28a745' : 
                                 parseFloat(period.AdherenceRate) >= 60 ? '#ffc107' : '#dc3545'
                }
              ]} 
            />
          </View>
          <Text style={styles.periodDetails}>
            กิน {period.Taken}/{period.Total} ครั้ง
            {period.AvgLate > 0 && ` • เฉลี่ยช้า ${formatMinutesToTime(period.AvgLate)}`}
          </Text>
        </View>
      ))}
    </View>

    {/* Detailed Stats Table */}
    <View style={styles.detailedStatsCard}>
      <Text style={styles.sectionTitle}>📋 ตารางสถิติละเอียด</Text>
      {getFilteredChartData().map((med, index) => (
        <View key={med.MedicationID} style={styles.statRow}>
          <View style={styles.statRank}>
            <Text style={styles.statRankText}>#{index + 1}</Text>
          </View>
          <View style={styles.statContent}>
            <Text style={styles.statMedName}>{med.MedicationName}</Text>
            <View style={styles.statMetrics}>
              <View style={styles.statMetric}>
                <Text style={styles.statMetricLabel}>อัตรากิน</Text>
                <Text style={[
                  styles.statMetricValue,
                  { color: parseFloat(med.AdherenceRate) >= 80 ? '#28a745' : '#dc3545' }
                ]}>
                  {med.AdherenceRate}%
                </Text>
              </View>
              <View style={styles.statMetric}>
                <Text style={styles.statMetricLabel}>ตรงเวลา</Text>
                <Text style={styles.statMetricValue}>{med.OnTimeRate}%</Text>
              </View>
              <View style={styles.statMetric}>
                <Text style={styles.statMetricLabel}>คะแนน</Text>
                <Text style={[
                  styles.statMetricValue,
                  { 
                    color: parseFloat(med.ComplianceScore) >= 80 ? '#28a745' : 
                           parseFloat(med.ComplianceScore) >= 60 ? '#ffc107' : '#dc3545'
                  }
                ]}>
                  {med.ComplianceScore}
                </Text>
              </View>
            </View>
            {med.AvgLateMinutes > 0 && (
              <Text style={styles.statLateInfo}>
                ⏰ เฉลี่ยช้า: {formatMinutesToTime(med.AvgLateMinutes)} 
                (Min: {formatMinutesToTime(med.MinLateMinutes)}, Max: {formatMinutesToTime(med.MaxLateMinutes)})
              </Text>
            )}
            {med.SideEffectsCount > 0 && (
              <Text style={styles.statSideEffects}>
                ⚠️ มีผลข้างเคียง {med.SideEffectsCount} ครั้ง
              </Text>
            )}
          </View>
        </View>
      ))}
    </View>
  </ScrollView>
);

// ...existing code...
  return (
    <View style={styles.container}>
      {/* ===== Header ===== */}
      <LinearGradient colors={['#4facfe', '#00f2fe']} style={styles.header}>
        <Text style={styles.title}>📊 ประวัติการกินยา</Text>

        {/* Date Navigation */}
        <View style={styles.dateRow}>
          <TouchableOpacity
            onPress={() => setFromDate(d => { const n = new Date(d); n.setDate(n.getDate() - 1); return n; })}
            style={styles.navBtn}
          >
            <Ionicons name="chevron-back" size={24} color="#fff" />
          </TouchableOpacity>

          <TouchableOpacity onPress={() => setShowPicker('from')} style={styles.dateBtn}>
            <Ionicons name="calendar" size={16} color="#fff" />
            <Text style={styles.dateText}>{displayDate(fromDate)}</Text>
          </TouchableOpacity>

          <Text style={styles.dateSeparator}>—</Text>

          <TouchableOpacity onPress={() => setShowPicker('to')} style={styles.dateBtn}>
            <Ionicons name="calendar" size={16} color="#fff" />
            <Text style={styles.dateText}>{displayDate(toDate)}</Text>
          </TouchableOpacity>

          <TouchableOpacity
            onPress={() => setToDate(d => { const n = new Date(d); n.setDate(n.getDate() + 1); return n; })}
            style={styles.navBtn}
          >
            <Ionicons name="chevron-forward" size={24} color="#fff" />
          </TouchableOpacity>
        </View>

        {/* Date Info */}
        <View style={styles.dateInfoBox}>
          <Text style={styles.dateInfoText}>
            📅 {dayCount} วัน • {summary.total} ครั้ง ({avgPerDay} ครั้ง/วัน) • อัตราปฏิบัติตาม {complianceRate}%
          </Text>
        </View>

        {/* Quick Date Presets */}
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.presetsScroll}>
          {datePresets.map(preset => (
            <TouchableOpacity
              key={preset.days}
              style={styles.presetBtn}
              onPress={() => applyDatePreset(preset.days)}
            >
              <Text style={styles.presetBtnText}>{preset.label}</Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
      </LinearGradient>

      {/* ===== View Mode Tabs ===== */}
<View style={styles.tabContainer}>
  <TouchableOpacity
    style={[styles.tab, viewMode === 'summary' && styles.tabActive]}
    onPress={() => setViewMode('summary')}
  >
    <Ionicons name="stats-chart" size={20} color={viewMode === 'summary' ? '#4facfe' : '#999'} />
    <Text style={[styles.tabText, viewMode === 'summary' && styles.tabTextActive]}>สรุป</Text>
  </TouchableOpacity>


  <TouchableOpacity
    style={[styles.tab, viewMode === 'byMedication' && styles.tabActive]}
    onPress={() => setViewMode('byMedication')}
  >
    <Ionicons name="medical" size={20} color={viewMode === 'byMedication' ? '#4facfe' : '#999'} />
    <Text style={[styles.tabText, viewMode === 'byMedication' && styles.tabTextActive]}>แยกตามยา</Text>
  </TouchableOpacity>

  <TouchableOpacity
    style={[styles.tab, viewMode === 'details' && styles.tabActive]}
    onPress={() => setViewMode('details')}
  >
    <Ionicons name="list" size={20} color={viewMode === 'details' ? '#4facfe' : '#999'} />
    <Text style={[styles.tabText, viewMode === 'details' && styles.tabTextActive]}>รายละเอียด</Text>
  </TouchableOpacity>
</View>

      {/* ===== Loading State ===== */}
      {loading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#4facfe" />
          <Text style={styles.loadingText}>กำลังโหลด...</Text>
        </View>
      ) : (
        <>
          {/* ===== SUMMARY VIEW ===== */}
          {viewMode === 'summary' && (
  <ScrollView
    refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
    contentContainerStyle={styles.scrollContent}
  >
    {/* Late Threshold Filter - แยก Input จาก Apply */}
    <View style={styles.filterCard}>
      <View style={styles.filterHeader}>
        <Ionicons name="time-outline" size={20} color="#4facfe" />
        <Text style={styles.filterLabel}>เกณฑ์กินช้า (ชั่วโมง)</Text>
      </View>
      
      <View style={styles.thresholdRow}>
        <View style={styles.thresholdInputWrapper}>
          <TextInput
            style={styles.thresholdInput}
            value={tempThreshold}
            onChangeText={(text) => {
              // อนุญาตเฉพาะตัวเลขและจุดทศนิยม
              if (/^\d*\.?\d*$/.test(text) || text === '') {
                setTempThreshold(text);
              }
            }}
            keyboardType="decimal-pad"
            placeholder="1.0"
            maxLength={5}
          />
          <Text style={styles.thresholdUnit}>ชั่วโมง</Text>
        </View>
        
        {/* ✅ ปุ่ม Apply */}
        <TouchableOpacity
          style={[
            styles.applyBtn,
            tempThreshold === lateThreshold && styles.applyBtnDisabled
          ]}
          onPress={() => {
            if (tempThreshold && parseFloat(tempThreshold) > 0) {
              setLateThreshold(tempThreshold);
            } else {
              Alert.alert('ข้อผิดพลาด', 'กรุณากรอกค่ามากกว่า 0');
            }
          }}
          disabled={tempThreshold === lateThreshold}
        >
          <Ionicons 
            name="checkmark-circle" 
            size={18} 
            color={tempThreshold === lateThreshold ? '#ccc' : '#fff'} 
          />
          <Text style={[
            styles.applyBtnText,
            tempThreshold === lateThreshold && styles.applyBtnTextDisabled
          ]}>
            ใช้งาน
          </Text>
        </TouchableOpacity>
      </View>

      {/* Quick Presets */}
      <View style={styles.thresholdButtons}>
        {['0.5', '1', '2', '3'].map(hr => (
          <TouchableOpacity
            key={hr}
            style={[
              styles.thresholdBtn, 
              lateThreshold === hr && styles.thresholdBtnActive
            ]}
            onPress={() => {
              setTempThreshold(hr);
              setLateThreshold(hr);
            }}
          >
            <Text style={[
              styles.thresholdBtnText, 
              lateThreshold === hr && styles.thresholdBtnTextActive
            ]}>
              {parseFloat(hr) < 1 ? `${parseFloat(hr) * 60} นาที` : `${hr} ชม.`}
            </Text>
          </TouchableOpacity>
        ))}
      </View>
    </View>

    {/* Summary Card */}
    <View style={styles.summaryCard}>
      <View style={styles.summaryCardHeader}>
        <Text style={styles.summaryTitle}>📈 สรุปภาพรวม</Text>
        <Text style={styles.summaryPeriod}>
          {displayDate(fromDate)} — {displayDate(toDate)}
        </Text>
      </View>

      {/* Stats Grid */}
      <View style={styles.summaryGrid}>
        {renderSummaryCard('albums', 'รายการทั้งหมด', summary.total || 0, '#4facfe')}
        {renderSummaryCard('checkmark-circle', 'กินตรงเวลา', summary.onTime || 0, '#28a745', `${onTimeRate}%`)}
        {renderSummaryCard('time', 'กินช้า', summary.late || 0, '#ff9800')}
        {renderSummaryCard('close-circle', 'ข้าม', summary.skipped || 0, '#dc3545')}
        {renderSummaryCard('help-circle', 'ไม่ระบุ', summary.unknown || 0, '#6c757d')}
      </View>

      {/* Average Late Time */}
      {summary.avgLateMinutes > 0 && (
        <View style={styles.avgLateCard}>
          <Ionicons name="time-outline" size={24} color="#ff9800" />
          <View style={styles.avgLateContent}>
            <Text style={styles.avgLateTitle}>⏱️ เฉลี่ยกินช้า</Text>
            <Text style={styles.avgLateValue}>
              {formatMinutesToTime(summary.avgLateMinutes)}
            </Text>
          </View>
        </View>
      )}

      {/* Compliance Rate */}
      <View style={styles.complianceCard}>
        <View style={styles.complianceHeader}>
          <Text style={styles.complianceTitle}>🎯 อัตราการปฏิบัติตาม</Text>
          <Text style={styles.compliancePercent}>{complianceRate}%</Text>
        </View>
        <View style={styles.complianceBarBg}>
          <View
            style={[
              styles.complianceBarFill,
              {
                width: `${complianceRate}%`,
                backgroundColor: complianceRate >= 80 ? '#28a745' :
                  complianceRate >= 60 ? '#ffc107' : '#dc3545'
              }
            ]}
          />
        </View>
        <Text style={styles.complianceSubtext}>
          กิน {summary.taken} จาก {summary.total} ครั้ง
        </Text>
      </View>
    </View>

    {/* ✅ เพิ่มกราฟแท่งอัตราการกินยา */}
    <View style={styles.summaryChartCard}>
      <View style={styles.summaryChartHeader}>
        <Text style={styles.summaryChartTitle}>📊 อัตราการกินยาแต่ละตัว</Text>
        <View style={styles.summaryChartModeToggle}>
          <TouchableOpacity
            style={[
              styles.chartToggleBtn,
              summaryChartMode === 'adherence' && styles.chartToggleBtnActive
            ]}
            onPress={() => setSummaryChartMode('adherence')}
          >
            <Text style={[
              styles.chartToggleBtnText,
              summaryChartMode === 'adherence' && styles.chartToggleBtnTextActive
            ]}>
              อัตราการกิน
            </Text>
          </TouchableOpacity>
          
        </View>
      </View>

      {advancedStats.medications && advancedStats.medications.length > 0 ? (
        <ScrollView horizontal showsHorizontalScrollIndicator={false}>
          <BarChart
            data={{
              labels: advancedStats.medications.map(m => {
                const name = m.MedicationName || '';
                return name.length > 10 ? name.substring(0, 10) + '...' : name;
              }),
              datasets: [{
                data: advancedStats.medications.map(m =>
                  summaryChartMode === 'adherence'
                    ? parseFloat(m.AdherenceRate) || 0
                    : parseFloat(m.ComplianceScore) || 0
                )
              }]
            }}
            width={Math.max(screenWidth - 40, advancedStats.medications.length * 80)}
            height={240}
            yAxisSuffix="%"
            chartConfig={{
              backgroundColor: '#ffffff',
              backgroundGradientFrom: '#f8f9fa',
              backgroundGradientTo: '#ffffff',
              decimalPlaces: 1,
              color: (opacity = 1) => `rgba(79, 172, 254, ${opacity})`,
              labelColor: (opacity = 1) => `rgba(0, 0, 0, ${opacity})`,
              style: { borderRadius: 16 },
              propsForLabels: { fontSize: 11 },
              barPercentage: 0.7
            }}
            style={styles.chart}
            fromZero
            showValuesOnTopOfBars
          />
        </ScrollView>
      ) : (
        <View style={styles.emptyChart}>
          <Ionicons name="bar-chart-outline" size={48} color="#ccc" />
          <Text style={styles.emptyChartText}>ไม่มีข้อมูลยาในช่วงนี้</Text>
        </View>
      )}
    </View>
  </ScrollView>
)}

          {/*Conditional Render */}
    {viewMode === 'advanced' && renderAdvancedStats()}

          {/* ===== BY MEDICATION VIEW ===== */}
          {viewMode === 'byMedication' && (
            <>
              {/* Search & Display Mode */}
              <View style={styles.controlsContainer}>
                <View style={styles.searchContainer}>
                  <Ionicons name="search" size={20} color="#999" />
                  <TextInput
                    style={styles.searchInput}
                    placeholder="ค้นหายา..."
                    value={searchQuery}
                    onChangeText={setSearchQuery}
                  />
                  {searchQuery.length > 0 && (
                    <TouchableOpacity onPress={() => setSearchQuery('')}>
                      <Ionicons name="close-circle" size={20} color="#999" />
                    </TouchableOpacity>
                  )}
                </View>

                <View style={styles.displayModeContainer}>
                  <TouchableOpacity
              style={[
                styles.displayToggleBtn,
                displayMode === 'count' && styles.displayToggleBtnActive
              ]}
              onPress={() => setDisplayMode('count')}
            >
              <Ionicons name="calculator" size={14} color={displayMode === 'count' ? '#fff' : '#666'} />
              <Text style={[
                styles.displayToggleBtnText,
                displayMode === 'count' && styles.displayToggleBtnTextActive
              ]}>
                จำนวน/%
              </Text>
            </TouchableOpacity>

                  <TouchableOpacity
              style={[
                styles.displayToggleBtn,
                displayMode === 'chart' && styles.displayToggleBtnActive
              ]}
              onPress={() => setDisplayMode('chart')}
            >
              <Ionicons name="bar-chart" size={14} color={displayMode === 'chart' ? '#fff' : '#666'} />
              <Text style={[
                styles.displayToggleBtnText,
                displayMode === 'chart' && styles.displayToggleBtnTextActive
              ]}>
                กราฟแท่ง
              </Text>
            </TouchableOpacity>
                </View>
              </View>

              <FlatList
                data={filteredMedStats}
                keyExtractor={(i) => String(i.MedicationID)}
                renderItem={renderMedStatItem}
                refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
                contentContainerStyle={styles.listContent}
                ListEmptyComponent={
                  <View style={styles.emptyContainer}>
                    <Ionicons name="medical-outline" size={64} color="#ccc" />
                    <Text style={styles.emptyText}>
                      {searchQuery ? 'ไม่พบยาที่ค้นหา' : 'ไม่พบข้อมูลยาในช่วงนี้'}
                    </Text>
                  </View>
                }
              />
            </>
          )}

          {/* ===== DETAILS VIEW ===== */}
          {viewMode === 'details' && (
            <>
              {/* Search & Filters */}
              <View style={styles.controlsContainer}>
                <View style={styles.searchContainer}>
                  <Ionicons name="search" size={20} color="#999" />
                  <TextInput
                    style={styles.searchInput}
                    placeholder="ค้นหายา..."
                    value={searchQuery}
                    onChangeText={setSearchQuery}
                  />
                  {searchQuery.length > 0 && (
                    <TouchableOpacity onPress={() => setSearchQuery('')}>
                      <Ionicons name="close-circle" size={20} color="#999" />
                    </TouchableOpacity>
                  )}
                </View>
              </View>

              {/* Status Filter */}
              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={styles.statusFilterScroll}
                style={{ flexGrow: 0 }}
              >
                <TouchableOpacity
                  style={[
                    styles.statusFilterBtn,
                    filterStatus === 'all' && styles.statusFilterBtnActive
                  ]}
                  onPress={() => setFilterStatus('all')}
                >
                  <Ionicons
                    name="list"
                    size={16}
                    color={filterStatus === 'all' ? '#fff' : '#666'}
                  />
                  <Text
                    style={[
                      styles.statusFilterText,
                      filterStatus === 'all' && styles.statusFilterTextActive
                    ]}
                    numberOfLines={1}
                  >
                    ทั้งหมด
                  </Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={[
                    styles.statusFilterBtn,
                    filterStatus === 'taken' && styles.statusFilterBtnActive
                  ]}
                  onPress={() => setFilterStatus('taken')}
                >
                  <Ionicons
                    name="checkmark-circle"
                    size={16}
                    color={filterStatus === 'taken' ? '#fff' : '#28a745'}
                  />
                  <Text
                    style={[
                      styles.statusFilterText,
                      filterStatus === 'taken' && styles.statusFilterTextActive
                    ]}
                    numberOfLines={1}
                  >
                    กินแล้ว
                  </Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={[
                    styles.statusFilterBtn,
                    filterStatus === 'late' && styles.statusFilterBtnActive
                  ]}
                  onPress={() => setFilterStatus('late')}
                >
                  <Ionicons
                    name="time"
                    size={16}
                    color={filterStatus === 'late' ? '#fff' : '#ffc107'}
                  />
                  <Text
                    style={[
                      styles.statusFilterText,
                      filterStatus === 'late' && styles.statusFilterTextActive
                    ]}
                    numberOfLines={1}
                  >
                    กินช้า
                  </Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={[
                    styles.statusFilterBtn,
                    filterStatus === 'skipped' && styles.statusFilterBtnActive
                  ]}
                  onPress={() => setFilterStatus('skipped')}
                >
                  <Ionicons
                    name="close-circle"
                    size={16}
                    color={filterStatus === 'skipped' ? '#fff' : '#dc3545'}
                  />
                  <Text
                    style={[
                      styles.statusFilterText,
                      filterStatus === 'skipped' && styles.statusFilterTextActive
                    ]}
                    numberOfLines={1}
                  >
                    ข้าม
                  </Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={[
                    styles.statusFilterBtn,
                    filterStatus === 'pending' && styles.statusFilterBtnActive
                  ]}
                  onPress={() => setFilterStatus('pending')}
                >
                  <Ionicons
                    name="hourglass"
                    size={16}
                    color={filterStatus === 'pending' ? '#fff' : '#999'}
                  />
                  <Text
                    style={[
                      styles.statusFilterText,
                      filterStatus === 'pending' && styles.statusFilterTextActive
                    ]}
                    numberOfLines={1}
                  >
                    ไม่ระบุ
                  </Text>
                </TouchableOpacity>
              </ScrollView>

              {/* Sort Options */}
              <View style={styles.sortContainer}>
                <Text style={styles.sortLabel}>เรียงตาม:</Text>
                <TouchableOpacity
                  style={[styles.sortBtn, sortBy === 'date' && styles.sortBtnActive]}
                  onPress={() => setSortBy('date')}
                >
                  <Ionicons name="calendar" size={14} color={sortBy === 'date' ? '#fff' : '#666'} />
                  <Text style={[styles.sortBtnText, sortBy === 'date' && styles.sortBtnTextActive]}>วันที่</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={[styles.sortBtn, sortBy === 'name' && styles.sortBtnActive]}
                  onPress={() => setSortBy('name')}
                >
                  <Ionicons name="medical" size={14} color={sortBy === 'name' ? '#fff' : '#666'} />
                  <Text style={[styles.sortBtnText, sortBy === 'name' && styles.sortBtnTextActive]}>ชื่อยา</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={[styles.sortBtn, sortBy === 'status' && styles.sortBtnActive]}
                  onPress={() => setSortBy('status')}
                >
                  <Ionicons name="flag" size={14} color={sortBy === 'status' ? '#fff' : '#666'} />
                  <Text style={[styles.sortBtnText, sortBy === 'status' && styles.sortBtnTextActive]}>สถานะ</Text>
                </TouchableOpacity>
              </View>

              {/* Results Count */}
              {(searchQuery || filterStatus !== 'all') && (
                <View style={styles.resultsCountContainer}>
                  <Text style={styles.resultsCountText}>
                    แสดง {filteredRows.length} รายการจากทั้งหมด {rows.length} รายการ
                  </Text>
                </View>
              )}

              <FlatList
                data={filteredRows}
                keyExtractor={(i) => String(i.ScheduleID || `${i.MedicationID}_${i.Date}_${i.Time}`)}
                renderItem={renderDetailItem}
                refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
                contentContainerStyle={styles.listContent}
                ListEmptyComponent={
                  <View style={styles.emptyContainer}>
                    <Ionicons name="document-text-outline" size={64} color="#ccc" />
                    <Text style={styles.emptyText}>
                      {searchQuery || filterStatus !== 'all'
                        ? 'ไม่พบรายการที่ตรงกับเงื่อนไข'
                        : 'ไม่พบประวัติในช่วงนี้'}
                    </Text>
                  </View>
                }
              />
            </>
          )}
        </>
      )}

      {/* ===== Date Picker ===== */}
      {showPicker && (
        <DateTimePicker
          value={showPicker === 'from' ? fromDate : toDate}
          mode="date"
          display="default"
          onChange={(e, date) => {
            setShowPicker(null);
            if (!date) return;
            if (showPicker === 'from') {
              if (date > toDate) {
                Alert.alert('ข้อผิดพลาด', 'วันที่เริ่มต้นต้องไม่เกินวันที่สิ้นสุด');
                return;
              }
              setFromDate(date);
            } else {
              if (date < fromDate) {
                Alert.alert('ข้อผิดพลาด', 'วันที่สิ้นสุดต้องไม่น้อยกว่าวันที่เริ่มต้น');
                return;
              }
              setToDate(date);
            }
          }}
        />
      )}
    </View>
  );
};

export default HistoryScreen;

// ===================================
// 🎨 Styles
// ===================================

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8f9fa'
  },

  // ===== Header Styles =====
  header: {
    padding: 20,
    paddingTop: 16,
    borderBottomLeftRadius: 24,
    borderBottomRightRadius: 24,
    elevation: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#fff',
    marginBottom: 16,
    letterSpacing: 0.5
  },
  dateRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12
  },
  dateBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    padding: 10,
    paddingHorizontal: 16,
    backgroundColor: 'rgba(255,255,255,0.2)',
    borderRadius: 20,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.3)'
  },
  dateText: {
    color: '#fff',
    fontWeight: '600',
    fontSize: 14
  },
  navBtn: {
    padding: 8,
    marginHorizontal: 4
  },
  dateSeparator: {
    color: '#fff',
    marginHorizontal: 8,
    fontSize: 16
  },
  dateInfoBox: {
    marginTop: 8,
    backgroundColor: 'rgba(255,255,255,0.15)',
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 12,
    alignSelf: 'center'
  },
  dateInfoText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '600'
  },
  presetsScroll: {
    marginTop: 12
  },
  presetBtn: {
    paddingVertical: 6,
    paddingHorizontal: 12,
    backgroundColor: 'rgba(255,255,255,0.2)',
    borderRadius: 16,
    marginRight: 8,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.3)'
  },
  presetBtnText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '600'
  },

  // ===== Tab Styles =====
  tabContainer: {
    flexDirection: 'row',
    backgroundColor: '#fff',
    marginTop: 12,
    marginHorizontal: 12,
    borderRadius: 12,
    padding: 4,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2
  },
  tab: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 12,
    borderRadius: 8
  },
  tabActive: {
    backgroundColor: '#e3f2fd'
  },
  tabText: {
    color: '#999',
    fontSize: 14,
    fontWeight: '600'
  },
  tabTextActive: {
    color: '#4facfe'
  },

  // ===== Loading Styles =====
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 40
  },
  loadingText: {
    marginTop: 12,
    color: '#666',
    fontSize: 14
  },

  // ===== Content Styles =====
  scrollContent: {
    padding: 12,
    paddingBottom: 24
  },

  // ===== Filter Card Styles =====
  filterCard: {
    backgroundColor: '#fff',
    marginHorizontal: 12,
    marginTop: 12,
    padding: 16,
    borderRadius: 12,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2
  },
  filterHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 12
  },
  filterLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#333'
  },
  thresholdBtnActive: {
    backgroundColor: '#4facfe',
    borderColor: '#4facfe'
  },
  thresholdBtnTextActive: {
    color: '#fff'
  },

  // ===== Summary Card Styles =====
  summaryCard: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 20,
    marginTop: 12,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 3
  },
  summaryCardHeader: {
    marginBottom: 16
  },
  summaryTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 4
  },
  summaryPeriod: {
    fontSize: 13,
    color: '#666'
  },
  summaryGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
    marginBottom: 16
  },
  summaryItem: {
    flex: 1,
    minWidth: '45%',
    backgroundColor: '#f8f9fa',
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
    borderWidth: 2,
    borderColor: 'transparent'
  },
  summaryNumber: {
    fontSize: 32,
    fontWeight: 'bold',
    color: '#333',
    marginTop: 8
  },
  summaryLabel: {
    fontSize: 12,
    color: '#666',
    marginTop: 4,
    textAlign: 'center'
  },
  summarySublabel: {
    fontSize: 10,
    color: '#999',
    marginTop: 2
  },
  avgLateCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginTop: 16,
    padding: 14,
    backgroundColor: '#fff3cd',
    borderRadius: 12,
    borderLeftWidth: 4,
    borderLeftColor: '#ff9800'
  },
  avgLateContent: {
    flex: 1
  },
  avgLateTitle: {
    fontSize: 12,
    color: '#666',
    marginBottom: 4
  },
  avgLateValue: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#ff9800'
  },
  complianceCard: {
    marginTop: 16,
    padding: 16,
    backgroundColor: '#f8f9fa',
    borderRadius: 12
  },
  complianceHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12
  },
  complianceTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#333'
  },
  compliancePercent: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#4facfe'
  },
  complianceBarBg: {
    height: 12,
    backgroundColor: '#e0e0e0',
    borderRadius: 6,
    overflow: 'hidden',
    marginBottom: 8
  },
  complianceBarFill: {
    height: '100%',
    borderRadius: 6
  },
  complianceSubtext: {
    fontSize: 12,
    color: '#666',
    textAlign: 'center'
  },

  // ===== Controls Styles =====
  controlsContainer: {
    padding: 12,
    paddingBottom: 0
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 10,
    gap: 8,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    marginBottom: 12
  },
  searchInput: {
    flex: 1,
    fontSize: 14,
    color: '#333'
  },
  displayModeContainer: {
    flexDirection: 'row',
    gap: 8
  },
  displayModeBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 10,
    borderRadius: 8,
    backgroundColor: '#fff',
    borderWidth: 2,
    borderColor: '#e1e8ed',
    elevation: 1,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 1
  },
  displayModeBtnActive: {
    backgroundColor: '#4facfe',
    borderColor: '#4facfe'
  },
  displayModeBtnText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#666'
  },
  displayModeBtnTextActive: {
    color: '#fff'
  },

  // ===== Status Filter Styles =====
  statusFilterScroll: {
    flexGrow: 0,
    flexShrink: 0,
    paddingHorizontal: 12,
    marginBottom: 12,
    maxHeight: 50
  },
  statusFilterBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 8,
    paddingHorizontal: 16,
    minWidth: 100,
    maxWidth: 120,
    backgroundColor: '#fff',
    borderRadius: 20,
    marginRight: 8,
    borderWidth: 1,
    borderColor: '#e1e8ed',
    elevation: 1,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 1
  },
  statusFilterBtnActive: {
    backgroundColor: '#4facfe',
    borderColor: '#4facfe',
    elevation: 2
  },
  statusFilterText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#666',
    textAlign: 'center',
    flexShrink: 1
  },
  statusFilterTextActive: {
    color: '#fff'
  },

  // ===== Sort Styles =====
  sortContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    marginBottom: 12,
    gap: 8
  },
  sortLabel: {
    fontSize: 13,
    color: '#666',
    fontWeight: '600'
  },
  sortBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingVertical: 6,
    paddingHorizontal: 12,
    backgroundColor: '#fff',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#e1e8ed'
  },
  sortBtnActive: {
    backgroundColor: '#4facfe',
    borderColor: '#4facfe'
  },
  sortBtnText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#666'
  },
  sortBtnTextActive: {
    color: '#fff'
  },

  // ===== Results Count =====
  resultsCountContainer: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    backgroundColor: '#f8f9fa',
    marginHorizontal: 12,
    borderRadius: 8,
    marginBottom: 12
  },
  resultsCountText: {
    fontSize: 12,
    color: '#666',
    textAlign: 'center'
  },

  // ===== List Styles =====
  listContent: {
    padding: 12,
    paddingBottom: 24
  },

  // ===== Medication Stats Card =====
  medStatCard: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2
  },
  medStatHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12
  },
  medStatHeaderLeft: {
    flex: 1,
    marginRight: 12
  },
  medStatHeaderRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8
  },
  medStatName: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 2
  },
  medStatSubtext: {
    fontSize: 12,
    color: '#999'
  },
  medStatPercent: {
    fontSize: 24,
    fontWeight: 'bold'
  },
  percentHigh: {
    color: '#28a745'
  },
  percentMid: {
    color: '#ffc107'
  },
  percentLow: {
    color: '#dc3545'
  },
  progressBarContainer: {
    height: 8,
    backgroundColor: '#e0e0e0',
    borderRadius: 4,
    overflow: 'hidden',
    marginBottom: 12
  },
  progressBar: {
    height: '100%',
    borderRadius: 4
  },
  medStatDetails: {
    paddingTop: 12,
    borderTopWidth: 1,
    borderColor: '#f0f0f0'
  },
  statRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginBottom: 12
  },
  statItem: {
    alignItems: 'center',
    gap: 4,
    flex: 1
  },
  statLabel: {
    fontSize: 11,
    color: '#666'
  },
  statValue: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333'
  },
  avgLateContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: 8,
    paddingTop: 12,
    borderTopWidth: 1,
    borderColor: '#f0f0f0'
  },
  avgLateText: {
    fontSize: 12,
    color: '#ff9800',
    fontWeight: '600'
  },

  // ===== Detail Card Styles =====
  detailCard: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2
  },
  detailHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12
  },
  dateTimeBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#f8f9fa',
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 8
  },
  detailDate: {
    fontSize: 12,
    color: '#666'
  },
  detailTime: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#333'
  },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 20
  },
  statusText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#fff'
  },
  detailMedName: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 8
  },
  detailMetaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between'
  },
  detailMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 4
  },
  metaText: {
    fontSize: 13,
    color: '#666'
  },
  lateText: {
    color: '#ff9800',
    fontWeight: '600'
  },
  detailExpandedContent: {
    marginTop: 8
  },
  expandIconContainer: {
    alignItems: 'center',
    marginTop: 8,
    paddingTop: 8,
    borderTopWidth: 1,
    borderColor: '#f0f0f0'
  },
  sideEffectBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: 8,
    padding: 8,
    backgroundColor: '#fff5f5',
    borderRadius: 8,
    borderLeftWidth: 3,
    borderLeftColor: '#dc3545'
  },
  sideEffectText: {
    flex: 1,
    fontSize: 13,
    color: '#dc3545'
  },

  // ===== Empty State =====
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 60
  },
  emptyText: {
    marginTop: 16,
    fontSize: 16,
    color: '#999',
    textAlign: 'center'
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 12
  },
  
  chartModeContainer: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    elevation: 2
  },
  chartModeScroll: {
    flexGrow: 0
  },
  chartModeBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 20,
    marginRight: 8,
    backgroundColor: '#f8f9fa',
    borderWidth: 2,
    borderColor: '#e1e8ed'
  },
  chartModeBtnActive: {
    backgroundColor: '#4facfe',
    borderColor: '#4facfe'
  },
  chartModeBtnText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#4facfe'
  },
  chartModeBtnTextActive: {
    color: '#fff'
  },
  
  filterSelectorContainer: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    elevation: 2
  },
  filterButtons: {
    flexDirection: 'row',
    gap: 8
  },
  filterBtn: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: 8,
    backgroundColor: '#f8f9fa',
    borderWidth: 1,
    borderColor: '#e1e8ed',
    alignItems: 'center'
  },
  filterBtnActive: {
    backgroundColor: '#4facfe',
    borderColor: '#4facfe'
  },
  filterBtnText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#666'
  },
  filterBtnTextActive: {
    color: '#fff'
  },
  
  chartContainer: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    elevation: 2
  },
  chartHeader: {
    marginBottom: 16
  },
  chartTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 4
  },
  chartSubtitle: {
    fontSize: 12,
    color: '#999'
  },
  chart: {
    marginVertical: 8,
    borderRadius: 16
  },
  emptyChart: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 60
  },
  emptyChartText: {
    marginTop: 12,
    fontSize: 14,
    color: '#999'
  },
  
  timeDistributionCard: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    elevation: 2
  },
  periodItem: {
    marginBottom: 16
  },
  periodHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 8
  },
  periodName: {
    fontSize: 14,
    fontWeight: '600',
    color: '#333'
  },
  periodPercent: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#4facfe'
  },
  periodBar: {
    height: 8,
    backgroundColor: '#e0e0e0',
    borderRadius: 4,
    overflow: 'hidden',
    marginBottom: 4
  },
  periodBarFill: {
    height: '100%',
    borderRadius: 4
  },
  periodDetails: {
    fontSize: 11,
    color: '#666'
  },
  
  detailedStatsCard: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    elevation: 2
  },
  statRow: {
    flexDirection: 'row',
    marginBottom: 16,
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0'
  },
  statRank: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#4facfe',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12
  },
  statRankText: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#fff'
  },
  statContent: {
    flex: 1
  },
  statMedName: {
    fontSize: 15,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 8
  },
  statMetrics: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 6
  },
  statMetric: {
    flex: 1,
    backgroundColor: '#f8f9fa',
    padding: 8,
    borderRadius: 8
  },
  statMetricLabel: {
    fontSize: 10,
    color: '#666',
    marginBottom: 2
  },
  statMetricValue: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#333'
  },
  statLateInfo: {
    fontSize: 11,
    color: '#ff9800',
    marginTop: 4
  },
  statSideEffects: {
    fontSize: 11,
    color: '#dc3545',
    marginTop: 2
  },
  summaryChartCard: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 20,
    marginTop: 12,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 3
  },
  summaryChartHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16
  },
  summaryChartTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333'
  },
  summaryChartModeToggle: {
    flexDirection: 'row',
    backgroundColor: '#f8f9fa',
    borderRadius: 8,
    padding: 2
  },
  chartToggleBtn: {
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 6
  },
  chartToggleBtnActive: {
    backgroundColor: '#4facfe'
  },
  chartToggleBtnText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#666'
  },
  chartToggleBtnTextActive: {
    color: '#fff'
  },
  thresholdInputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f8f9fa',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 8,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: '#e1e8ed'
  },
  thresholdInput: {
    flex: 1,
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    paddingVertical: 0
  },
  thresholdUnit: {
    fontSize: 13,
    color: '#666',
    marginLeft: 8
  },
  thresholdRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 12
  },
  thresholdInputWrapper: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f8f9fa',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderWidth: 1,
    borderColor: '#e1e8ed'
  },
  timePeriodSection: {
    paddingTop: 12,
    borderTopWidth: 1,
    borderColor: '#f0f0f0',
    marginBottom: 12
  },
  timePeriodTitle: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 12
  },
  timePeriodItem: {
    marginBottom: 12
  },
  timePeriodHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 6
  },
  timePeriodName: {
    fontSize: 13,
    fontWeight: '600',
    color: '#666'
  },
  timePeriodPercent: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#4facfe' // น้ำเงิน
  },
  timePeriodBar: {
    height: 6,
    backgroundColor: '#e0e0e0',
    borderRadius: 3,
    overflow: 'hidden',
    marginBottom: 4
  },
  timePeriodBarFill: {
    height: '100%',
    borderRadius: 3
  },
  timePeriodDetails: {
    fontSize: 11,
    color: '#999'
  },
  
  // ===== Display Mode Toggle =====
  displayModeToggle: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 12,
    paddingTop: 12,
    borderTopWidth: 1,
    borderColor: '#f0f0f0'
  },
  displayToggleBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
    paddingVertical: 8,
    borderRadius: 8,
    backgroundColor: '#f8f9fa',
    borderWidth: 1,
    borderColor: '#e1e8ed'
  },
  displayToggleBtnActive: {
    backgroundColor: '#4facfe',
    borderColor: '#4facfe'
  },
  displayToggleBtnText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#666'
  },
  displayToggleBtnTextActive: {
    color: '#fff'
  },
  
  // ===== Chart View =====
  chartViewContainer: {
    paddingTop: 8
  },
  miniChart: {
    marginVertical: 8,
    borderRadius: 12
  },
  applyBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingVertical: 10,
    paddingHorizontal: 16,
    backgroundColor: '#4facfe',
    borderRadius: 8,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.2,
    shadowRadius: 2
  },
  applyBtnDisabled: {
    backgroundColor: '#e1e8ed',
    elevation: 0
  },
  applyBtnText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#fff'
  },
  applyBtnTextDisabled: {
    color: '#999'
  },
  
  thresholdButtons: {
    flexDirection: 'row',
    gap: 8
  },
  thresholdBtn: {
    flex: 1,
    paddingVertical: 8,
    borderRadius: 8,
    backgroundColor: '#f8f9fa',
    borderWidth: 1,
    borderColor: '#e1e8ed',
    alignItems: 'center'
  },
  thresholdBtnText: {
    fontSize: 12,
    color: '#666',
    fontWeight: '600'
  },
});
