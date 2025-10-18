import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  FlatList,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  SafeAreaView,
  StatusBar,
  Switch, // ✅ เพิ่ม Switch
  Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Picker } from '@react-native-picker/picker';
import { BASE_URL } from './config';
import AsyncStorage from '@react-native-async-storage/async-storage';

//  Component สำหรับแสดงการ์ดยา 
const MedicationCard = ({ item, onPress, onToggleActive }) => {
  //  สร้างสีตาม GroupName หรือชื่อยา
  const getCardColor = (groupName, medicationName) => {
    const colors = ['#f44336', '#4caf50', '#2196f3', '#ff9800', '#9c27b0', '#607d8b'];
    const hash = (groupName || medicationName || '').split('').reduce((a, b) => {
      a = ((a << 5) - a) + b.charCodeAt(0);
      return a & a;
    }, 0);
    return colors[Math.abs(hash) % colors.length];
  };

  // สร้างตัวย่อจากชื่อยา
  const getInitials = (name) => {
    if (!name) return '?';
    const words = name.split(' ');
    if (words.length >= 2) {
      return words[0].charAt(0) + words[1].charAt(0);
    }
    return name.substring(0, 2);
  };

  return (
    <TouchableOpacity
      style={[
        styles.medicationCard,
        !item.IsActive && styles.medicationCardInactive // ✅ สไตล์เมื่อไม่ active
      ]}
      onPress={onPress}
    >
      <View style={[styles.medicationIcon, { backgroundColor: getCardColor(item.GroupName, item.Name) }]}>
        <Text style={styles.medicationInitials}>
          {getInitials(item.Name).toUpperCase()}
        </Text>
      </View>

      <View style={styles.medicationInfo}>
        <Text style={[
          styles.medicationName,
          !item.IsActive && styles.medicationNameInactive // ✅ สไตล์ข้อความเมื่อไม่ active
        ]}>
          {item.Name}
        </Text>
        <Text style={styles.medicationDetails}>
          {item.Note ? `${item.Note.substring(0, 30)}${item.Note.length > 30 ? '...' : ''}` : 'ไม่มีหมายเหตุ'}
        </Text>
        <Text style={styles.medicationGroup}>กลุ่มโรค: {item.GroupName || 'ไม่ระบุ'}</Text>

        {/* ✅ แสดงสถานะ */}
        <View style={styles.statusBadge}>
          <Ionicons
            name={item.IsActive ? "notifications" : "notifications-off"}
            size={14}
            color={item.IsActive ? "#28a745" : "#dc3545"}
          />
          <Text style={[
            styles.statusText,
            { color: item.IsActive ? "#28a745" : "#dc3545" }
          ]}>
            {item.IsActive ? 'เปิดการแจ้งเตือน' : 'ปิดการแจ้งเตือน'}
          </Text>
        </View>
      </View>

      {/* ✅ สวิตช์ Active/Inactive */}
      <View style={styles.switchContainer}>
        <Switch
          value={item.IsActive}
          onValueChange={(value) => onToggleActive(item.MedicationID, value)}
          trackColor={{ false: '#ddd', true: '#4dabf7' }}
          thumbColor={item.IsActive ? '#fff' : '#f4f3f4'}
        />
      </View>
    </TouchableOpacity>
  );
};

//  Component สำหรับหน้าเปล่า (Empty State)
const EmptyState = ({ onAddMedication }) => (
  <View style={styles.emptyContainer}>
    <View style={styles.emptyIconContainer}>
      <Ionicons name="medical" size={60} color="#4dabf7" />
    </View>
    <Text style={styles.emptyTitle}>ไม่มีรายการยา</Text>
    <Text style={styles.emptySubtitle}>เพิ่มรายการยาของคุณ กดปุ่ม +</Text>
  </View>
);

const MedicationListScreen = ({ navigation }) => {
  const [medications, setMedications] = useState([]);
  const [isLoading, setLoading] = useState(true);
  const [selectedGroup, setSelectedGroup] = useState('ทั้งหมด');

  //  สร้างรายการกลุ่มโรค
  const groupNames = ['ทั้งหมด', ...new Set(
    Array.isArray(medications) ? medications.map(item => item.GroupName).filter(Boolean) : []
  )];

  useEffect(() => {
    fetchMedications();

    // ✅ Reload เมื่อกลับมาหน้านี้
    const unsubscribe = navigation.addListener('focus', fetchMedications);
    return unsubscribe;
  }, [navigation]);

  const fetchMedications = async () => {
    try {
      const storedUserId = await AsyncStorage.getItem('userId');
      if (!storedUserId) {
        console.warn('❌ ไม่พบ userId ใน AsyncStorage');
        return;
      }

      const userId = parseInt(storedUserId);
      const response = await fetch(`${BASE_URL}/api/medications?userId=${userId}`);
      const data = await response.json();

      if (Array.isArray(data)) {
        console.log('✅ Medications loaded:', data.length, 'items');
        setMedications(data);
      } else {
        console.error('Invalid response:', data);
        setMedications([]);
      }
    } catch (err) {
      console.error('Error fetching medications:', err);
    } finally {
      setLoading(false);
    }
  };
  // ✅ ฟังก์ชันสำหรับสลับสถานะ Active/Inactive
  const handleToggleActive = async (medicationId, isActive) => {
    try {
      console.log('🔄 Toggling active:', { medicationId, isActive });

      const response = await fetch(`${BASE_URL}/api/medications/${medicationId}/toggle-active`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ isActive }),
      });

      const data = await response.json();

      if (response.ok) {
        console.log('✅ Toggle success:', data);

        // อัพเดต state
        setMedications(prev =>
          prev.map(med =>
            med.MedicationID === medicationId
              ? { ...med, IsActive: isActive }
              : med
          )
        );

        // แสดง Alert
        Alert.alert(
          'สำเร็จ',
          data.message || (isActive ? 'เปิดการแจ้งเตือนแล้ว' : 'ปิดการแจ้งเตือนแล้ว'),
          [{ text: 'ตกลง' }]
        );
      } else {
        console.error('❌ Toggle failed:', data);
        Alert.alert('เกิดข้อผิดพลาด', 'ไม่สามารถเปลี่ยนสถานะได้');
      }
    } catch (error) {
      console.error('Error toggling active:', error);
      Alert.alert('เกิดข้อผิดพลาด', 'ไม่สามารถเชื่อมต่อเซิร์ฟเวอร์');
    }
  };

  //  กรองยาตามกลุ่มที่เลือก
  const filteredMedications = selectedGroup === 'ทั้งหมด'
    ? medications
    : medications.filter(med => med.GroupName === selectedGroup);

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor="#4dabf7" />

      {isLoading ? (
        <View style={styles.loadingContainer}>
          <Text style={styles.loadingText}>กำลังโหลด...</Text>
        </View>
      ) : (
        <View style={styles.content}>
          {medications.length > 0 && (
            <View style={styles.filterContainer}>
              <Text style={styles.filterLabel}>เลือกโรค:</Text>
              <View style={styles.pickerContainer}>
                <Picker
                  selectedValue={selectedGroup}
                  onValueChange={(itemValue) => setSelectedGroup(itemValue)}
                  style={styles.picker}
                >
                  {groupNames.map(group => (
                    <Picker.Item label={group} value={group} key={group} />
                  ))}
                </Picker>
              </View>
            </View>
          )}

          {filteredMedications.length > 0 ? (
            <FlatList
              data={filteredMedications}
              keyExtractor={(item, index) => item.MedicationID?.toString() ?? index.toString()}
              renderItem={({ item }) => (
                <MedicationCard 
                  item={item}
                  onPress={() => navigation.navigate('MedicationDetailScreen', { id: item.MedicationID })}
                  onToggleActive={handleToggleActive}
                />
              )}
              showsVerticalScrollIndicator={false}
              contentContainerStyle={styles.listContainer}
            />
          ) : (
            <EmptyState onAddMedication={() => navigation.navigate('AddMedication')} />
          )}
        </View>
      )}

      <TouchableOpacity
        style={styles.fab}
        onPress={() => navigation.navigate('AddMedication')}
      >
        <Ionicons name="add" size={24} color="#fff" />
      </TouchableOpacity>

      <View style={styles.fabTextContainer}>
        <Text style={styles.fabText}>เพิ่มรายการยา</Text>
      </View>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  //  Container หลัก
  container: {
    flex: 1,
    backgroundColor: '#f8f9fa',
  },

  //  Header สีฟ้า คล้ายรูป
  header: {
    backgroundColor: '#4dabf7',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    elevation: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },

  backButton: {
    padding: 8,
  },

  headerTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#fff',
    flex: 1,
    textAlign: 'center',
    marginRight: 40, //  ชดเชยปุ่มกลับด้านซ้าย
  },

  headerRight: {
    width: 40, //  placeholder สำหรับสมดุล
  },

  //  Loading state
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },

  loadingText: {
    fontSize: 16,
    color: '#666',
  },

  // Content area
  content: {
    flex: 1,
    paddingTop: 16,
  },

  //  Filter/Picker container
  filterContainer: {
    paddingHorizontal: 16,
    marginBottom: 16,
  },

  filterLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#333',
    marginBottom: 8,
  },

  pickerContainer: {
    backgroundColor: '#fff',
    borderRadius: 12,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
  },

  picker: {
    height: 50,
  },

  //  List container
  listContainer: {
    paddingBottom: 100, //  เว้นที่สำหรับ FAB
  },

  //  การ์ดยา - ดีไซน์ใหม่
  medicationCard: {
    backgroundColor: '#fff',
    marginHorizontal: 16,
    marginBottom: 12,
    borderRadius: 12,
    padding: 16,
    flexDirection: 'row',
    alignItems: 'center',
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },

  // ✅ วงกลมไอคอนยา
  medicationIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 16,
  },

  medicationInitials: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },

  // ข้อมูลยา
  medicationInfo: {
    flex: 1,
  },

  medicationName: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 4,
  },

  medicationDetails: {
    fontSize: 14,
    color: '#666',
    marginBottom: 2,
  },

  medicationGroup: {
    fontSize: 12,
    color: '#999',
  },

  //  ลูกศร
  arrowContainer: {
    padding: 8,
  },

  // Empty state - หน้าเปล่า
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 32,
  },

  emptyIconContainer: {
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: '#e3f2fd',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 24,
  },

  emptyTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 8,
  },

  emptySubtitle: {
    fontSize: 14,
    color: '#666',
    textAlign: 'center',
    lineHeight: 20,
  },

  //  FAB (Floating Action Button) - คล้ายรูป
  fab: {
    position: 'absolute',
    bottom: 100,
    alignSelf: 'center',
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: '#4dabf7',
    justifyContent: 'center',
    alignItems: 'center',
    elevation: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
  },

  //  ข้อความใต้ FAB
  fabTextContainer: {
    position: 'absolute',
    bottom: 75,
    alignSelf: 'center',
  },

  fabText: {
    fontSize: 12,
    color: '#666',
    textAlign: 'center',
  },

  //  เมนูด้านล่าง
  bottomMenu: {
    backgroundColor: '#4dabf7',
    paddingVertical: 12,
    paddingHorizontal: 16,
  },

  menuButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(255,255,255,0.2)',
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: 25,
  },

  menuButtonText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
    marginLeft: 8,
  },
  container: {
    flex: 1,
    backgroundColor: '#f8f9fa',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    fontSize: 16,
    color: '#666',
  },
  content: {
    flex: 1,
    paddingTop: 16,
  },
  filterContainer: {
    paddingHorizontal: 16,
    marginBottom: 16,
  },
  filterLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#333',
    marginBottom: 8,
  },
  pickerContainer: {
    backgroundColor: '#fff',
    borderRadius: 12,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
  },
  picker: {
    height: 50,
  },
  listContainer: {
    paddingBottom: 100,
  },
  medicationCard: {
    backgroundColor: '#fff',
    marginHorizontal: 16,
    marginBottom: 12,
    borderRadius: 12,
    padding: 16,
    flexDirection: 'row',
    alignItems: 'center',
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  // ✅ สไตล์เมื่อยาไม่ active
  medicationCardInactive: {
    opacity: 0.6,
    backgroundColor: '#f5f5f5',
  },
  medicationIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 16,
  },
  medicationInitials: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
  medicationInfo: {
    flex: 1,
  },
  medicationName: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 4,
  },
  // ✅ สไตล์ข้อความเมื่อไม่ active
  medicationNameInactive: {
    color: '#999',
    textDecorationLine: 'line-through',
  },
  medicationDetails: {
    fontSize: 14,
    color: '#666',
    marginBottom: 2,
  },
  medicationGroup: {
    fontSize: 12,
    color: '#999',
    marginBottom: 8,
  },
  // ✅ สไตล์สำหรับ status badge
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  statusText: {
    fontSize: 12,
    fontWeight: '600',
  },
  // ✅ สไตล์สำหรับ switch container
  switchContainer: {
    marginLeft: 8,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 32,
  },
  emptyIconContainer: {
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: '#e3f2fd',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 24,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 8,
  },
  emptySubtitle: {
    fontSize: 14,
    color: '#666',
    textAlign: 'center',
    lineHeight: 20,
  },
  fab: {
    position: 'absolute',
    bottom: 100,
    alignSelf: 'center',
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: '#4dabf7',
    justifyContent: 'center',
    alignItems: 'center',
    elevation: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
  },
  fabTextContainer: {
    position: 'absolute',
    bottom: 75,
    alignSelf: 'center',
  },
  fabText: {
    fontSize: 12,
    color: '#666',
    textAlign: 'center',
  },
});

export default MedicationListScreen;