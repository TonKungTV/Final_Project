import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { BASE_URL } from './config';

const settings = [
  { id: 1, label: 'ข้อมูลส่วนตัว', icon: 'person-circle-outline' },
  { id: 2, label: 'เวลามื้ออาหาร', icon: 'restaurant-outline' },
  { id: 3, label: 'ลบบัญชี', icon: 'trash-outline' },
  { id: 4, label: 'ออกจากระบบ', icon: 'log-out-outline' },
];

const SettingsScreen = ({ navigation, onLogout }) => {
  const [deleteLoading, setDeleteLoading] = useState(false);
  const [deletePassword, setDeletePassword] = useState('');

  // ✅ ฟังก์ชันลบบัญชี
  const handleDeleteAccount = async () => {
    try {
      const userId = await AsyncStorage.getItem('userId');
      if (!userId) {
        Alert.alert('ข้อผิดพลาด', 'ไม่สามารถหา User ID');
        return;
      }

      // ขั้นแรก: ขอให้ใส่รหัสผ่าน
      Alert.alert(
        'ยืนยันการลบบัญชี',
        'กรุณากรอกรหัสผ่านเพื่อยืนยันการลบบัญชี',
        [
          {
            text: 'ยกเลิก',
            style: 'cancel',
            onPress: () => setDeletePassword('')
          },
          {
            text: 'ลบบัญชี',
            style: 'destructive',
            onPress: async () => {
              // ขั้นที่สอง: ขออนุญาติอีกครั้ง
              Alert.alert(
                '⚠️ ข้อความเตือน',
                'บัญชีนี้จะถูกลบอย่างถาวร\n• ข้อมูลทั้งหมดจะหายไป\n• ไม่สามารถกู้คืนได้\n\nคุณแน่ใจหรือไม่?',
                [
                  {
                    text: 'ยกเลิก',
                    style: 'cancel'
                  },
                  {
                    text: 'ลบบัญชี',
                    style: 'destructive',
                    onPress: () => {
                      // เรียก API ลบ
                      proceedWithDeletion(userId);
                    }
                  }
                ]
              );
            }
          }
        ],
        'secure-text'
      );
    } catch (error) {
      console.error('❌ Error:', error);
      Alert.alert('ข้อผิดพลาด', error.message);
    }
  };

  const proceedWithDeletion = async (userId) => {
    try {
      setDeleteLoading(true);

      // ✅ แสดง Alert ให้ใส่รหัสผ่าน
      Alert.prompt(
        'กรอกรหัสผ่าน',
        'ยืนยันโดยกรอกรหัสผ่านของคุณ',
        [
          {
            text: 'ยกเลิก',
            style: 'cancel',
            onPress: () => setDeleteLoading(false)
          },
          {
            text: 'ลบ',
            style: 'destructive',
            onPress: async (password) => {
              if (!password || password.trim() === '') {
                Alert.alert('ข้อผิดพลาด', 'กรุณากรอกรหัสผ่าน');
                setDeleteLoading(false);
                return;
              }

              try {
                // ✅ เรียก API ลบบัญชี
                const response = await fetch(
                  `${BASE_URL}/api/user/${userId}`,
                  {
                    method: 'DELETE',
                    headers: {
                      'Content-Type': 'application/json',
                    },
                    body: JSON.stringify({ password })
                  }
                );

                const data = await response.json();

                if (!response.ok) {
                  throw new Error(data.error || 'ไม่สามารถลบบัญชีได้');
                }

                // ✅ ลบข้อมูลจาก AsyncStorage
                await AsyncStorage.removeItem('userId');
                await AsyncStorage.removeItem('token');
                await AsyncStorage.removeItem('userEmail');

                Alert.alert(
                  'ลบสำเร็จ',
                  'บัญชีของคุณได้ถูกลบแล้ว',
                  [
                    {
                      text: 'ตกลง',
                      onPress: () => {
                        if (onLogout) {
                          onLogout();
                        }
                      }
                    }
                  ]
                );

                setDeleteLoading(false);
              } catch (error) {
                console.error('❌ Deletion error:', error);
                Alert.alert('ข้อผิดพลาด', error.message);
                setDeleteLoading(false);
              }
            }
          }
        ],
        'secure-text'
      );
    } catch (error) {
      console.error('❌ Error:', error);
      Alert.alert('ข้อผิดพลาด', error.message);
      setDeleteLoading(false);
    }
  };

  const handlePress = (label) => {
    switch (label) {
      case 'ข้อมูลส่วนตัว':
        navigation.navigate('ProfileScreen');
        break;
      case 'เวลามื้ออาหาร':
        navigation.navigate('MealTimes');
        break;
      case 'ลบบัญชี':
        handleDeleteAccount();
        break;
      case 'ออกจากระบบ':
        Alert.alert('ออกจากระบบ', 'คุณต้องการออกจากระบบหรือไม่?', [
          { text: 'ยกเลิก', style: 'cancel' },
          {
            text: 'ออก',
            style: 'destructive',
            onPress: () => {
              if (onLogout) {
                onLogout();
              }
            }
          },
        ]);
        break;
    }
  };

  return (
    <View style={styles.container}>
      <View style={styles.headerBox}>
        <Text style={styles.headerText}>การตั้งค่า</Text>
      </View>

      {settings.map(item => (
        <TouchableOpacity
          key={item.id}
          style={styles.card}
          onPress={() => handlePress(item.label)}
          disabled={deleteLoading}
        >
          <View style={styles.cardContent}>
            <Ionicons
              name={item.icon}
              size={22}
              color={item.label === 'ออกจากระบบ' || item.label === 'ลบบัญชี' ? '#dc3545' : '#3b3b3b'}
              style={styles.leftIcon}
            />
            <Text
              style={[
                styles.cardText,
                (item.label === 'ออกจากระบบ' || item.label === 'ลบบัญชี') && { color: '#dc3545' }
              ]}
            >
              {item.label}
            </Text>
            {(item.label === 'ข้อมูลส่วนตัว' || item.label === 'เวลามื้ออาหาร') && (
              <Ionicons name="chevron-forward-outline" size={20} color="#555" style={styles.rightIcon} />
            )}
            {deleteLoading && item.label === 'ลบบัญชี' && (
              <ActivityIndicator size="small" color="#dc3545" style={styles.rightIcon} />
            )}
          </View>
        </TouchableOpacity>
      ))}
    </View>
  );
};

export default SettingsScreen;

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f2f6fd',
    padding: 16,
  },
  headerBox: {
    backgroundColor: '#4dabf7',
    paddingVertical: 14,
    borderTopLeftRadius: 12,
    borderTopRightRadius: 12,
    marginBottom: 16,
  },
  headerText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: 'bold',
    textAlign: 'center',
  },
  card: {
    backgroundColor: '#fff',
    borderRadius: 10,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOpacity: 0.05,
    shadowRadius: 3,
    elevation: 1,
  },
  cardContent: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 14,
    paddingHorizontal: 16,
  },
  leftIcon: {
    marginRight: 12,
  },
  rightIcon: {
    marginLeft: 'auto',
  },
  cardText: {
    fontSize: 16,
    color: '#333',
    flex: 1,
  },
});