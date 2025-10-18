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
  { id: 1, label: 'ข้อมูลส่วนตัว', icon: 'person-circle-outline', color: '#4dabf7' },
  { id: 2, label: 'เวลามื้ออาหาร', icon: 'restaurant-outline', color: '#51cf66' },
  { id: 3, label: 'ลบบัญชี', icon: 'trash-outline', color: '#ff6b6b' },
  { id: 4, label: 'ออกจากระบบ', icon: 'log-out-outline', color: '#ff8787' },
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

      <View style={styles.content}>
      {settings.map(item => (
        <TouchableOpacity
          key={item.id}
          style={styles.card}
          onPress={() => handlePress(item.label)}
          disabled={deleteLoading}
          activeOpacity={0.7}
        >
          <View style={[styles.iconContainer, { backgroundColor: item.color + '15' }]}>
            <Ionicons
              name={item.icon}
              size={24}
              color={item.color}
            />
          </View>
          <Text style={styles.cardText}>{item.label}</Text>
          <View style={styles.rightSection}>
            {deleteLoading && item.label === 'ลบบัญชี' ? (
              <ActivityIndicator size="small" color={item.color} />
            ) : (
              (item.label === 'ข้อมูลส่วนตัว' || item.label === 'เวลามื้ออาหาร') && (
                <Ionicons name="chevron-forward" size={20} color="#bbb" />
              )
            )}
          </View>
        </TouchableOpacity>
      ))}
    </View>
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
    paddingVertical: 18,
    paddingHorizontal: 16,
    flexDirection: 'row',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 3,
  },
  iconContainer: {
    width: 48,
    height: 48,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 16,
  },
  cardText: {
    fontSize: 17,
    color: '#2c3e50',
    fontWeight: '500',
    flex: 1,
  },
  rightSection: {
    width: 24,
    alignItems: 'center',
    justifyContent: 'center',
  },
  footer: {
    paddingVertical: 20,
    alignItems: 'center',
  },
  footerText: {
    fontSize: 13,
    color: '#95a5a6',
    fontWeight: '500',
  },
});