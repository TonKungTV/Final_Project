import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { BASE_URL } from './config';

const InfoCard = ({ icon, label, value, color = '#007aff' }) => (
  <View style={styles.infoCard}>
    <View style={[styles.iconContainer, { backgroundColor: color + '20' }]}>
      <Ionicons name={icon} size={24} color={color} />
    </View>
    <View style={styles.infoContent}>
      <Text style={styles.infoLabel}>{label}</Text>
      <Text style={styles.infoValue}>{value || '-'}</Text>
    </View>
  </View>
);

const TimeSlot = ({ mealName, time }) => (
  <View style={styles.timeSlot}>
    <Ionicons name="time-outline" size={20} color="#007aff" />
    <Text style={styles.timeSlotText}>{mealName}</Text>
    <Text style={styles.timeSlotTime}>{time}</Text>
  </View>
);

const StatusBadge = ({ isActive }) => (
  <View style={[styles.statusBadge, { backgroundColor: isActive ? '#28a745' : '#6c757d' }]}>
    <Ionicons 
      name={isActive ? 'checkmark-circle' : 'pause-circle'} 
      size={16} 
      color="#fff" 
    />
    <Text style={styles.statusText}>
      {isActive ? 'เปิดใช้งาน' : 'ปิดใช้งาน'}
    </Text>
  </View>
);

const FrequencyBadge = ({ frequency }) => {
  const frequencyMap = {
    'every_day': { label: 'ทุกวัน', color: '#4dabf7' },
    'every_X_days': { label: 'ทุก X วัน', color: '#74c0fc' },
    'every_X_hours': { label: 'ทุก X ชั่วโมง', color: '#a5d8ff' },
    'every_X_minutes': { label: 'ทุกๆ X นาที', color: '#d0ebff' },
    'weekly': { label: 'รายสัปดาห์', color: '#fa5252' },
    'monthly': { label: 'รายเดือน', color: '#ff8787' },
    'cycle': { label: 'รอบวัน', color: '#ffc078' },
    'on_demand': { label: 'ตามอาการ', color: '#ffd43b' },
  };

  const config = frequencyMap[frequency] || { label: 'ไม่ระบุ', color: '#adb5bd' };

  return (
    <View style={[styles.frequencyBadge, { backgroundColor: config.color }]}>
      <Text style={styles.frequencyText}>{config.label}</Text>
    </View>
  );
};

const MedicationDetailScreen = ({ route, navigation }) => {
  const { id } = route.params;
  const [medication, setMedication] = useState(null);
  const [mealTimes, setMealTimes] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchMedicationData();
  }, [id]);

  const fetchMedicationData = async () => {
    try {
      setLoading(true);
      
      // ดึงข้อมูลยา
      const medResponse = await fetch(`${BASE_URL}/api/medications/${id}`);
      const medData = await medResponse.json();
      setMedication(medData);

      // ดึงเวลาทานยา
      const timesResponse = await fetch(`${BASE_URL}/api/medications/${id}/times`);
      const timesData = await timesResponse.json();
      setMealTimes(timesData);

    } catch (err) {
      console.error('Error fetching medication:', err);
      Alert.alert('ข้อผิดพลาด', 'ไม่สามารถโหลดข้อมูลยาได้');
    } finally {
      setLoading(false);
    }
  };

  const deleteMedication = () => {
    Alert.alert(
      'ยืนยันการลบ',
      'คุณต้องการลบรายการยานี้หรือไม่?',
      [
        { text: 'ยกเลิก', style: 'cancel' },
        {
          text: 'ลบ',
          style: 'destructive',
          onPress: async () => {
            try {
              const response = await fetch(`${BASE_URL}/api/medications/${id}`, {
                method: 'DELETE',
              });
              
              if (response.ok) {
                Alert.alert('สำเร็จ', 'ลบรายการยาเรียบร้อยแล้ว', [
                  { text: 'ตัดบน', onPress: () => navigation.goBack() }
                ]);
              } else {
                Alert.alert('ข้อผิดพลาด', 'ไม่สามารถลบรายการยาได้');
              }
            } catch (error) {
              console.error('Error deleting medication:', error);
              Alert.alert('ข้อผิดพลาด', 'เกิดข้อผิดพลาดในการลบรายการยา');
            }
          }
        },
      ]
    );
  };

  const formatDate = (dateStr) => {
    if (!dateStr) return '-';
    return new Date(dateStr).toLocaleDateString('th-TH', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  };

  const formatMealUsage = (mealName, timeStr) => {
    if (!timeStr || typeof timeStr !== 'string') return mealName || 'พร้อมอาหาร';
    
    const [h, m] = timeStr.split(':').map(Number);
    const minutes = h * 60 + m;
    
    if (mealName?.includes('ก่อน')) return `${minutes} นาทีก่อนอาหาร`;
    if (mealName?.includes('หลัง')) return `${minutes} นาทีหลังอาหาร`;
    return 'พร้อมอาหาร';
  };

  const renderFrequencyDetails = () => {
    if (!medication) return null;

    const { FrequencyValue, CustomValue, WeekDays, MonthDays, Cycle_Use_Days, Cycle_Rest_Days } = medication;

    let details = [];

    if (FrequencyValue === 'every_X_days' && CustomValue) {
      details.push(`ทุก ${CustomValue} วัน`);
    }
    
    if (FrequencyValue === 'every_X_hours' && CustomValue) {
      details.push(`ทุก ${CustomValue} ชั่วโมง`);
    }
    
    if (FrequencyValue === 'every_X_minutes' && CustomValue) {
      details.push(`ทุก ${CustomValue} นาที`);
    }

    if (FrequencyValue === 'weekly' && Array.isArray(WeekDays) && WeekDays.length > 0) {
      const dayNames = ['อาทิตย์', 'จันทร์', 'อังคาร', 'พุธ', 'พฤหัสบดี', 'ศุกร์', 'เสาร์'];
      const selectedDays = WeekDays.map(d => dayNames[d % 7]).join(', ');
      details.push(`วัน: ${selectedDays}`);
    }

    if (FrequencyValue === 'monthly' && Array.isArray(MonthDays) && MonthDays.length > 0) {
      details.push(`วันที่: ${MonthDays.join(', ')}`);
    }

    if (FrequencyValue === 'cycle' && Cycle_Use_Days && Cycle_Rest_Days) {
      details.push(`${Cycle_Use_Days} วันใช้, ${Cycle_Rest_Days} วันพัก`);
    }

    return details.length > 0 ? details.join(' • ') : null;
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#007aff" />
        <Text style={styles.loadingText}>กำลังโหลดข้อมูล...</Text>
      </View>
    );
  }

  if (!medication) {
    return (
      <View style={styles.errorContainer}>
        <Ionicons name="alert-circle-outline" size={64} color="#adb5bd" />
        <Text style={styles.errorText}>ไม่พบข้อมูลยา</Text>
      </View>
    );
  }

  return (
    <ScrollView style={styles.container}>
      {/* Header Card */}
      <View style={styles.headerCard}>
        <View style={styles.headerTop}>
          <View style={styles.headerLeft}>
            <Text style={styles.medicationName}>{medication.Name}</Text>
            <Text style={styles.medicationType}>{medication.TypeName}</Text>
          </View>
          <StatusBadge isActive={medication.IsActive} />
        </View>
        
        <View style={styles.priorityRow}>
          <View style={[
            styles.priorityBadge,
            { backgroundColor: medication.PriorityName === 'สูง' ? '#f03e3e' : '#4dabf7' }
          ]}>
            <Ionicons 
              name={medication.PriorityName === 'สูง' ? 'alert-circle' : 'information-circle'} 
              size={16} 
              color="#fff" 
            />
            <Text style={styles.priorityText}>
              ความสำคัญ: {medication.PriorityName}
            </Text>
          </View>
          
          <FrequencyBadge frequency={medication.FrequencyValue} />
        </View>
      </View>

      {/* Dosage Info */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>ขนาดและการใช้ยา</Text>
        
        <InfoCard
          icon="medical"
          label="ขนาดยา"
          value={`${medication.Dosage} ${medication.DosageType}`}
          color="#22b8cf"
        />
        
        <InfoCard
          icon="restaurant"
          label="การใช้งานกับมื้ออาหาร"
          value={formatMealUsage(medication.UsageMealName, medication.UsageMealTimeOffset)}
          color="#ff6b6b"
        />

        {medication.GroupName && (
          <InfoCard
            icon="fitness"
            label="กลุ่มโรค"
            value={medication.GroupName}
            color="#be4bdb"
          />
        )}
      </View>

      {/* Time Schedule */}
      {mealTimes.length > 0 && (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>เวลาที่ต้องทาน</Text>
          <View style={styles.timeSlotsContainer}>
            {mealTimes.map((item, index) => (
              <TimeSlot 
                key={index}
                mealName={item.MealName}
                time={item.Time?.slice(0, 5) || '-'}
              />
            ))}
          </View>
        </View>
      )}

      {/* Frequency Details */}
      {renderFrequencyDetails() && (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>รายละเอียดความถี่</Text>
          <View style={styles.frequencyDetailsCard}>
            <Ionicons name="calendar-outline" size={24} color="#007aff" />
            <Text style={styles.frequencyDetailsText}>
              {renderFrequencyDetails()}
            </Text>
          </View>
        </View>
      )}

      {/* Date Range */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>ช่วงเวลาการใช้ยา</Text>
        <View style={styles.dateRangeCard}>
          <View style={styles.dateItem}>
            <Ionicons name="play-circle-outline" size={20} color="#51cf66" />
            <View style={styles.dateContent}>
              <Text style={styles.dateLabel}>เริ่มต้น</Text>
              <Text style={styles.dateValue}>{formatDate(medication.StartDate)}</Text>
            </View>
          </View>
          
          <View style={styles.dateArrow}>
            <Ionicons name="arrow-forward" size={24} color="#adb5bd" />
          </View>
          
          <View style={styles.dateItem}>
            <Ionicons name="stop-circle-outline" size={20} color="#ff6b6b" />
            <View style={styles.dateContent}>
              <Text style={styles.dateLabel}>สิ้นสุด</Text>
              <Text style={styles.dateValue}>{formatDate(medication.EndDate)}</Text>
            </View>
          </View>
        </View>
      </View>

      {/* Note */}
      {medication.Note && (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>หมายเหตุ</Text>
          <View style={styles.noteCard}>
            <Ionicons name="document-text-outline" size={24} color="#868e96" />
            <Text style={styles.noteText}>{medication.Note}</Text>
          </View>
        </View>
      )}

      {/* Action Buttons */}
      <View style={styles.actionButtons}>
        <TouchableOpacity
          style={styles.editButton}
          onPress={() => navigation.navigate('EditMedicationScreen', { id: medication.MedicationID })}
        >
          <Ionicons name="create-outline" size={22} color="#fff" />
          <Text style={styles.buttonText}>แก้ไข</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.deleteButton}
          onPress={deleteMedication}
        >
          <Ionicons name="trash-outline" size={22} color="#fff" />
          <Text style={styles.buttonText}>ลบ</Text>
        </TouchableOpacity>
      </View>

      <View style={{ height: 20 }} />
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8f9fa',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f8f9fa',
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
    color: '#868e96',
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f8f9fa',
  },
  errorText: {
    marginTop: 16,
    fontSize: 18,
    color: '#868e96',
  },
  
  // Header Card
  headerCard: {
    backgroundColor: '#fff',
    padding: 20,
    marginBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#e9ecef',
  },
  headerTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 16,
  },
  headerLeft: {
    flex: 1,
  },
  medicationName: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#212529',
    marginBottom: 4,
  },
  medicationType: {
    fontSize: 16,
    color: '#868e96',
  },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    gap: 6,
  },
  statusText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
  },
  priorityRow: {
    flexDirection: 'row',
    gap: 8,
  },
  priorityBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    gap: 6,
  },
  priorityText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
  },
  frequencyBadge: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
  },
  frequencyText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
  },

  // Section
  section: {
    backgroundColor: '#fff',
    padding: 16,
    marginBottom: 12,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#212529',
    marginBottom: 16,
  },

  // Info Card
  infoCard: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    backgroundColor: '#f8f9fa',
    borderRadius: 12,
    marginBottom: 12,
  },
  iconContainer: {
    width: 48,
    height: 48,
    borderRadius: 24,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  infoContent: {
    flex: 1,
  },
  infoLabel: {
    fontSize: 14,
    color: '#868e96',
    marginBottom: 4,
  },
  infoValue: {
    fontSize: 16,
    fontWeight: '600',
    color: '#212529',
  },

  // Time Slots
  timeSlotsContainer: {
    gap: 8,
  },
  timeSlot: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    backgroundColor: '#f1f3f5',
    borderRadius: 12,
    borderLeftWidth: 3,
    borderLeftColor: '#007aff',
  },
  timeSlotText: {
    flex: 1,
    marginLeft: 12,
    fontSize: 16,
    color: '#495057',
    fontWeight: '500',
  },
  timeSlotTime: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#007aff',
  },

  // Frequency Details
  frequencyDetailsCard: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    backgroundColor: '#e7f5ff',
    borderRadius: 12,
    gap: 12,
  },
  frequencyDetailsText: {
    flex: 1,
    fontSize: 16,
    color: '#1971c2',
    fontWeight: '500',
  },

  // Date Range
  dateRangeCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 16,
    backgroundColor: '#f8f9fa',
    borderRadius: 12,
  },
  dateItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    flex: 1,
  },
  dateContent: {
    flex: 1,
  },
  dateLabel: {
    fontSize: 12,
    color: '#868e96',
    marginBottom: 4,
  },
  dateValue: {
    fontSize: 14,
    fontWeight: '600',
    color: '#212529',
  },
  dateArrow: {
    marginHorizontal: 8,
  },

  // Note
  noteCard: {
    flexDirection: 'row',
    padding: 16,
    backgroundColor: '#f8f9fa',
    borderRadius: 12,
    gap: 12,
  },
  noteText: {
    flex: 1,
    fontSize: 15,
    color: '#495057',
    lineHeight: 22,
  },

  // Action Buttons
  actionButtons: {
    flexDirection: 'row',
    padding: 16,
    gap: 12,
  },
  editButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#4dabf7',
    paddingVertical: 14,
    borderRadius: 12,
    gap: 8,
    shadowColor: '#4dabf7',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 3,
  },
  deleteButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#ff6b6b',
    paddingVertical: 14,
    borderRadius: 12,
    gap: 8,
    shadowColor: '#ff6b6b',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 3,
  },
  buttonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
});

export default MedicationDetailScreen;