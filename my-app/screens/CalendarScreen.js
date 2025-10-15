import React, { useEffect, useState } from 'react';
import {
    View,
    Text,
    StyleSheet,
    ScrollView,
    TouchableOpacity,
    Modal,
    TextInput,
    Alert,
    ActivityIndicator,
    Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import DateTimePicker from '@react-native-community/datetimepicker';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { BASE_URL } from './config';

const CalendarScreen = ({ navigation }) => {
    const [currentDate, setCurrentDate] = useState(new Date());
    const [selectedDate, setSelectedDate] = useState(new Date());
    const [medicationsData, setMedicationsData] = useState({});
    const [loading, setLoading] = useState(false);
    const [selectedDayMeds, setSelectedDayMeds] = useState([]);

    // Modal states
    const [modalVisible, setModalVisible] = useState(false);
    const [selectedMed, setSelectedMed] = useState(null);
    const [modalMode, setModalMode] = useState('detail');
    const [sideEffects, setSideEffects] = useState('');
    const [actualTakeTime, setActualTakeTime] = useState('');
    const [showTimePicker, setShowTimePicker] = useState(false);
    const [medTime, setMedTime] = useState(new Date());

    // Tooltip state
    const [tooltipVisible, setTooltipVisible] = useState(false);
    const [tooltipData, setTooltipData] = useState(null);
    const [tooltipPosition, setTooltipPosition] = useState({ x: 0, y: 0 });

    const thaiMonths = [
        'มกราคม', 'กุมภาพันธ์', 'มีนาคม', 'เมษายน', 'พฤษภาคม', 'มิถุนายน',
        'กรกฎาคม', 'สิงหาคม', 'กันยายน', 'ตุลาคม', 'พฤศจิกายน', 'ธันวาคม'
    ];

    const thaiDays = ['อา', 'จ', 'อ', 'พ', 'พฤ', 'ศ', 'ส'];

    const formatDate = (date) => {
        const y = date.getFullYear();
        const m = String(date.getMonth() + 1).padStart(2, '0');
        const d = String(date.getDate()).padStart(2, '0');
        return `${y}-${m}-${d}`;
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

    const loadMedicationsForMonth = async () => {
        setLoading(true);
        const userId = await AsyncStorage.getItem('userId');
        if (!userId) {
            setLoading(false);
            return;
        }

        try {
            const year = currentDate.getFullYear();
            const month = currentDate.getMonth();
            const firstDay = new Date(year, month, 1);
            const lastDay = new Date(year, month + 1, 0);

            const tempData = {};

            for (let d = new Date(firstDay); d <= lastDay; d.setDate(d.getDate() + 1)) {
                const dateStr = formatDate(d);
                const res = await fetch(`${BASE_URL}/api/reminders/today?userId=${userId}&date=${dateStr}`);
                const data = await res.json();

                const scheduledOnly = Array.isArray(data) ? data.filter(r => r.ScheduleID) : [];
                tempData[dateStr] = scheduledOnly;
            }

            setMedicationsData(tempData);
            updateSelectedDayMeds(formatDate(selectedDate), tempData);
        } catch (error) {
            console.error('Error loading medications:', error);
            Alert.alert('เกิดข้อผิดพลาด', 'ไม่สามารถโหลดข้อมูลได้');
        } finally {
            setLoading(false);
        }
    };

    const updateSelectedDayMeds = (dateStr, data = medicationsData) => {
        const dayData = data[dateStr] || [];
        const mapped = dayData.map((r, i) => ({
            id: r.ScheduleID || `${r.MedicationID}-${i}`,
            scheduleId: r.ScheduleID || null,
            medicationId: r.MedicationID,
            time: r.Time ? r.Time.slice(0, 5) : '',
            rawTime: r.Time,
            name: r.name,
            dose: r.Dosage != null && r.DosageType ? `${r.Dosage} ${r.DosageType}` : '-',
            status: r.Status || 'รอกิน',
            mealName: r.MealName || '',
            medType: r.TypeName || '-',
            importance: r.PriorityLabel || 'ปกติ',
            actualTime: r.ActualTime || null,
            sideEffects: r.SideEffects || null,
        }));
        setSelectedDayMeds(mapped);
    };

    useEffect(() => {
        loadMedicationsForMonth();
    }, [currentDate]);

    useEffect(() => {
        const unsubscribe = navigation.addListener('focus', () => {
            loadMedicationsForMonth();
        });
        return unsubscribe;
    }, [currentDate]);

    const getDaysInMonth = (date) => {
        const year = date.getFullYear();
        const month = date.getMonth();
        const firstDay = new Date(year, month, 1);
        const lastDay = new Date(year, month + 1, 0);
        const daysInMonth = lastDay.getDate();
        const startDay = firstDay.getDay();

        const days = [];

        for (let i = 0; i < startDay; i++) {
            days.push({ day: '', isCurrentMonth: false });
        }

        for (let i = 1; i <= daysInMonth; i++) {
            days.push({ day: i, isCurrentMonth: true });
        }

        return days;
    };

    const getStatusDots = (dateStr) => {
        const meds = medicationsData[dateStr] || [];
        if (meds.length === 0) return [];

        const statusCount = {
            'กินแล้ว': 0,
            'ข้าม': 0,
            'รอกิน': 0,
            'ไม่ระบุ': 0
        };

        meds.forEach(m => {
            const status = m.Status || 'ไม่ระบุ';
            statusCount[status] = (statusCount[status] || 0) + 1;
        });

        const dots = [];
        if (statusCount['กินแล้ว'] > 0) dots.push({ color: '#28a745', count: statusCount['กินแล้ว'] });
        if (statusCount['รอกิน'] > 0) dots.push({ color: '#ffc107', count: statusCount['รอกิน'] });
        if (statusCount['ข้าม'] > 0) dots.push({ color: '#dc3545', count: statusCount['ข้าม'] });
        if (statusCount['ไม่ระบุ'] > 0) dots.push({ color: '#6c757d', count: statusCount['ไม่ระบุ'] });

        return dots;
    };

    const changeMonth = (delta) => {
        const newDate = new Date(currentDate);
        newDate.setMonth(newDate.getMonth() + delta);
        setCurrentDate(newDate);
    };

    const onDatePress = (day) => {
        if (!day) return;
        const year = currentDate.getFullYear();
        const month = currentDate.getMonth();
        const newSelectedDate = new Date(year, month, day);
        setSelectedDate(newSelectedDate);
        updateSelectedDayMeds(formatDate(newSelectedDate));
    };

    const onDateLongPress = (day, event) => {
        if (!day) return;
        const year = currentDate.getFullYear();
        const month = currentDate.getMonth();
        const dateStr = formatDate(new Date(year, month, day));
        const meds = medicationsData[dateStr] || [];

        if (meds.length === 0) return;

        const statusCount = {
            'กินแล้ว': 0,
            'ข้าม': 0,
            'รอกิน': 0,
            'ไม่ระบุ': 0
        };

        meds.forEach(m => {
            const status = m.Status || 'ไม่ระบุ';
            statusCount[status] = (statusCount[status] || 0) + 1;
        });

        setTooltipData({
            date: `${day} ${thaiMonths[month]}`,
            ...statusCount
        });
        setTooltipVisible(true);

        setTimeout(() => setTooltipVisible(false), 3000);
    };

    const isToday = (day) => {
        const today = new Date();
        return (
            day === today.getDate() &&
            currentDate.getMonth() === today.getMonth() &&
            currentDate.getFullYear() === today.getFullYear()
        );
    };

    const isSelected = (day) => {
        return (
            day === selectedDate.getDate() &&
            currentDate.getMonth() === selectedDate.getMonth() &&
            currentDate.getFullYear() === selectedDate.getFullYear()
        );
    };

    const isFutureDate = (day) => {
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        const checkDate = new Date(currentDate.getFullYear(), currentDate.getMonth(), day);
        checkDate.setHours(0, 0, 0, 0);
        return checkDate > today;
    };

    const getStatusBadgeStyle = (status) => {
        switch (status) {
            case 'กินแล้ว':
                return { backgroundColor: '#28a745', text: 'กินแล้ว', icon: 'checkmark-circle' };
            case 'ข้าม':
                return { backgroundColor: '#dc3545', text: 'ข้าม', icon: 'close-circle' };
            case 'รอกิน':
                return { backgroundColor: '#ffc107', text: 'รอกิน', icon: 'time-outline' };
            default:
                return { backgroundColor: '#6c757d', text: 'ไม่ระบุ', icon: 'help-circle-outline' };
        }
    };

    const openMedModal = (med) => {
        const today = new Date();
        const selected = new Date(selectedDate);
        selected.setHours(0, 0, 0, 0);
        today.setHours(0, 0, 0, 0);

        if (selected > today) {
            Alert.alert(
                '❌ ไม่สามารถบันทึกได้',
                'คุณไม่สามารถบันทึกข้อมูลล่วงหน้าได้\nกรุณาเลือกวันปัจจุบันหรือย้อนหลัง'
            );
            return;
        }

        setSelectedMed(med);
        setModalVisible(true);
        setSideEffects(med.sideEffects || '');
        setActualTakeTime(
            med.actualTime
                ? med.actualTime.slice(0, 5)
                : new Date().toLocaleTimeString('th-TH', { hour: '2-digit', minute: '2-digit' })
        );

        if (med.status === 'รอกิน') {
            setModalMode('record');
        } else {
            setModalMode('detail');
        }
    };

    const closeMedModal = () => {
        setModalVisible(false);
        setSelectedMed(null);
        setSideEffects('');
        setShowTimePicker(false);
        setModalMode('detail');
    };

    const handleTimeChange = (event, selectedTime) => {
        setShowTimePicker(false);
        if (selectedTime) {
            setMedTime(selectedTime);
            const formattedTime = selectedTime.toLocaleTimeString('th-TH', {
                hour: '2-digit',
                minute: '2-digit'
            });
            setActualTakeTime(formattedTime);
        }
    };

    const updateMedicationStatus = async (newStatus) => {
        if (!selectedMed?.scheduleId) {
            Alert.alert('ข้อผิดพลาด', 'ไม่สามารถบันทึกข้อมูลได้');
            return;
        }

        const today = new Date();
        const selected = new Date(selectedDate);
        selected.setHours(0, 0, 0, 0);
        today.setHours(0, 0, 0, 0);

        if (selected > today) {
            Alert.alert(
                'ไม่สามารถบันทึกล่วงหน้าได้',
                'คุณสามารถบันทึกได้เฉพาะวันที่ปัจจุบันหรือย้อนหลังเท่านั้น'
            );
            return;
        }

        if (selected < today) {
            const dateLabel = selected.toLocaleDateString('th-TH', {
                day: 'numeric', month: 'long', year: 'numeric'
            });
            const confirmed = await new Promise((resolve) => {
                Alert.alert(
                    '⚠️ ยืนยันการบันทึกย้อนหลัง',
                    `คุณกำลังบันทึกข้อมูลย้อนหลังของวันที่ ${dateLabel}\nต้องการดำเนินการต่อหรือไม่?`,
                    [
                        { text: 'ยกเลิก', onPress: () => resolve(false), style: 'cancel' },
                        { text: 'ยืนยัน', onPress: () => resolve(true) },
                    ]
                );
            });
            if (!confirmed) return;
        }

        try {
            const actualTimeNormalized = (newStatus === 'ข้าม')
                ? null
                : normalizeTime(actualTakeTime);

            const updateData = {
                status: newStatus,
                sideEffects: sideEffects || null,
                actualTime: actualTimeNormalized,
                recordedAt: new Date().toISOString(),
            };

            const res = await fetch(
                `${BASE_URL}/api/schedule/${selectedMed.scheduleId}/status`,
                {
                    method: 'PATCH',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(updateData),
                }
            );

            if (!res.ok) {
                throw new Error(`Failed to update: ${res.status}`);
            }

            await loadMedicationsForMonth();
            closeMedModal();

            const statusText = newStatus === 'กินแล้ว' ? 'ทานยาแล้ว' :
                newStatus === 'ข้าม' ? 'ข้ามยา' : 'อัปเดตสถานะ';
            Alert.alert('บันทึกสำเร็จ', `สถานะ: ${statusText}`);
        } catch (error) {
            console.error('Error updating status:', error);
            Alert.alert('เกิดข้อผิดพลาด', 'ไม่สามารถบันทึกข้อมูลได้');
        }
    };

    const saveEdits = async () => {
        if (!selectedMed?.scheduleId) {
            setModalMode('detail');
            return;
        }

        try {
            const actualTimeNormalized = (selectedMed.status === 'ข้าม')
                ? null
                : normalizeTime(actualTakeTime);

            const updateData = {
                status: selectedMed.status,
                sideEffects: sideEffects || null,
                actualTime: actualTimeNormalized,
                recordedAt: new Date().toISOString(),
            };

            const res = await fetch(
                `${BASE_URL}/api/schedule/${selectedMed.scheduleId}/status`,
                {
                    method: 'PATCH',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(updateData),
                }
            );

            if (!res.ok) {
                throw new Error(`Update failed: ${res.status}`);
            }

            await loadMedicationsForMonth();
            setModalMode('detail');
            Alert.alert('บันทึกสำเร็จ', 'อัปเดตรายละเอียดการกินยาแล้ว');
        } catch (e) {
            console.error(e);
            Alert.alert('เกิดข้อผิดพลาด', 'ไม่สามารถบันทึกการเปลี่ยนแปลงได้');
        }
    };

    const days = getDaysInMonth(currentDate);

    const todayStr = formatDate(new Date());
    const todayMeds = medicationsData[todayStr] || [];
    const totalToday = todayMeds.length;
    const completedToday = todayMeds.filter(m => m.Status === 'กินแล้ว').length;
    const skippedToday = todayMeds.filter(m => m.Status === 'ข้าม').length;
    const pendingToday = todayMeds.filter(m => m.Status === 'รอกิน').length;

    const isEditable = modalMode === 'record' || modalMode === 'edit';

    return (
        <View style={styles.container}>
            <ScrollView showsVerticalScrollIndicator={false}>
                {/* Modern Header */}
                <View style={styles.headerBox}>
                    <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
                        <Ionicons name="arrow-back" size={24} color="#fff" />
                    </TouchableOpacity>
                    <View style={styles.headerCenter}>
                        <View style={styles.iconCircle}>
                            <Ionicons name="calendar" size={28} color="#4dabf7" />
                        </View>
                        <View>
                            <Text style={styles.headerTitle}>ปฏิทินการกินยา</Text>
                            <Text style={styles.headerSubtitle}>ติดตามและบันทึกการทานยา</Text>
                        </View>
                    </View>
                    <View style={{ width: 40 }} />
                </View>

                {/* Today's Summary */}
                {/* <View style={styles.summaryCard}>
          <View style={styles.summaryHeader}>
            <Ionicons name="today" size={20} color="#4dabf7" />
            <Text style={styles.summaryTitle}>สรุปวันนี้</Text>
          </View>
          <View style={styles.summaryGrid}>
            <View style={styles.summaryItem}>
              <View style={[styles.summaryIconBox, { backgroundColor: '#e3f2fd' }]}>
                <Ionicons name="medical" size={20} color="#4dabf7" />
              </View>
              <Text style={styles.summaryNumber}>{totalToday}</Text>
              <Text style={styles.summaryLabel}>ทั้งหมด</Text>
            </View>
            <View style={styles.summaryItem}>
              <View style={[styles.summaryIconBox, { backgroundColor: '#d4edda' }]}>
                <Ionicons name="checkmark-circle" size={20} color="#28a745" />
              </View>
              <Text style={[styles.summaryNumber, { color: '#28a745' }]}>{completedToday}</Text>
              <Text style={styles.summaryLabel}>กินแล้ว</Text>
            </View>
            <View style={styles.summaryItem}>
              <View style={[styles.summaryIconBox, { backgroundColor: '#fff3cd' }]}>
                <Ionicons name="time" size={20} color="#ffc107" />
              </View>
              <Text style={[styles.summaryNumber, { color: '#ffc107' }]}>{pendingToday}</Text>
              <Text style={styles.summaryLabel}>รอกิน</Text>
            </View>
            <View style={styles.summaryItem}>
              <View style={[styles.summaryIconBox, { backgroundColor: '#f8d7da' }]}>
                <Ionicons name="close-circle" size={20} color="#dc3545" />
              </View>
              <Text style={[styles.summaryNumber, { color: '#dc3545' }]}>{skippedToday}</Text>
              <Text style={styles.summaryLabel}>ข้าม</Text>
            </View>
          </View>
        </View> */}

                {/* Month Navigator */}
                <View style={styles.monthNavigator}>
                    <TouchableOpacity onPress={() => changeMonth(-1)} style={styles.navButton}>
                        <Ionicons name="chevron-back" size={24} color="#4dabf7" />
                    </TouchableOpacity>

                    <View style={styles.monthTextContainer}>
                        <Text style={styles.monthText}>{thaiMonths[currentDate.getMonth()]}</Text>
                        <Text style={styles.yearText}>{currentDate.getFullYear() + 543}</Text>
                    </View>

                    <TouchableOpacity onPress={() => changeMonth(1)} style={styles.navButton}>
                        <Ionicons name="chevron-forward" size={24} color="#4dabf7" />
                    </TouchableOpacity>
                </View>

                {/* Calendar */}
                <View style={styles.calendarCard}>
                    <View style={styles.weekDaysRow}>
                        {thaiDays.map((day, idx) => (
                            <View key={idx} style={styles.weekDayCell}>
                                <Text style={[
                                    styles.weekDayText,
                                    idx === 0 && { color: '#dc3545' },
                                    idx === 6 && { color: '#4dabf7' }
                                ]}>
                                    {day}
                                </Text>
                            </View>
                        ))}
                    </View>

                    {loading ? (
                        <View style={styles.loadingContainer}>
                            <ActivityIndicator size="large" color="#4dabf7" />
                            <Text style={styles.loadingText}>กำลังโหลดข้อมูล...</Text>
                        </View>
                    ) : (
                        <View style={styles.calendarGrid}>
                            {days.map((item, index) => {
                                if (!item.isCurrentMonth || !item.day) {
                                    return <View key={index} style={styles.dayCell} />;
                                }

                                const dateStr = formatDate(
                                    new Date(currentDate.getFullYear(), currentDate.getMonth(), item.day)
                                );
                                const statusDots = getStatusDots(dateStr);
                                const isTodayDate = isToday(item.day);
                                const isSelectedDate = isSelected(item.day);
                                const isFuture = isFutureDate(item.day);

                                return (
                                    <TouchableOpacity
                                        key={index}
                                        style={[
                                            styles.dayCell,
                                            isTodayDate && styles.todayCell,
                                            isSelectedDate && styles.selectedCell,
                                            isFuture && styles.futureCell,
                                        ]}
                                        onPress={() => onDatePress(item.day)}
                                        onLongPress={(e) => onDateLongPress(item.day, e)}
                                        activeOpacity={0.7}
                                        disabled={loading}
                                    >
                                        <Text
                                            style={[
                                                styles.dayText,
                                                isTodayDate && styles.todayText,
                                                isSelectedDate && styles.selectedText,
                                                isFuture && styles.futureText,
                                            ]}
                                        >
                                            {item.day}
                                        </Text>
                                        {statusDots.length > 0 && (
                                            <View style={styles.dotsContainer}>
                                                {statusDots.slice(0, 3).map((dot, idx) => (
                                                    <View
                                                        key={idx}
                                                        style={[styles.statusDot, { backgroundColor: dot.color }]}
                                                    />
                                                ))}
                                            </View>
                                        )}
                                    </TouchableOpacity>
                                );
                            })}
                        </View>
                    )}
                </View>

                {/* Selected Day Medications */}
                <View style={styles.selectedDaySection}>
                    <View style={styles.selectedDayHeader}>
                        <View style={styles.selectedDayLeft}>
                            <Ionicons name="calendar-outline" size={20} color="#4dabf7" />
                            <Text style={styles.selectedDayTitle}>
                                {selectedDate.getDate()} {thaiMonths[selectedDate.getMonth()]} {selectedDate.getFullYear() + 543}
                            </Text>
                        </View>
                        {selectedDayMeds.length > 0 && (
                            <View style={styles.medCountBadge}>
                                <Text style={styles.medCountText}>{selectedDayMeds.length}</Text>
                            </View>
                        )}
                    </View>

                    {selectedDayMeds.length === 0 ? (
                        <View style={styles.emptyState}>
                            <View style={styles.emptyIconCircle}>
                                <Ionicons name="medical-outline" size={48} color="#ccc" />
                            </View>
                            <Text style={styles.emptyTitle}>ไม่มีรายการยา</Text>
                            <Text style={styles.emptyText}>ไม่มีรายการยาในวันที่เลือก</Text>
                        </View>
                    ) : (
                        <View style={styles.medicationsList}>
                            {selectedDayMeds.map((med) => {
                                const badgeStyle = getStatusBadgeStyle(med.status);
                                return (
                                    <TouchableOpacity
                                        key={med.id}
                                        style={styles.medCard}
                                        onPress={() => openMedModal(med)}
                                        activeOpacity={0.7}
                                    >
                                        <View style={styles.medCardHeader}>
                                            <View style={styles.medTimeBox}>
                                                <Ionicons name="time-outline" size={16} color="#666" />
                                                <Text style={styles.medTime}>
                                                    {med.mealName} {med.time} น.
                                                </Text>
                                            </View>
                                            <View style={[styles.statusBadge, { backgroundColor: badgeStyle.backgroundColor }]}>
                                                <Ionicons name={badgeStyle.icon} size={14} color="#fff" />
                                                <Text style={styles.statusBadgeText}>{badgeStyle.text}</Text>
                                            </View>
                                        </View>

                                        <Text style={styles.medName}>{med.name}</Text>

                                        <View style={styles.medDetailsRow}>
                                            <View style={styles.medDetail}>
                                                <Ionicons name="fitness" size={14} color="#999" />
                                                <Text style={styles.medDetailText}>{med.dose}</Text>
                                            </View>
                                            <View style={styles.medDetail}>
                                                <Ionicons name="medical" size={14} color="#999" />
                                                <Text style={styles.medDetailText}>{med.medType}</Text>
                                            </View>
                                        </View>

                                        <View style={styles.medCardFooter}>
                                            <Text style={styles.tapToEdit}>แตะเพื่อ{med.status === 'รอกิน' ? 'บันทึก' : 'ดูรายละเอียด'}</Text>
                                            <Ionicons name="chevron-forward" size={16} color="#4dabf7" />
                                        </View>
                                    </TouchableOpacity>
                                );
                            })}
                        </View>
                    )}
                </View>
            </ScrollView>

            {/* Tooltip */}
            {tooltipVisible && tooltipData && (
                <View style={styles.tooltip}>
                    <View style={styles.tooltipHeader}>
                        <Ionicons name="calendar" size={16} color="#fff" />
                        <Text style={styles.tooltipTitle}>{tooltipData.date}</Text>
                    </View>
                    <View style={styles.tooltipContent}>
                        {tooltipData['กินแล้ว'] > 0 && (
                            <View style={styles.tooltipRow}>
                                <View style={[styles.tooltipDot, { backgroundColor: '#28a745' }]} />
                                <Text style={styles.tooltipText}>กินแล้ว: {tooltipData['กินแล้ว']}</Text>
                            </View>
                        )}
                        {tooltipData['รอกิน'] > 0 && (
                            <View style={styles.tooltipRow}>
                                <View style={[styles.tooltipDot, { backgroundColor: '#ffc107' }]} />
                                <Text style={styles.tooltipText}>รอกิน: {tooltipData['รอกิน']}</Text>
                            </View>
                        )}
                        {tooltipData['ข้าม'] > 0 && (
                            <View style={styles.tooltipRow}>
                                <View style={[styles.tooltipDot, { backgroundColor: '#dc3545' }]} />
                                <Text style={styles.tooltipText}>ข้าม: {tooltipData['ข้าม']}</Text>
                            </View>
                        )}
                    </View>
                </View>
            )}

            {/* Medication Detail Modal */}
            <Modal
                visible={modalVisible}
                animationType="slide"
                transparent={true}
                onRequestClose={closeMedModal}
            >
                <View style={styles.modalBackground}>
                    <View style={styles.modalContent}>
                        <View style={styles.modalHeader}>
                            <View style={styles.modalIconCircle}>
                                <Ionicons name="medical" size={28} color="#4dabf7" />
                            </View>
                            <Text style={styles.modalTitle}>
                                {modalMode === 'record' ? 'บันทึกการกินยา' : 'รายละเอียดการกินยา'}
                            </Text>
                        </View>

                        {selectedMed && (
                            <ScrollView showsVerticalScrollIndicator={false}>
                                <View style={styles.modalInfo}>
                                    <Text style={styles.modalMedName}>{selectedMed.name}</Text>
                                    <View style={styles.modalInfoRow}>
                                        <Ionicons name="time" size={16} color="#666" />
                                        <Text style={styles.modalDetail}>
                                            {selectedMed.mealName} {selectedMed.time} น.
                                        </Text>
                                    </View>
                                    <View style={styles.modalInfoRow}>
                                        <Ionicons name="fitness" size={16} color="#666" />
                                        <Text style={styles.modalDetail}>{selectedMed.dose}</Text>
                                    </View>
                                    <View style={styles.modalInfoRow}>
                                        <Ionicons name="medical" size={16} color="#666" />
                                        <Text style={styles.modalDetail}>{selectedMed.medType}</Text>
                                    </View>
                                </View>

                                <View style={styles.currentStatusBox}>
                                    <Text style={styles.inputLabel}>สถานะปัจจุบัน</Text>
                                    <View style={[
                                        styles.currentStatusBadge,
                                        { backgroundColor: getStatusBadgeStyle(selectedMed.status).backgroundColor }
                                    ]}>
                                        <Ionicons
                                            name={getStatusBadgeStyle(selectedMed.status).icon}
                                            size={18}
                                            color="#fff"
                                        />
                                        <Text style={styles.currentStatusText}>{selectedMed.status}</Text>
                                    </View>
                                </View>

                                {modalMode === 'detail' && (selectedMed.status === 'กินแล้ว' || selectedMed.status === 'ข้าม') && (
                                    <View style={styles.detailSection}>
                                        <Text style={styles.detailSectionTitle}>ข้อมูลการบันทึก</Text>
                                        {selectedMed.status === 'กินแล้ว' && (
                                            <View style={styles.detailRow}>
                                                <Ionicons name="time" size={16} color="#4dabf7" />
                                                <Text style={styles.detailText}>
                                                    เวลาที่กินจริง: {selectedMed.actualTime ? selectedMed.actualTime.slice(0, 5) : '-'}
                                                </Text>
                                            </View>
                                        )}
                                        <View style={styles.detailRow}>
                                            <Ionicons name={selectedMed.sideEffects ? "warning" : "checkmark-circle"} size={16} color={selectedMed.sideEffects ? "#ffc107" : "#28a745"} />
                                            <Text style={styles.detailText}>
                                                ผลข้างเคียง: {selectedMed.sideEffects || 'ไม่มี'}
                                            </Text>
                                        </View>
                                    </View>
                                )}

                                {(modalMode === 'record' || modalMode === 'edit') && (
                                    <>
                                        <View style={styles.inputSection}>
                                            <Text style={styles.inputLabel}>⏰ เวลาที่กินยาจริง</Text>
                                            <TouchableOpacity
                                                style={styles.timeSelector}
                                                onPress={() => setShowTimePicker(true)}
                                            >
                                                <Ionicons name="time" size={20} color="#4dabf7" />
                                                <Text style={styles.timeText}>{actualTakeTime}</Text>
                                                <Ionicons name="chevron-down" size={16} color="#666" />
                                            </TouchableOpacity>

                                            {(() => {
                                                const today = new Date();
                                                const selected = new Date(selectedDate);
                                                selected.setHours(0, 0, 0, 0);
                                                today.setHours(0, 0, 0, 0);

                                                if (selected < today) {
                                                    const dateLabel = selected.toLocaleDateString('th-TH', {
                                                        day: 'numeric',
                                                        month: 'long',
                                                        year: 'numeric'
                                                    });
                                                    return (
                                                        <Text style={styles.backdateWarning}>
                                                            คุณกำลังบันทึกข้อมูลย้อนหลังของวันที่ {dateLabel}
                                                        </Text>
                                                    );
                                                }
                                                return null;
                                            })()}
                                        </View>

                                        <View style={styles.inputSection}>
                                            <Text style={styles.inputLabel}>💊 ผลข้างเคียง (ถ้ามี)</Text>
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

                                {modalMode === 'record' && (
                                    <View style={styles.modalActions}>
                                        <TouchableOpacity
                                            style={[styles.actionButton, styles.skipButton]}
                                            onPress={() => updateMedicationStatus('ข้าม')}
                                        >
                                            <Ionicons name="close-circle" size={20} color="#fff" />
                                            <Text style={styles.actionButtonText}>ข้ามยา</Text>
                                        </TouchableOpacity>

                                        <TouchableOpacity
                                            style={[styles.actionButton, styles.confirmButton]}
                                            onPress={() => updateMedicationStatus('กินแล้ว')}
                                        >
                                            <Ionicons name="checkmark-circle" size={20} color="#fff" />
                                            <Text style={styles.actionButtonText}>ทานยาแล้ว</Text>
                                        </TouchableOpacity>
                                    </View>
                                )}

                                {modalMode === 'detail' && (
                                    <View style={styles.modalButtonRow}>
                                        <TouchableOpacity style={styles.cancelBtn} onPress={closeMedModal}>
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
                                            <Text style={styles.confirmText}>บันทึก</Text>
                                        </TouchableOpacity>
                                    </View>
                                )}

                                <TouchableOpacity
                                    style={styles.cancelButton}
                                    onPress={closeMedModal}
                                >
                                    {/* <Text style={styles.cancelButtonText}>ยกเลิก</Text> */}
                                </TouchableOpacity>
                            </ScrollView>
                        )}
                    </View>
                </View>
            </Modal>

            {showTimePicker && (
                <DateTimePicker
                    value={medTime}
                    mode="time"
                    is24Hour={true}
                    display="default"
                    onChange={handleTimeChange}
                />
            )}
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#f5f7fa',
    },
    headerBox: {
        backgroundColor: '#4dabf7',
        paddingTop: Platform.OS === 'ios' ? 50 : 20,
        paddingBottom: 20,
        paddingHorizontal: 20,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        borderBottomLeftRadius: 24,
        borderBottomRightRadius: 24,
        elevation: 4,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.15,
        shadowRadius: 6,
    },
    backButton: {
        width: 40,
        height: 40,
        borderRadius: 20,
        backgroundColor: 'rgba(255,255,255,0.2)',
        alignItems: 'center',
        justifyContent: 'center',
    },
    headerCenter: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 12,
    },
    iconCircle: {
        width: 50,
        height: 50,
        borderRadius: 25,
        backgroundColor: '#fff',
        alignItems: 'center',
        justifyContent: 'center',
    },
    headerTitle: {
        fontSize: 20,
        fontWeight: 'bold',
        color: '#fff',
    },
    headerSubtitle: {
        fontSize: 13,
        color: 'rgba(255,255,255,0.9)',
        marginTop: 2,
    },
    summaryCard: {
        backgroundColor: '#fff',
        marginHorizontal: 16,
        marginTop: -30,
        marginBottom: 20,
        borderRadius: 16,
        padding: 16,
        elevation: 3,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 4,
    },
    summaryHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
        marginBottom: 16,
    },
    summaryTitle: {
        fontSize: 16,
        fontWeight: '600',
        color: '#333',
    },
    summaryGrid: {
        flexDirection: 'row',
        justifyContent: 'space-between',
    },
    summaryItem: {
        alignItems: 'center',
        flex: 1,
    },
    summaryIconBox: {
        width: 40,
        height: 40,
        borderRadius: 12,
        alignItems: 'center',
        justifyContent: 'center',
        marginBottom: 8,
    },
    summaryNumber: {
        fontSize: 20,
        fontWeight: 'bold',
        color: '#333',
        marginBottom: 4,
    },
    summaryLabel: {
        fontSize: 12,
        color: '#666',
    },
    monthNavigator: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        backgroundColor: '#fff',
        marginHorizontal: 16,
        marginBottom: 16,
        padding: 16,
        borderRadius: 16,
        elevation: 2,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.1,
        shadowRadius: 3,
    },
    navButton: {
        width: 40,
        height: 40,
        borderRadius: 12,
        backgroundColor: '#f0f0f0',
        alignItems: 'center',
        justifyContent: 'center',
    },
    monthTextContainer: {
        alignItems: 'center',
    },
    monthText: {
        fontSize: 20,
        fontWeight: 'bold',
        color: '#333',
    },
    yearText: {
        fontSize: 14,
        color: '#666',
        marginTop: 2,
    },
    calendarCard: {
        backgroundColor: '#fff',
        marginHorizontal: 16,
        marginBottom: 16,
        padding: 16,
        borderRadius: 16,
        elevation: 2,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.1,
        shadowRadius: 3,
    },
    weekDaysRow: {
        flexDirection: 'row',
        marginBottom: 12,
        paddingBottom: 12,
        borderBottomWidth: 1,
        borderBottomColor: '#e0e0e0',
    },
    weekDayCell: {
        flex: 1,
        alignItems: 'center',
    },
    weekDayText: {
        fontSize: 14,
        fontWeight: '600',
        color: '#666',
    },
    loadingContainer: {
        paddingVertical: 40,
        alignItems: 'center',
    },
    loadingText: {
        marginTop: 12,
        fontSize: 14,
        color: '#666',
    },
    calendarGrid: {
        flexDirection: 'row',
        flexWrap: 'wrap',
    },
    dayCell: {
        width: '14.28%',
        aspectRatio: 1,
        justifyContent: 'center',
        alignItems: 'center',
        padding: 4,
    },
    todayCell: {
        backgroundColor: '#e3f2fd',
        borderRadius: 12,
        borderWidth: 2,
        borderColor: '#4dabf7',
    },
    selectedCell: {
        backgroundColor: '#4dabf7',
        borderRadius: 12,
    },
    futureCell: {
        opacity: 0.4,
    },
    dayText: {
        fontSize: 16,
        color: '#333',
        fontWeight: '500',
    },
    todayText: {
        color: '#4dabf7',
        fontWeight: 'bold',
    },
    selectedText: {
        color: '#fff',
        fontWeight: 'bold',
    },
    futureText: {
        color: '#999',
    },
    dotsContainer: {
        flexDirection: 'row',
        marginTop: 2,
        gap: 2,
    },
    statusDot: {
        width: 5,
        height: 5,
        borderRadius: 2.5,
    },
    selectedDaySection: {
        marginHorizontal: 16,
        marginBottom: 20,
    },
    selectedDayHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        backgroundColor: '#fff',
        padding: 12,
        borderRadius: 12,
        marginBottom: 12,
        elevation: 1,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.05,
        shadowRadius: 2,
    },
    selectedDayLeft: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
    },
    selectedDayTitle: {
        fontSize: 16,
        fontWeight: '600',
        color: '#333',
    },
    medCountBadge: {
        backgroundColor: '#4dabf7',
        paddingHorizontal: 12,
        paddingVertical: 4,
        borderRadius: 12,
    },
    medCountText: {
        color: '#fff',
        fontSize: 12,
        fontWeight: 'bold',
    },
    emptyState: {
        backgroundColor: '#fff',
        padding: 40,
        borderRadius: 16,
        alignItems: 'center',
        elevation: 1,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.05,
        shadowRadius: 2,
    },
    emptyIconCircle: {
        width: 80,
        height: 80,
        borderRadius: 40,
        backgroundColor: '#f5f7fa',
        alignItems: 'center',
        justifyContent: 'center',
        marginBottom: 16,
    },
    emptyTitle: {
        fontSize: 18,
        fontWeight: 'bold',
        color: '#333',
        marginBottom: 8,
    },
    emptyText: {
        fontSize: 14,
        color: '#999',
        textAlign: 'center',
    },
    medicationsList: {
        gap: 12,
    },
    medCard: {
        backgroundColor: '#fff',
        padding: 16,
        borderRadius: 16,
        elevation: 2,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.1,
        shadowRadius: 3,
        borderLeftWidth: 4,
        borderLeftColor: '#4dabf7',
    },
    medCardHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 12,
    },
    medTimeBox: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
    },
    medTime: {
        fontSize: 14,
        color: '#666',
        fontWeight: '500',
    },
    statusBadge: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingVertical: 4,
        paddingHorizontal: 10,
        borderRadius: 12,
        gap: 4,
    },
    statusBadgeText: {
        fontSize: 12,
        color: '#fff',
        fontWeight: 'bold',
    },
    medName: {
        fontSize: 16,
        fontWeight: 'bold',
        color: '#333',
        marginBottom: 8,
    },
    medDetailsRow: {
        flexDirection: 'row',
        gap: 16,
        marginBottom: 12,
    },
    medDetail: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 4,
    },
    medDetailText: {
        fontSize: 13,
        color: '#666',
    },
    medCardFooter: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingTop: 12,
        borderTopWidth: 1,
        borderTopColor: '#f0f0f0',
    },
    tapToEdit: {
        fontSize: 13,
        color: '#4dabf7',
        fontWeight: '500',
    },
    tooltip: {
        position: 'absolute',
        top: 100,
        alignSelf: 'center',
        backgroundColor: 'rgba(0,0,0,0.85)',
        borderRadius: 12,
        padding: 12,
        minWidth: 180,
        elevation: 5,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.3,
        shadowRadius: 4,
        zIndex: 1000,
    },
    tooltipHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
        marginBottom: 8,
        paddingBottom: 8,
        borderBottomWidth: 1,
        borderBottomColor: 'rgba(255,255,255,0.2)',
    },
    tooltipTitle: {
        color: '#fff',
        fontSize: 14,
        fontWeight: 'bold',
    },
    tooltipContent: {
        gap: 6,
    },
    tooltipRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
    },
    tooltipDot: {
        width: 10,
        height: 10,
        borderRadius: 5,
    },
    tooltipText: {
        color: '#fff',
        fontSize: 13,
    },
    modalBackground: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        backgroundColor: 'rgba(0,0,0,0.5)',
    },
    modalContent: {
        backgroundColor: '#fff',
        borderRadius: 20,
        width: '90%',
        maxWidth: 400,
        maxHeight: '85%',
        padding: 24,
    },
    modalHeader: {
        alignItems: 'center',
        marginBottom: 20,
    },
    modalIconCircle: {
        width: 60,
        height: 60,
        borderRadius: 30,
        backgroundColor: '#e3f2fd',
        alignItems: 'center',
        justifyContent: 'center',
        marginBottom: 12,
    },
    modalTitle: {
        fontSize: 18,
        fontWeight: 'bold',
        color: '#333',
    },
    modalInfo: {
        backgroundColor: '#f8f9fa',
        padding: 16,
        borderRadius: 12,
        marginBottom: 16,
    },
    modalInfoRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
        marginBottom: 8,
    },
    modalMedName: {
        fontSize: 16,
        fontWeight: 'bold',
        color: '#333',
        marginBottom: 12,
    },
    modalDetail: {
        fontSize: 14,
        color: '#666',
    },
    currentStatusBox: {
        marginBottom: 16,
    },
    currentStatusBadge: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        paddingVertical: 12,
        borderRadius: 12,
        gap: 8,
    },
    currentStatusText: {
        color: '#fff',
        fontSize: 16,
        fontWeight: 'bold',
    },
    detailSection: {
        backgroundColor: '#e7f5ff',
        borderRadius: 12,
        padding: 16,
        marginBottom: 16,
    },
    detailSectionTitle: {
        fontSize: 14,
        fontWeight: 'bold',
        color: '#4dabf7',
        marginBottom: 12,
    },
    detailRow: {
        flexDirection: 'row',
        alignItems: 'flex-start',
        gap: 8,
        marginBottom: 8,
    },
    detailText: {
        fontSize: 14,
        color: '#333',
        flex: 1,
    },
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
        borderRadius: 12,
        borderWidth: 1,
        borderColor: '#e0e0e0',
        gap: 8,
    },
    timeText: {
        flex: 1,
        fontSize: 16,
        color: '#333',
        fontWeight: '500',
    },
    backdateWarning: {
        color: '#dc3545',
        fontSize: 13,
        marginTop: 8,
        fontWeight: '600',
    },
    textInput: {
        backgroundColor: '#f8f9fa',
        borderWidth: 1,
        borderColor: '#e0e0e0',
        borderRadius: 12,
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
    modalActions: {
        flexDirection: 'row',
        gap: 12,
        marginBottom: 12,
    },
    actionButton: {
        flex: 1,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        paddingVertical: 14,
        borderRadius: 12,
        gap: 6,
    },
    skipButton: {
        backgroundColor: '#dc3545',
    },
    confirmButton: {
        backgroundColor: '#28a745',
    },
    actionButtonText: {
        color: '#fff',
        fontSize: 15,
        fontWeight: 'bold',
    },
    modalButtonRow: {
        flexDirection: 'row',
        gap: 12,
        marginBottom: 12,
    },
    cancelBtn: {
        flex: 1,
        backgroundColor: '#6c757d',
        paddingVertical: 12,
        borderRadius: 12,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 6,
    },
    confirmBtn: {
        flex: 1,
        backgroundColor: '#4dabf7',
        paddingVertical: 12,
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
    cancelButton: {
        paddingVertical: 12,
        alignItems: 'center',
    },
    cancelButtonText: {
        color: '#666',
        fontSize: 15,
        fontWeight: '500',
    },
});

export default CalendarScreen;