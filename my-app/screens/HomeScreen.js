import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Modal,
  TextInput,
  AppState,
  Alert,
  Animated,   // เพิ่ม
  Easing,      // เพิ่ม
  Vibration,
  Platform
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Audio } from 'expo-av';
import DateTimePicker from '@react-native-community/datetimepicker';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { BASE_URL } from './config';
import { useNotification } from '../contexts/NotificationContext';


// ✅ Component สำหรับแสดงสถานะ (กินแล้ว, ยังไม่กิน, ไม่มีการบันทึก)
const StatusBadge = ({ status, onPress }) => {
  const getStatusConfig = (status) => {
    switch (status) {
      case 'กินแล้ว':
        return { color: '#28a745', icon: 'checkmark-circle', text: 'กินแล้ว' };
      case 'ข้าม':
        return { color: '#dc3545', icon: 'close-circle', text: 'ข้าม' };
      case 'รอกิน':
        return { color: '#ffc107', icon: 'time-outline', text: 'รอกิน' };
      default:
        return { color: '#6c757d', icon: 'help-circle-outline', text: 'ไม่ระบุ' };
    }
  };

  const config = getStatusConfig(status);

  return (
    <TouchableOpacity
      style={[styles.statusBadge, { backgroundColor: config.color }]}
      onPress={onPress}
    >
      <Ionicons name={config.icon} size={16} color="#fff" />
      <Text style={styles.statusText}>{config.text}</Text>
    </TouchableOpacity>
  );
};

// ✅ Component สำหรับแสดงความสำคัญ
const ImportanceBadge = ({ level }) => {
  const colorMap = { 'สูง': '#f03e3e', 'ปกติ': '#007aff' };
  return (
    <View style={[styles.importanceBadge, { backgroundColor: colorMap[level] || '#ccc' }]}>
      <Text style={styles.importanceText}>{level}</Text>
    </View>
  );
};

// ✅ Component สำหรับแสดงหัวข้อช่วงเวลา
const TimeSection = ({ title, count, icon }) => (
  <View style={styles.timeSectionHeader}>
    <View style={styles.timeSectionLeft}>
      <Ionicons name={icon} size={24} color="#4dabf7" />
      <Text style={styles.timeSectionTitle}>{title}</Text>
    </View>
    <View style={styles.medicationCount}>
      <Text style={styles.medicationCountText}>{count} รายการ</Text>
    </View>
  </View>
);

// ✅ Component สำหรับปุ่มฟิลเตอร์
const FilterButton = ({ label, isActive, onPress, color, icon }) => (
  <TouchableOpacity
    style={[
      styles.filterButton,
      isActive && { backgroundColor: color, borderColor: color }
    ]}
    onPress={onPress}
  >
    <Ionicons
      name={icon}
      size={16}
      color={isActive ? '#fff' : color}
    />
    <Text style={[
      styles.filterButtonText,
      isActive && { color: '#fff' }
    ]}>
      {label}
    </Text>
  </TouchableOpacity>
);

// ✅ ฟังก์ชันแปลงเวลาเป็นรูปแบบชั่วโมงและนาที
const formatHM = (timeStr) => {
  if (!timeStr) return '';
  const [h, m] = timeStr.split(':');
  return `${h}:${m}`;
};

// ✅ ฟังก์ชันจัดกลุ่มยาตามช่วงเวลา
const groupMedicationsByTime = (items) => {
  const groups = {
    morning: { title: 'เช้า (06:00 - 12:00)', items: [], icon: 'sunny' },
    afternoon: { title: 'กลางวัน (12:00 - 18:00)', items: [], icon: 'partly-sunny' },
    evening: { title: 'เย็น (18:00 - 21:00)', items: [], icon: 'moon' },
    night: { title: 'ก่อนนอน (21:00 - 05:00)', items: [], icon: 'bed' }
  };

  items.forEach(item => {
    const timeStr = item.rawTime || '12:00';
    const hour = parseInt(timeStr.split(':')[0]);

    if (hour >= 6 && hour < 12) {
      groups.morning.items.push(item);
    } else if (hour >= 12 && hour < 18) {
      groups.afternoon.items.push(item);
    } else if (hour >= 18 && hour < 21) {
      groups.evening.items.push(item);
    } else {
      groups.night.items.push(item);
    }
  });

  return groups;
};

const HomeScreen = ({ navigation, onLogout }) => {
  const [modalMode, setModalMode] = useState('detail');
  const { setItems: setNotificationItems } = useNotification();
  const [items, setItems] = useState([]);
  const [modalVisible, setModalVisible] = useState(false);
  const [selectedItem, setSelectedItem] = useState(null);

  // ✅ เพิ่ม state สำหรับผลข้างเคียงและเวลา
  const [sideEffects, setSideEffects] = useState('');
  const [medTime, setMedTime] = useState(new Date());
  const [showTimePicker, setShowTimePicker] = useState(false);
  const [actualTakeTime, setActualTakeTime] = useState('');

  const [selectedDate, setSelectedDate] = useState(new Date());
  const [showDatePicker, setShowDatePicker] = useState(false);

  // ✅ เพิ่ม state สำหรับฟิลเตอร์
  const [activeFilter, setActiveFilter] = useState('ทั้งหมด');

  const [alertedIds, setAlertedIds] = useState(new Set());
  const alertLeadMinutes = 0; // 0 = เตือนเวลาตรง, ปรับเป็น 5 ถ้าต้องการเตือนล่วงหน้า 5 นาที
  const TEST_ALERT_INTERVAL_MS = 15000;
  const TEST_MODE = false; // true = เตือนทุกนาที, false = ปิด
  const [notifications, setNotifications] = useState([]); // {id, medId, title, message, medObj, anim}
  const soundRef = React.useRef(null);
  const [soundReady, setSoundReady] = useState(false);
  const NOTIFY_SOUND = require('../assets/notify.mp3');

  const pushNotification = (med) => {
    const nid = `${med.id}-${Date.now()}`;
    const anim = new Animated.Value(-100);
    setNotifications(prev => [...prev, {
      id: nid,
      medId: med.id,
      title: 'ถึงเวลาทานยา',
      message: `${med.name} (${(med.rawTime || '').slice(0, 5)})`,
      medObj: med,
      anim
    }]);
    hapticAndSound(); // จะเล่นทันทีหรือรอจนโหลดเสียงเสร็จแล้วค่อยเล่น
  };

  const saveEdits = async () => {
  if (!selectedItem?.scheduleId) {
    setModalMode('detail');
    return;
  }
  
  try {
    // ✅ ถ้าสถานะเป็น "ข้าม" ไม่ต้องส่ง actualTime
    const actualTimeNormalized = (selectedItem.status === 'ข้าม') ? null : normalizeTime(actualTakeTime);
    
    const updateData = {
      status: selectedItem.status === 'ข้าม' ? 'กินแล้ว' : selectedItem.status,
      sideEffects: sideEffects || null,
      actualTime: actualTimeNormalized,
      recordedAt: new Date().toISOString(),
    };

    const res = await fetch(`${BASE_URL}/api/schedule/${selectedItem.scheduleId}/status`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(updateData),
    });

    if (!res.ok) {
      const t = await res.text().catch(() => '');
      throw new Error(`Update failed: ${res.status} ${t}`);
    }

    await load();
    closeModal();
    Alert.alert('บันทึกสำเร็จ', 'อัปเดตรายละเอียดการกินยาแล้ว');
  } catch (e) {
    console.error(e);
    Alert.alert('เกิดข้อผิดพลาด', 'ไม่สามารถบันทึกการเปลี่ยนแปลงได้');
  }
};

  const dismissNotification = (nid) => {
    const target = notifications.find(n => n.id === nid);
    if (target?.anim) {
      Animated.timing(target.anim, {
        toValue: -120,
        duration: 180,
        useNativeDriver: true
      }).start(() => {
        setNotifications(prev => prev.filter(n => n.id !== nid));
      });
    } else {
      setNotifications(prev => prev.filter(n => n.id !== nid));
    }
  };

  const actTake = (notif) => {
    dismissNotification(notif.id);
    toggleStatus(notif.medObj, '', new Date().toTimeString().slice(0, 5));
  };
  const actSkip = (notif) => {
    dismissNotification(notif.id);
    if (notif.medObj.status !== 'ข้าม') {
      toggleStatus(notif.medObj, '', '');
      setTimeout(() => {
        // ถ้า toggle ครั้งแรกเปลี่ยนเป็น "กินแล้ว" ให้เปลี่ยนอีกทีเพื่อวนเป็น "ข้าม"
        const updated = { ...notif.medObj, status: 'กินแล้ว' };
        toggleStatus(updated, '', '');
      }, 120);
    }
  };

  // เล่น animation เข้า + auto dismiss
  useEffect(() => {
    notifications.forEach(n => {
      if (!n._shown) {
        n._shown = true;
        Animated.timing(n.anim, {
          toValue: 0,
          duration: 260,
          easing: Easing.out(Easing.cubic),
          useNativeDriver: true
        }).start(() => {
          setTimeout(() => dismissNotification(n.id), 10000);
        });
      }
    });
  }, [notifications]);
  // ===== End In-App Notifications =====

  // แปลง HH:MM:SS -> Date วันนี้
  const buildTodayDate = (timeStr) => {
    if (!timeStr) return null;
    const parts = timeStr.split(':');
    if (parts.length < 2) return null;
    const now = new Date();
    const h = parseInt(parts[0], 10);
    const m = parseInt(parts[1], 10);
    if (isNaN(h) || isNaN(m)) return null;
    const d = new Date(now.getFullYear(), now.getMonth(), now.getDate(), h, m, 0, 0);
    return d;
  };

  // ตรวจและสร้าง Alert
  const checkDueMedications = () => {
    const now = new Date();
    const newAlerted = new Set(alertedIds);
    let forced = false;

    items.forEach(it => {
      if (it.status !== 'รอกิน') return;
      const medDate = buildTodayDate(it.rawTime || it.Time);
      if (!medDate) return;
      const triggerTime = new Date(medDate.getTime() - alertLeadMinutes * 60000);
      if (now >= triggerTime && !newAlerted.has(it.id)) {
        newAlerted.add(it.id);
        pushNotification(it); // ✅ ใช้ in-app banner แทน Alert.alert
      }
    });

    if (TEST_MODE) {
      if (![...newAlerted].length) {
        const pending = items.find(i => i.status === 'รอกิน');
        if (pending && !newAlerted.has(pending.id)) {
          newAlerted.add(pending.id);
          pushNotification(pending); // ✅ test force
          forced = true;
        }
      }
    }

    if (newAlerted.size !== alertedIds.size) setAlertedIds(newAlerted);
  };

  const formatLocalDate = (d) => {
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${y}-${m}-${day}`;
  };

  const normalizeTime = (t) => {
    if (!t) return null;
    const parts = String(t).split(':').map(p => p.trim());
    if (parts.length === 1) return null;
    if (parts.length === 2) parts.push('00');
    const hh = parts[0].padStart(2, '0');
    const mm = parts[1].padStart(2, '0');
    const ss = (parts[2] || '00').padStart(2, '0');
    return `${hh}:${mm}:${ss}`;
  };

  const load = async (dateOverride) => {
    const userId = await AsyncStorage.getItem('userId');
    if (!userId) return;

    try {
      const dateStr = dateOverride ? dateOverride : formatLocalDate(selectedDate);
      const res = await fetch(`${BASE_URL}/api/reminders/today?userId=${userId}&date=${dateStr}`);
      const data = await res.json();

      const scheduledOnly = Array.isArray(data) ? data.filter(r => r.ScheduleID) : [];

      const mapped = scheduledOnly.map((r, i) => ({
        id: r.ScheduleID || `${r.MedicationID}-${i}`,
        scheduleId: r.ScheduleID || null,
        medicationId: r.MedicationID,
        time: `${r.MealName} ${formatHM(r.Time)} น.`,
        rawTime: r.Time,
        name: r.name,
        dose: r.Dosage != null && r.DosageType ? `${r.Dosage} ${r.DosageType}` : '-',
        medType: r.TypeName || '-',
        importance: r.PriorityLabel || 'ปกติ',
        status: r.Status || 'รอกิน',
        actualTime: r.ActualTime || null,
      }));
      setItems(mapped);
      setNotificationItems(mapped); // ส่งข้อมูลให้ Context
    } catch (error) {
      console.error('Error loading medications:', error);
    }
  };

  useEffect(() => {
    const interval = setInterval(() => {
      checkDueMedications();
      if (TEST_MODE) {
        console.log('✅ [Test Mode] ตรวจสอบการแจ้งเตือนยา');
      }
    }, TEST_MODE ? TEST_ALERT_INTERVAL_MS : 30000);
    return () => clearInterval(interval);
  }, [items, alertedIds, alertLeadMinutes, TEST_MODE]);

  // รีเซ็ต alertedIds เมื่อวันเปลี่ยนหรือ reload
  useEffect(() => {
    // เมื่อ load() เสร็จ (คุณอาจผูกกับ selectedDate ถ้ามี)
    // setAlertedIds(new Set());
  }, [/* selectedDate ถ้ามี */]);

  // ถ้าอยากหยุดตอนออก foreground
  useEffect(() => {
    const sub = AppState.addEventListener('change', (st) => {
      if (st === 'active') {
        checkDueMedications();
      }
    });
    return () => sub.remove();
  }, [items, alertedIds]);


  const ENABLE_SOUND = true; // false = ปิดเสียง (เหลือแค่สั่น)
  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        // ตั้งโหมดเสียง (สำคัญมากใน iOS โหมดเงียบ)
        await Audio.setAudioModeAsync({
          playsInSilentModeIOS: true,
          staysActiveInBackground: false,
          interruptionModeIOS: 2,
          interruptionModeAndroid: 2,
          shouldDuckAndroid: true,
          playThroughEarpieceAndroid: false
        });
      } catch (e) {
        console.log('ตั้งค่า Audio mode ล้มเหลว:', e.message);
      }

      if (!ENABLE_SOUND) {
        console.log('ENABLE_SOUND = false (ไม่โหลดไฟล์)');
        return;
      }

      try {
        const { sound } = await Audio.Sound.createAsync(
          NOTIFY_SOUND,
          { shouldPlay: false, volume: 1.0 }
        );
        if (!mounted) {
          await sound.unloadAsync().catch(() => { });
          return;
        }
        soundRef.current = sound;
        setSoundReady(true);
        console.log('[Sound] Loaded OK');
      } catch (e) {
        console.log('โหลดเสียงล้มเหลว:', e.message);
      }
    })();

    return () => {
      mounted = false;
      if (soundRef.current) {
        soundRef.current.unloadAsync().catch(() => { });
      }
    };
  }, []);

  const hapticAndSound = () => {
    // vibration (ทันที)
    try {
      if (Platform.OS === 'android') Vibration.vibrate(250);
      else Vibration.vibrate([0, 180, 80, 180]);
    } catch { }

    if (!ENABLE_SOUND) return;

    // พยายามเล่นเสียงแบบ retry รอให้ soundReady = true (สูงสุด 10 ครั้ง x 120ms ≈ 1.2s)
    let attempts = 0;
    const tryPlay = () => {
      if (soundReady && soundRef.current) {
        soundRef.current.setPositionAsync(0)
          .then(() => soundRef.current.playAsync())
          .catch(e => console.log('เล่นเสียงผิดพลาด:', e.message));
      } else if (attempts < 10) {
        attempts += 1;
        setTimeout(tryPlay, 120);
      }
    };
    tryPlay();
  };

  // ให้ reload ทุกครั้งที่ screen ได้ focus
  useEffect(() => {
    load();
    const unsubscribe = navigation.addListener('focus', () => {
      load();
    });
    return unsubscribe;
  }, []);

  const changeSelectedDate = (deltaDays) => {
    const d = new Date(selectedDate);
    d.setDate(d.getDate() + deltaDays);
    setSelectedDate(d);
    load(formatLocalDate(d));
  };

  const openDatePicker = () => setShowDatePicker(true);
  const handleDateChange = (event, date) => {
    setShowDatePicker(false);
    if (!date) return;
    setSelectedDate(date);
    load(formatLocalDate(date));
  };


  // ✅ ฟังก์ชันสำหรับฟิลเตอร์รายการยา
  const getFilteredItems = () => {
    if (activeFilter === 'ทั้งหมด') {
      return items;
    }
    return items.filter(item => item.status === activeFilter);
  };

  // ✅ ฟังก์ชันที่ใช้เปลี่ยนสถานะ
const toggleStatus = async (item, customSideEffects = '', customTime = '', newStatus = null) => {
  const previousItems = [...items];
  const nextStatus = newStatus || (item.status === 'รอกิน' ? 'กินแล้ว' : item.status === 'กินแล้ว' ? 'ข้าม' : 'รอกิน');

  // ปิด modal ก่อนเพื่อให้ UI ตอบสนองไวขึ้น
  setModalVisible(false);

  // อัพเดท state ชั่วคราว
  setItems(prev => prev.map(x => x.id === item.id ? { ...x, status: nextStatus } : x));

  if (!item.scheduleId) {
    setSelectedItem(null);
    return;
  }

  try {
    // ✅ ถ้าสถานะเป็น "ข้าม" ไม่ต้องส่ง actualTime
    const actualTimeNormalized = (nextStatus === 'ข้าม') ? null : (customTime ? normalizeTime(customTime) : null);
    
    const updateData = {
      status: nextStatus,
      sideEffects: customSideEffects || null,
      actualTime: actualTimeNormalized,
      recordedAt: new Date().toISOString()
    };

    const res = await fetch(`${BASE_URL}/api/schedule/${item.scheduleId}/status`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(updateData),
    });

    if (!res.ok) {
      const text = await res.text().catch(() => '');
      throw new Error(`Failed to update schedule: ${res.status} ${text}`);
    }

    // รีโหลดข้อมูลใหม่หลังจากบันทึกสำเร็จ
    await load();

    // ล้างข้อมูล modal
    setSelectedItem(null);
    setSideEffects('');
    setShowTimePicker(false);

    // แสดง Alert
    const statusMessage = nextStatus === 'กินแล้ว' ? 'ทานยาแล้ว' : 
                         nextStatus === 'ข้าม' ? 'ข้ามยา' : 
                         'อัปเดตสถานะ';
    
    Alert.alert('บันทึกสำเร็จ', `สถานะ: ${statusMessage}`);
  } catch (e) {
    // คืนค่า state เดิมถ้าเกิดข้อผิดพลาด
    setItems(previousItems);
    console.error('Error updating status:', e);
    Alert.alert('เกิดข้อผิดพลาด', 'ไม่สามารถบันทึกข้อมูลได้');
    
    // เปิด modal กลับมาถ้าเกิดข้อผิดพลาด
    setModalVisible(true);
  }
};

  const openModal = (item) => {
    setSelectedItem(item);
    setModalVisible(true);
    setSideEffects('');
    setMedTime(new Date());
    setActualTakeTime(item.actualTime ? item.actualTime.slice(0, 5) : new Date().toLocaleTimeString('th-TH', { hour: '2-digit', minute: '2-digit' }));
    // เลือกโหมดตามสถานะ
    if (item.status === 'รอกิน') {
      setModalMode('record');    // โหมดบันทึกครั้งแรก: ทานยาแล้ว/ข้าม/ยกเลิก
    } else {
      setModalMode('detail');    // โหมดดูรายละเอียด: ปิด/แก้ไข
    }
  };

  const closeModal = () => {
  setModalVisible(false);
  setSelectedItem(null);
  setSideEffects('');
  setShowTimePicker(false);
  setModalMode('detail');
};

  const confirmConsumption = () => {
    if (selectedItem) {
      toggleStatus(selectedItem, sideEffects, actualTakeTime);
      Alert.alert(
        'บันทึกสำเร็จ',
        `บันทึกการกินยา "${selectedItem.name}" เรียบร้อยแล้ว${sideEffects ? '\nรวมถึงผลข้างเคียง' : ''}`,
        [{ text: 'ตกลง' }]
      );
    }
    closeModal();
  };
  const isEditable = modalMode === 'record' || modalMode === 'edit';
  const showTimePickerModal = () => setShowTimePicker(true);

  const handleTimeChange = (event, selectedDate) => {
    setShowTimePicker(false);

    if (selectedDate) {
      const currentTime = selectedDate;
      setMedTime(currentTime);
      const formattedTime = currentTime.toLocaleTimeString('th-TH', { hour: '2-digit', minute: '2-digit' });
      setActualTakeTime(formattedTime);
    }
  };

  // ✅ ใช้รายการที่ผ่านการฟิลเตอร์
  const filteredItems = getFilteredItems();
  const medicationGroups = groupMedicationsByTime(filteredItems);

  // ✅ ข้อมูลสำหรับปุ่มฟิลเตอร์
  const filterOptions = [
  { key: 'ทั้งหมด', label: 'ทั้งหมด', color: '#4dabf7', icon: 'apps' },
  { key: 'รอกิน', label: 'รอกิน', color: '#ffc107', icon: 'time-outline' },
  { key: 'กินแล้ว', label: 'กินแล้ว', color: '#28a745', icon: 'checkmark-circle' },
  { key: 'ข้าม', label: 'ข้าม', color: '#dc3545', icon: 'close-circle' },
  { key: 'ไม่ระบุ', label: 'ไม่ระบุ', color: '#6c757d', icon: 'help-circle-outline' }, // ✅ เพิ่มใหม่
];

  const handleLogout = async () => {
    Alert.alert(
      'ออกจากระบบ',
      'คุณต้องการออกจากระบบหรือไม่?',
      [
        {
          text: 'ยกเลิก',
          style: 'cancel'
        },
        {
          text: 'ออกจากระบบ',
          style: 'destructive',
          onPress: async () => {
            try {
              console.log('🚪 กดออกจากระบบ');

              // ✅ เรียก callback จาก App.js แทน navigation.reset
              if (onLogout) {
                await onLogout();
                console.log('✅ ออกจากระบบสำเร็จ');
              } else {
                console.log('⚠️ onLogout ไม่ได้ถูกส่งมา');
                Alert.alert('เกิดข้อผิดพลาด', 'กรุณารีสตาร์ทแอพ');
              }
            } catch (error) {
              console.error('Error logging out:', error);
              Alert.alert('เกิดข้อผิดพลาด', 'ไม่สามารถออกจากระบบได้');
            }
          }
        }
      ]
    );
  };

  return (
    <View style={styles.screenWrapper}>
      <ScrollView style={styles.container}>
        {/* Header */}
        <View style={styles.headerBox}>
          <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 12 }}>
            <TouchableOpacity onPress={() => changeSelectedDate(-1)} style={{ padding: 8 }}>
              <Ionicons name="chevron-back" size={24} color="#fff" />
            </TouchableOpacity>
            <View style={{ alignItems: 'center' }}>
              <Text style={styles.header}>รายการยาที่ต้องกิน</Text>
              <TouchableOpacity onPress={openDatePicker}>
                <Text style={styles.date}>
                  {selectedDate.toLocaleDateString('th-TH', {
                    weekday: 'long',
                    day: 'numeric',
                    month: 'long',
                    year: 'numeric',
                  })}
                </Text>
              </TouchableOpacity>
            </View>
            <TouchableOpacity onPress={() => changeSelectedDate(1)} style={{ padding: 8 }}>
              <Ionicons name="chevron-forward" size={24} color="#fff" />
            </TouchableOpacity>
          </View>
        </View>
        {/* Date picker modal */}
        {showDatePicker && (
          <DateTimePicker
            value={selectedDate}
            mode="date"
            display="default"
            onChange={handleDateChange}
          />
        )}
        {/* สรุปรายการยาทั้งหมด */}
        <View style={styles.summaryCard}>
          <TouchableOpacity
            style={{ backgroundColor: '#4dabf7', padding: 10, borderRadius: 8, alignSelf: 'flex-start', marginBottom: 12 }}
            onPress={() => hapticAndSound()}
          >
            <Text style={{ color: '#fff', fontWeight: '600' }}>ทดสอบเสียง/สั่น</Text>
          </TouchableOpacity>
          <Text style={styles.summaryTitle}>สรุปวันนี้</Text>
          <View style={styles.summaryRow}>
            <View style={styles.summaryItem}>
              <Text style={styles.summaryNumber}>{items.length}</Text>
              <Text style={styles.summaryLabel}>ทั้งหมด</Text>
            </View>
            <View style={styles.summaryItem}>
              <Text style={[styles.summaryNumber, { color: '#28a745' }]}>
                {items.filter(item => item.status === 'กินแล้ว').length}
              </Text>
              <Text style={styles.summaryLabel}>กินแล้ว</Text>
            </View>
            <View style={styles.summaryItem}>
              <Text style={[styles.summaryNumber, { color: '#dc3545' }]}>
                {items.filter(item => item.status === 'ข้าม').length}
              </Text>
              <Text style={styles.summaryLabel}>ข้าม</Text>
            </View>
            <View style={styles.summaryItem}>
              <Text style={[styles.summaryNumber, { color: '#ffc107' }]}>
                {items.filter(item => item.status === 'รอกิน').length}
              </Text>
              <Text style={styles.summaryLabel}>รอกิน</Text>
            </View>
            <View style={styles.summaryItem}>
              <Text style={[styles.summaryNumber, { color: '#6c757d' }]}>
                {items.filter(item => item.status === 'ไม่ระบุ').length}
              </Text>
              <Text style={styles.summaryLabel}>ไม่ระบุ</Text>
            </View>
          </View>
        </View>

        {/* ✅ ส่วนฟิลเตอร์ */}
        <View style={styles.filterContainer}>
          <Text style={styles.filterTitle}>🔍 กรองตามสถานะ:</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.filterScrollView}>
            {filterOptions.map(option => (
              <FilterButton
                key={option.key}
                label={option.label}
                isActive={activeFilter === option.key}
                onPress={() => setActiveFilter(option.key)}
                color={option.color}
                icon={option.icon}
              />
            ))}
          </ScrollView>
        </View>

        {/* ✅ แสดงผลลัพธ์การฟิลเตอร์ */}
        {filteredItems.length === 0 && (
          <View style={styles.emptyState}>
            <Ionicons name="search" size={48} color="#ccc" />
            <Text style={styles.emptyStateText}>
              ไม่พบรายการยาที่มีสถานะ "{activeFilter}"
            </Text>
            <TouchableOpacity
              style={styles.resetFilterButton}
              onPress={() => setActiveFilter('ทั้งหมด')}
            >
              <Text style={styles.resetFilterText}>แสดงทั้งหมด</Text>
            </TouchableOpacity>
          </View>
        )}

        {/* รายการยาแบ่งตามช่วงเวลา */}
        {Object.entries(medicationGroups).map(([key, group]) => {
          if (group.items.length === 0) return null;

          return (
            <View key={key} style={styles.timeGroup}>
              <TimeSection
                title={group.title}
                count={group.items.length}
                icon={group.icon}
              />

              {group.items.map((med) => (
                <View key={med.id} style={styles.card}>
                  <View style={styles.cardHeader}>
                    <ImportanceBadge level={med.importance} />
                    <StatusBadge
                      status={med.status}
                      onPress={() => openModal(med)}
                    />
                  </View>

                  <View style={styles.cardContent}>
                    <Text style={styles.time}>{med.time}</Text>
                    <Text style={styles.name}>{med.name}</Text>
                    <View style={styles.detailsRow}>
                      <Text style={styles.dose}>ประเภทยา: {med.medType}</Text>
                      <Text style={styles.dose}>ขนาดยา: {med.dose}</Text>
                    </View>
                  </View>

                  <TouchableOpacity
                    style={styles.recordButton}
                    onPress={() => openModal(med)}
                  >
                    <Ionicons name="create" size={16} color="#4dabf7" />
                    <Text style={styles.recordButtonText}>
                      {med.status === 'รอกิน' ? 'บันทึกการกิน' : 'ดูรายละเอียด'} {/* ✅ */}
                    </Text>
                  </TouchableOpacity>
                </View>
              ))}
            </View>
          );
        })}

        {/* Modal สำหรับยืนยันการกินยา */}
      <Modal visible={modalVisible} animationType="slide" transparent={true}>
        <View style={styles.modalBackground}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Ionicons name="medical" size={30} color="#4dabf7" />
              <Text style={styles.modalTitle}>
                {modalMode === 'record' ? 'บันทึกการกินยา' : 'รายละเอียดการกินยา'}
              </Text>
            </View>

            {selectedItem && (
              <>
                <View style={styles.modalInfo}>
                  <Text style={styles.modalMedName}>{selectedItem.name}</Text>
                  <Text style={styles.modalDetail}>เวลาที่กำหนด: {selectedItem.time}</Text>
                  <Text style={styles.modalDetail}>ขนาดยา: {selectedItem.dose}</Text>
                  <Text style={styles.modalDetail}>ประเภทยา: {selectedItem.medType}</Text>
                  <Text style={[styles.modalDetail, { fontWeight: 'bold' }]}>
                    สถานะปัจจุบัน: {selectedItem.status}
                  </Text>
                </View>

                {/* ✅ แสดงส่วนกรอกข้อมูลเฉพาะโหมด 'record' และ 'edit' */}
                {(modalMode === 'record' || modalMode === 'edit') && (
                  <>
                    {/* ส่วนเลือกเวลาที่กินยาจริง */}
                    <View style={styles.inputSection}>
                      <Text style={styles.inputLabel}>⏰ เวลาที่กินยาจริง:</Text>
                      <TouchableOpacity 
                        style={styles.timeSelector} 
                        onPress={isEditable ? showTimePickerModal : null}
                      >
                        <Ionicons name="time" size={20} color="#4dabf7" />
                        <Text style={styles.timeText}>{actualTakeTime}</Text>
                        <Ionicons name="chevron-down" size={16} color="#666" />
                      </TouchableOpacity>
                    </View>

                    {/* ช่องกรอกผลข้างเคียง */}
                    <View style={styles.inputSection}>
                      <Text style={styles.inputLabel}>💊 ผลข้างเคียง (ถ้ามี):</Text>
                      <TextInput
                        style={styles.textInput}
                        placeholder="เช่น คลื่นไส้, ง่วงนอน, ปวดหัว..."
                        value={sideEffects}
                        onChangeText={setSideEffects}
                        multiline
                        maxLength={200}
                        textAlignVertical="top"
                        editable={isEditable}
                      />
                      <Text style={styles.characterCount}>{sideEffects.length}/200</Text>
                    </View>
                  </>
                )}

                {/* ปุ่มล่างของโมดัล */}
                {modalMode === 'record' && (
                  <View style={styles.modalButtonRow}>
                    <TouchableOpacity style={styles.cancelBtn} onPress={closeModal}>
                      <Ionicons name="close" size={16} color="#fff" />
                      <Text style={styles.cancelText}>ยกเลิก</Text>
                    </TouchableOpacity>

                    <TouchableOpacity
                      style={styles.confirmBtn}
                      onPress={() => toggleStatus(selectedItem, sideEffects, actualTakeTime, 'กินแล้ว')}
                    >
                      <Ionicons name="checkmark" size={16} color="#fff" />
                      <Text style={styles.confirmText}>ทานยาแล้ว</Text>
                    </TouchableOpacity>

                    <TouchableOpacity
                      style={styles.dontconfirmBtn}
                      onPress={() => toggleStatus(selectedItem, '', '', 'ข้าม')} // ✅ ไม่ส่ง actualTime
                    >
                      <Ionicons name="close-circle" size={16} color="#fff" />
                      <Text style={styles.dontconfirmText}>ข้ามยา</Text>
                    </TouchableOpacity>
                  </View>
                )}

                {modalMode === 'detail' && (
                  <View style={styles.modalButtonRow}>
                    <TouchableOpacity style={styles.cancelBtn} onPress={closeModal}>
                      <Ionicons name="close" size={16} color="#fff" />
                      <Text style={styles.cancelText}>ปิด</Text>
                    </TouchableOpacity>
                    <TouchableOpacity style={styles.confirmBtn} onPress={() => setModalMode('edit')}>
                      <Ionicons name="create" size={16} color="#fff" />
                      <Text style={styles.confirmText}>แก้ไข</Text>
                    </TouchableOpacity>
                  </View>
                )}

                {modalMode === 'edit' && (
                  <View style={styles.modalButtonRow}>
                    <TouchableOpacity
                      style={styles.cancelBtn}
                      onPress={() => setModalMode('detail')}
                    >
                      <Ionicons name="close" size={16} color="#fff" />
                      <Text style={styles.cancelText}>ยกเลิก</Text>
                    </TouchableOpacity>
                    <TouchableOpacity style={styles.confirmBtn} onPress={saveEdits}>
                      <Ionicons name="save" size={16} color="#fff" />
                      <Text style={styles.confirmText}>บันทึกการเปลี่ยนแปลง</Text>
                    </TouchableOpacity>
                  </View>
                )}
              </>
            )}
          </View>
        </View>
      </Modal>

        {/* DateTimePicker */}
        {showTimePicker && (
          <DateTimePicker
            value={medTime}
            mode="time"
            is24Hour={true}
            display="default"
            onChange={handleTimeChange}
          />
        )}

        {/* เมนูด้านล่าง */}
        <View style={styles.menu}>
          <TouchableOpacity style={styles.menuItem} onPress={() => navigation.navigate('MedicationListScreen')}>
            <View style={styles.menuItemLeft}>
              <Ionicons name="medical" size={20} color="#fff" />
              <Text style={styles.menuText}>รายการยา</Text>
            </View>
            <Ionicons name="chevron-forward" size={20} color="#fff" />
          </TouchableOpacity>

          <TouchableOpacity style={styles.menuItem} onPress={() => navigation.navigate('Calendar')}>
            <View style={styles.menuItemLeft}>
              <Ionicons name="calendar" size={20} color="#fff" />
              <Text style={styles.menuText}>ปฏิทิน</Text>
            </View>
            <Ionicons name="chevron-forward" size={20} color="#fff" />
          </TouchableOpacity>

          <TouchableOpacity style={styles.menuItem} onPress={() => navigation.navigate('History')}>
            <View style={styles.menuItemLeft}>
              <Ionicons name="stats-chart" size={20} color="#fff" />
              <Text style={styles.menuText}>สรุปประวัติการกินยา</Text>
            </View>
            <Ionicons name="chevron-forward" size={20} color="#fff" />
          </TouchableOpacity>

          <TouchableOpacity style={styles.menuItem} onPress={() => navigation.navigate('SettingsScreen')}>
            <View style={styles.menuItemLeft}>
              <Ionicons name="settings" size={20} color="#fff" />
              <Text style={styles.menuText}>การตั้งค่า</Text>
            </View>
            <Ionicons name="chevron-forward" size={20} color="#fff" />
          </TouchableOpacity>

          {/* ✅ ปุ่มออกจากระบบ */}
          <TouchableOpacity
            style={[styles.menuItem, styles.logoutButton]}
            onPress={handleLogout}
          >
            <View style={styles.menuItemLeft}>
              <Ionicons name="log-out" size={20} color="#fff" />
              <Text style={styles.menuText}>ออกจากระบบ</Text>
            </View>
            <Ionicons name="chevron-forward" size={20} color="#fff" />
          </TouchableOpacity>
        </View>
      </ScrollView>
    </View>

  );

};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8f9fa',
    padding: 15,
  },
  scrollContent: {
    padding: 15,
    paddingBottom: 40, // เพิ่ม padding ด้านล่างเพื่อให้เลื่อนดูได้สบาย
  },
  headerBox: {
    backgroundColor: '#4dabf7',
    borderRadius: 16,
    marginBottom: 15,
    overflow: 'hidden',
    elevation: 3,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },

  header: {
    fontSize: 20,
    fontWeight: 'bold',
    textAlign: 'center',
    color: '#fff',
    paddingVertical: 15
  },

  date: {
    paddingTop: 0,
    paddingVertical: 12,
    textAlign: 'center',
    color: '#fff',
    fontSize: 16,
  },

  summaryCard: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    marginBottom: 20,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
  },

  summaryTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 12,
    textAlign: 'center',
  },

  summaryRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
  },

  summaryItem: {
    alignItems: 'center',
  },

  summaryNumber: {
    fontSize: 20, // ลดขนาดเล็กน้อยเพื่อให้ดูสมดุล
    fontWeight: 'bold',
    color: '#4dabf7',
  },

  summaryLabel: {
    fontSize: 11, // ลดขนาดเล็กน้อย
    color: '#666',
    marginTop: 4,
  },

  // ✅ สไตล์สำหรับส่วนฟิลเตอร์
  filterContainer: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    marginBottom: 20,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
  },

  filterTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 12,
  },

  filterScrollView: {
    flexDirection: 'row',
  },

  filterButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 20,
    borderWidth: 1.5,
    borderColor: '#e0e0e0',
    backgroundColor: '#f8f9fa',
    marginRight: 8,
    gap: 6,
  },

  filterButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#666',
  },

  // ✅ สไตล์สำหรับ Empty State
  emptyState: {
    alignItems: 'center',
    paddingVertical: 40,
    backgroundColor: '#fff',
    borderRadius: 12,
    marginBottom: 20,
  },

  emptyStateText: {
    fontSize: 16,
    color: '#666',
    textAlign: 'center',
    marginTop: 16,
    marginBottom: 20,
  },

  resetFilterButton: {
    backgroundColor: '#4dabf7',
    paddingVertical: 10,
    paddingHorizontal: 20,
    borderRadius: 20,
  },

  resetFilterText: {
    color: '#fff',
    fontWeight: '600',
  },

  timeGroup: {
    marginBottom: 24,
  },

  timeSectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#fff',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 12,
    marginBottom: 8,
    elevation: 1,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
  },

  timeSectionLeft: {
    flexDirection: 'row',
    alignItems: 'center',
  },

  timeSectionTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
    marginLeft: 8,
  },

  medicationCount: {
    backgroundColor: '#e3f2fd',
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 12,
  },

  medicationCountText: {
    fontSize: 12,
    color: '#4dabf7',
    fontWeight: '600',
  },

  card: {
    backgroundColor: '#fff',
    padding: 16,
    borderRadius: 12,
    marginBottom: 8,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    marginLeft: 8,
    borderLeftWidth: 4,
    borderLeftColor: '#4dabf7',
  },

  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },

  cardContent: {
    marginBottom: 12,
  },

  time: {
    fontSize: 14,
    color: '#666',
    marginBottom: 4,
  },

  name: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#222',
    marginBottom: 8,
  },

  detailsRow: {
    gap: 4,
  },

  dose: {
    color: '#666',
    fontSize: 14,
    marginBottom: 2,
  },

  importanceBadge: {
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 16,
  },

  importanceText: {
    color: '#fff',
    fontWeight: 'bold',
    fontSize: 12,
  },

  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 16,
    gap: 4,
  },

  statusText: {
    color: '#fff',
    fontWeight: 'bold',
    fontSize: 12,
  },

  recordButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#e3f2fd',
    paddingVertical: 8,
    borderRadius: 8,
    gap: 6,
  },

  recordButtonText: {
    color: '#4dabf7',
    fontWeight: '600',
    fontSize: 14,
  },

  modalBackground: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0,0,0,0.5)',
  },

  modalContent: {
    backgroundColor: '#fff',
    padding: 24,
    borderRadius: 16,
    width: '90%',
    maxWidth: 400,
    maxHeight: '80%',
  },

  modalHeader: {
    alignItems: 'center',
    marginBottom: 20,
  },

  modalTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
    marginTop: 8,
  },

  modalInfo: {
    backgroundColor: '#f8f9fa',
    padding: 16,
    borderRadius: 12,
    marginBottom: 16,
  },

  modalMedName: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 8,
  },

  modalDetail: {
    fontSize: 14,
    color: '#666',
    marginBottom: 4,
  },

  // ✅ สไตล์ใหม่สำหรับส่วนกรอกข้อมูล
  inputSection: {
    marginBottom: 16,
  },

  inputLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#333',
    marginBottom: 8,
  },

  timeSelector: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f8f9fa',
    paddingHorizontal: 12,
    paddingVertical: 12,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#e0e0e0',
    gap: 8,
  },

  timeText: {
    flex: 1,
    fontSize: 16,
    color: '#333',
  },

  textInput: {
    backgroundColor: '#f8f9fa',
    borderWidth: 1,
    borderColor: '#e0e0e0',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 12,
    fontSize: 14,
    color: '#333',
    minHeight: 80,
  },

  characterCount: {
    fontSize: 12,
    color: '#999',
    textAlign: 'right',
    marginTop: 4,
  },

  recordButtonText: {
    color: '#4dabf7',
    fontWeight: '600',
    fontSize: 14,
  },

  modalBackground: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0,0,0,0.5)',
  },

  modalContent: {
    backgroundColor: '#fff',
    padding: 24,
    borderRadius: 16,
    width: '85%',
    maxWidth: 400,
  },

  modalHeader: {
    alignItems: 'center',
    marginBottom: 20,
  },

  modalTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
    marginTop: 8,
  },

  modalInfo: {
    backgroundColor: '#f8f9fa',
    padding: 16,
    borderRadius: 12,
    marginBottom: 20,
  },

  modalMedName: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 8,
  },

  modalDetail: {
    fontSize: 14,
    color: '#666',
    marginBottom: 4,
  },

  modalButtonRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 12,
  },

  cancelBtn: {
    flex: 1,
    backgroundColor: '#6c757d',
    padding: 12,
    borderRadius: 12,
    alignItems: 'center',
  },

  confirmBtn: {
    flex: 1,
    backgroundColor: '#4dabf7',
    padding: 12,
    borderRadius: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
  },

  //ปุ่มไม่ทานยา
  dontconfirmBtn: {
    flex: 1,
    backgroundColor: '#f74d4dff',
    padding: 12,
    borderRadius: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
  },

  cancelText: {
    color: '#fff',
    fontWeight: '600',
  },

  confirmText: {
    color: '#fff',
    fontWeight: '600',
  },

  //ปุ่มไม่ทานยา
  dontconfirmText: {
    color: '#fff',
    fontWeight: '600',
  },

  menu: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    marginTop: 20,
    marginBottom: 20, // ✅ เพิ่ม margin ด้านล่าง
  },

  menuItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 16,
    paddingHorizontal: 24,
    backgroundColor: '#4dabf7',
    borderRadius: 8,
    marginBottom: 10,
    elevation: 5,
  },

  // ✅ สไตล์สำหรับปุ่มออกจากระบบ (สีแดง)
  logoutButton: {
    backgroundColor: '#dc3545', // สีแดง
    marginTop: 10, // เว้นระยะจากปุ่มอื่น
  },

  menuItemLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },

  menuText: {
    fontSize: 16,
    color: '#fff',
    fontWeight: '600',
  },

  // ...inside StyleSheet.create({...})
  screenWrapper: {
    flex: 1,
    backgroundColor: '#f8f9fa'
  },
  notificationOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    zIndex: 999
  },
  notificationStack: {
    paddingTop: Platform.select({ ios: 50, android: 20 }),
    paddingHorizontal: 12
  },
  notificationCard: {
    backgroundColor: '#4dabf7',
    borderRadius: 14,
    padding: 14,
    marginBottom: 10,
    elevation: 5,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 4
  },
  notificationHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4
  },
  notificationTitle: {
    color: '#fff',
    fontWeight: '700',
    fontSize: 14
  },
  notificationMessage: {
    color: '#fff',
    fontSize: 13,
    marginBottom: 10
  },
  notificationActions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: 8
  },
  notifBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 20,
    gap: 4
  },
  notifBtnText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '600'
  },

});

export default HomeScreen;