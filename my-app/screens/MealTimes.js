import React, { useState, useEffect } from 'react';
import {
    View,
    Text,
    TextInput,
    TouchableOpacity,
    StyleSheet,
    SafeAreaView,
    StatusBar,
    Alert,
    ActivityIndicator,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { BASE_URL } from './config';

const MealTimes = ({ navigation }) => {
    const [mealTimes, setMealTimes] = useState({
        breakfast: '08:00',
        lunch: '12:00',
        dinner: '18:00',
        snack: '21:00',
    });

    const [editingMeal, setEditingMeal] = useState(null);
    const [tempTime, setTempTime] = useState('');
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [userId, setUserId] = useState(null);

    // ✅ ดึง userId และข้อมูลเวลาอาหาร
    useEffect(() => {
        const fetchMealTimes = async () => {
            try {
                // ดึง userId จาก AsyncStorage
                const storedUserId = await AsyncStorage.getItem('userId');
                
                if (!storedUserId) {
                    Alert.alert('Error', 'กรุณาเข้าสู่ระบบใหม่');
                    navigation.navigate('Login');
                    return;
                }

                setUserId(storedUserId);
                console.log('👤 User ID:', storedUserId);

                // ดึงข้อมูลเวลาอาหารจาก API
                const response = await fetch(`${BASE_URL}/api/meal-times/${storedUserId}`);
                
                if (!response.ok) {
                    throw new Error(`HTTP ${response.status}: ${response.statusText}`);
                }

                const data = await response.json();
                console.log('📥 Meal times fetched:', data);

                setMealTimes({
                    breakfast: data.breakfast || '08:00',
                    lunch: data.lunch || '12:00',
                    dinner: data.dinner || '18:00',
                    snack: data.snack || '21:00',
                });

            } catch (error) {
                console.error('❌ Error fetching meal times:', error);
                Alert.alert('Error', 'ไม่สามารถดึงข้อมูลเวลาอาหาร\n' + error.message);
            } finally {
                setLoading(false);
            }
        };

        fetchMealTimes();
    }, []);

    const handleTimePress = (mealType) => {
        setEditingMeal(mealType);
        setTempTime(mealTimes[mealType]);
    };

    const handleTimeSubmit = () => {
        const timeRegex = /^([01]?[0-9]|2[0-3]):[0-5][0-9]$/;
        if (timeRegex.test(tempTime)) {
            setMealTimes(prev => ({
                ...prev,
                [editingMeal]: tempTime,
            }));
            setEditingMeal(null);
        } else {
            Alert.alert('Error', 'กรุณากรอกเวลาในรูปแบบ HH:MM (24-hour)');
        }
    };

    // ✅ บันทึกเวลาอาหาร
    const handleSave = async () => {
        if (!userId) {
            Alert.alert('Error', 'ไม่พบข้อมูลผู้ใช้');
            return;
        }

        setSaving(true);

        try {
            const response = await fetch(`${BASE_URL}/api/meal-times/${userId}`, {
                method: 'PATCH',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(mealTimes),
            });

            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.error || 'Failed to save meal times');
            }

            const data = await response.json();
            console.log('✅ Save response:', data);

            Alert.alert('สำเร็จ', 'บันทึกเวลาอาหารสำเร็จ!', [
                { text: 'ตรวจสอบ', onPress: () => navigation.goBack() }
            ]);

        } catch (error) {
            console.error('❌ Error saving meal times:', error);
            Alert.alert('Error', 'ไม่สามารถบันทึกเวลาอาหาร\n' + error.message);
        } finally {
            setSaving(false);
        }
    };

    const handleCancel = () => {
        navigation.goBack();
    };

    const renderTimeInput = (label, mealType, time) => (
        <View style={styles.inputContainer} key={mealType}>
            <Text style={styles.label}>{label}</Text>
            {editingMeal === mealType ? (
                <View style={styles.editContainer}>
                    <TextInput
                        style={styles.textInput}
                        value={tempTime}
                        onChangeText={setTempTime}
                        placeholder="HH:MM"
                        keyboardType="numeric"
                        maxLength={5}
                        autoFocus
                        onBlur={handleTimeSubmit}
                        onSubmitEditing={handleTimeSubmit}
                    />
                </View>
            ) : (
                <TouchableOpacity
                    style={styles.timeInput}
                    onPress={() => handleTimePress(mealType)}
                >
                    <Text style={styles.timeText}>{time}</Text>
                </TouchableOpacity>
            )}
        </View>
    );

    if (loading) {
        return (
            <SafeAreaView style={styles.container}>
                <View style={[styles.mainContent, styles.centerContent]}>
                    <ActivityIndicator size="large" color="#3B82F6" />
                    <Text style={styles.loadingText}>กำลังโหลด...</Text>
                </View>
            </SafeAreaView>
        );
    }

    return (
        <SafeAreaView style={styles.container}>
            <StatusBar backgroundColor="#3B82F6" barStyle="light-content" />
            <View style={styles.mainContent}>
                <View style={styles.iconContainer}>
                    <View style={styles.bowlIcon}>
                        <Text style={styles.bowlEmoji}>🍜</Text>
                    </View>
                </View>
                <View style={styles.inputsContainer}>
                    {renderTimeInput('เช้า', 'breakfast', mealTimes.breakfast)}
                    {renderTimeInput('เที่ยง', 'lunch', mealTimes.lunch)}
                    {renderTimeInput('เย็น', 'dinner', mealTimes.dinner)}
                    {renderTimeInput('ก่อนนอน', 'snack', mealTimes.snack)}
                </View>
                <View style={styles.buttonContainer}>
                    <TouchableOpacity 
                        style={[styles.saveButton, saving && styles.disabledButton]} 
                        onPress={handleSave}
                        disabled={saving}
                    >
                        {saving ? (
                            <ActivityIndicator color="#FFFFFF" />
                        ) : (
                            <Text style={styles.saveButtonText}>บันทึก</Text>
                        )}
                    </TouchableOpacity>
                    <TouchableOpacity 
                        style={styles.cancelButton} 
                        onPress={handleCancel}
                        disabled={saving}
                    >
                        <Text style={styles.cancelButtonText}>ยกเลิก</Text>
                    </TouchableOpacity>
                </View>
            </View>
        </SafeAreaView>
    );
};

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: '#3B82F6' },
    mainContent: {
        flex: 1,
        backgroundColor: '#FFFFFF',
        borderTopLeftRadius: 24,
        borderTopRightRadius: 24,
        marginTop: 8,
        paddingHorizontal: 24,
        paddingTop: 32,
        paddingBottom: 32,
    },
    centerContent: {
        justifyContent: 'center',
        alignItems: 'center',
    },
    loadingText: {
        marginTop: 16,
        fontSize: 16,
        color: '#6B7280',
    },
    iconContainer: { alignItems: 'center', marginBottom: 32 },
    bowlIcon: { 
        width: 64, 
        height: 64, 
        backgroundColor: '#6B7280', 
        borderRadius: 32, 
        justifyContent: 'center', 
        alignItems: 'center' 
    },
    bowlEmoji: { fontSize: 28 },
    inputsContainer: { flex: 1 },
    inputContainer: { marginBottom: 24 },
    label: { fontSize: 16, fontWeight: '500', color: '#374151', marginBottom: 8 },
    timeInput: { 
        backgroundColor: '#F3F4F6', 
        paddingHorizontal: 16, 
        paddingVertical: 12, 
        borderRadius: 8, 
        justifyContent: 'center', 
        minHeight: 48 
    },
    timeText: { fontSize: 16, color: '#6B7280' },
    editContainer: { backgroundColor: '#F3F4F6', borderRadius: 8, overflow: 'hidden' },
    textInput: { 
        paddingHorizontal: 16, 
        paddingVertical: 12, 
        fontSize: 16, 
        color: '#374151', 
        backgroundColor: '#FFFFFF', 
        borderWidth: 2, 
        borderColor: '#3B82F6', 
        borderRadius: 8 
    },
    buttonContainer: { flexDirection: 'row', gap: 16, marginTop: 24 },
    saveButton: { 
        flex: 1, 
        backgroundColor: '#3B82F6', 
        paddingVertical: 12, 
        borderRadius: 24, 
        alignItems: 'center' 
    },
    disabledButton: {
        opacity: 0.6,
    },
    saveButtonText: { color: '#FFFFFF', fontSize: 16, fontWeight: '500' },
    cancelButton: { 
        flex: 1, 
        backgroundColor: '#6B7280', 
        paddingVertical: 12, 
        borderRadius: 24, 
        alignItems: 'center' 
    },
    cancelButtonText: { color: '#FFFFFF', fontSize: 16, fontWeight: '500' },
});

export default MealTimes;