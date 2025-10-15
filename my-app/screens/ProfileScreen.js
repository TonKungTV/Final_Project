import React, { useEffect, useState } from 'react';import {
  View,
  Text,
  TextInput,
  StyleSheet,
  TouchableOpacity,
  Image,
  ScrollView,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { BASE_URL } from './config';

const ProfileScreen = ({ navigation }) => {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [gender, setGender] = useState('');
  const [birthdate, setBirthdate] = useState('');
  const [bloodType, setBloodType] = useState('');

// ดึงข้อมูลผู้ใช้จาก API เมื่อเข้ามาหน้าจอ
  useEffect(() => {
    const fetchUserData = async () => {
      try {
        const userId = await AsyncStorage.getItem('userId');
        if (!userId) return;
        
        const response = await fetch(`${BASE_URL}/api/user/${userId}`);
        const data = await response.json();
        
        if (data) {
          setName(data.Name);
          setEmail(data.Email);
          setPhone(data.Phone);
          setGender(data.Gender);
          setBirthdate(data.BirthDate);
          setBloodType(data.BloodType);
        } else {
          Alert.alert('ไม่พบข้อมูลผู้ใช้');
        }
      } catch (error) {
        console.error('Error fetching user data:', error);
        Alert.alert('ไม่สามารถดึงข้อมูลผู้ใช้');
      }
    };

    fetchUserData();
  }, []);

const saveProfile = async () => {
  try {
    const userId = await AsyncStorage.getItem('userId');
    if (!userId) return;
    const response = await fetch(`${BASE_URL}/api/user/${userId}`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        name,
        email,
        phone,
        gender,
        birthdate,
        bloodType,
      }),
    });
    
    const result = await response.json();
    // แสดงผลการตอบกลับจาก API
    console.log('Response:', result);

    if (response.ok) {
      console.log('Profile saved successfully');
      alert('บันทึกข้อมูลสำเร็จ');
    } else {
      console.error('Failed to save profile', result);
      alert('ไม่สามารถบันทึกข้อมูลได้');
    }
  } catch (error) {
    console.error('Error saving profile:', error);
    alert('เกิดข้อผิดพลาดในการบันทึกข้อมูล');
  }
};


  const handleSave = () => {
    // เพิ่ม logic สำหรับการบันทึกข้อมูลได้
    alert('บันทึกข้อมูลสำเร็จ');
  };

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>ข้อมูลส่วนตัว</Text>
        <View style={{ width: 24 }} /> {/* Placeholder เพื่อให้ title อยู่กลาง */}
      </View>

      {/* Card Content */}
      <ScrollView contentContainerStyle={styles.card}>
        {/* <View style={styles.profileIcon}>
        //ใส่ภาพโปรไฟล์์
          <Image
            source={require('../assets/avatar.png')} // เปลี่ยน path ได้ตามไฟล์
            style={{ width: 70, height: 70, borderRadius: 35 }}
          />
        </View> */}

        <TextInput
          placeholder="ชื่อ"
          value={name}
          onChangeText={setName}
          style={styles.input}
        />
        <TextInput
          placeholder="อีเมล"
          value={email}
          onChangeText={setEmail}
          keyboardType="email-address"
          style={styles.input}
        />
        <TextInput
          placeholder="เบอร์โทรศัพท์"
          value={phone}
          onChangeText={setPhone}
          keyboardType="phone-pad"
          style={styles.input}
        />
        <TextInput
          placeholder="เพศ"
          value={gender}
          onChangeText={setGender}
          style={styles.input}
        />
        <TextInput
          placeholder="วัน เดือน ปีเกิด"
          value={birthdate}
          onChangeText={setBirthdate}
          style={styles.input}
        />
        <TextInput
          placeholder="กรุ๊ปเลือด"
          value={bloodType}
          onChangeText={setBloodType}
          style={styles.input}
        />

        <View style={styles.buttonRow}>
          <TouchableOpacity style={styles.saveButton} onPress={saveProfile}>
            <Text style={styles.saveButtonText}>บันทึก</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.cancelButton}
            onPress={() => navigation.goBack()}
          >
            <Text style={styles.cancelButtonText}>ยกเลิก</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </View>
  );
};

export default ProfileScreen;

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f2f6fd',
  },
  header: {
    backgroundColor: '#4dabf7',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 14,
  },
  headerTitle: {
    color: '#fff',
    fontSize: 18,
    fontWeight: 'bold',
  },
  card: {
    backgroundColor: '#fff',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    paddingHorizontal: 20,
    paddingTop: 30,
    paddingBottom: 40,
    marginTop: -8,
  },
  profileIcon: {
    alignSelf: 'center',
    marginBottom: 20,
  },
  input: {
    borderWidth: 1,
    borderColor: '#ddd',
    backgroundColor: '#f8f9fa',
    borderRadius: 10,
    padding: 12,
    marginBottom: 12,
  },
  buttonRow: {
    flexDirection: 'row',
    justifyContent: 'space-evenly',
    marginTop: 15,
  },
  saveButton: {
    backgroundColor: '#4dabf7',
    paddingVertical: 10,
    paddingHorizontal: 30,
    borderRadius: 20,
  },
  saveButtonText: {
    color: '#fff',
    fontWeight: 'bold',
  },
  cancelButton: {
    backgroundColor: '#555',
    paddingVertical: 10,
    paddingHorizontal: 30,
    borderRadius: 20,
  },
  cancelButtonText: {
    color: '#fff',
    fontWeight: 'bold',
  },
});
