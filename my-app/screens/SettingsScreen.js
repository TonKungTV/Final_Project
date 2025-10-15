// import React from 'react';
// import {
//   View,
//   Text,
//   StyleSheet,
//   TouchableOpacity,
// } from 'react-native';
// import { Ionicons } from '@expo/vector-icons';

// const settings = [
//   { id: 1, label: 'ข้อมูลส่วนตัว', icon: 'person-circle-outline' },
//   { id: 2, label: 'เวลามื้ออาหาร', icon: 'restaurant-outline' },
//   { id: 3, label: 'ลบบัญชี', icon: 'trash can-outline' },
//   { id: 2, label: 'ออกจากระบบ', icon: 'out-outline' },
// ];

// const SettingsScreen = ({ navigation }) => {
//   return (
//     <View style={styles.container}>
//       <View style={styles.headerBox}>
//         <Text style={styles.headerText}>การตั้งค่า</Text>
//       </View>

//       {settings.map(item => (
//         <TouchableOpacity
//           key={item.id}
//           style={styles.card}
//           onPress={() => {
//             if (item.label === 'ข้อมูลส่วนตัว') {
//               navigation.navigate('ProfileScreen');
//             } else if (item.label === 'เวลามื้ออาหาร') {
//               navigation.navigate('MealTimes'); // ถ้ายังไม่มีหน้าก็ลบออกได้
//             }
//           }}
//         >
//           <View style={styles.cardContent}>
//             <Ionicons name={item.icon} size={22} color="#3b3b3b" style={styles.leftIcon} />
//             <Text style={styles.cardText}>{item.label}</Text>
//             <Ionicons name="chevron-forward-outline" size={20} color="#555" style={styles.rightIcon} />
//           </View>
//         </TouchableOpacity>
//       ))}
//     </View>
//   );
// };

// const styles = StyleSheet.create({
//   container: {
//     flex: 1,
//     backgroundColor: '#f2f6fd',
//     padding: 16,
//   },
//   headerBox: {
//     backgroundColor: '#4dabf7',
//     paddingVertical: 14,
//     borderTopLeftRadius: 12,
//     borderTopRightRadius: 12,
//     marginBottom: 16,
//   },
//   headerText: {
//     color: '#fff',
//     fontSize: 18,
//     fontWeight: 'bold',
//     textAlign: 'center',
//   },
//   card: {
//     backgroundColor: '#fff',
//     borderRadius: 10,
//     marginBottom: 12,
//     shadowColor: '#000',
//     shadowOpacity: 0.05,
//     shadowRadius: 3,
//     elevation: 1,
//   },
//   cardContent: {
//     flexDirection: 'row',
//     alignItems: 'center',
//     paddingVertical: 14,
//     paddingHorizontal: 16,
//   },
//   leftIcon: {
//     marginRight: 12,
//   },
//   rightIcon: {
//     marginLeft: 'auto',
//   },
//   cardText: {
//     fontSize: 16,
//     color: '#333',
//   },
// });

// export default SettingsScreen;


import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';

const settings = [
  { id: 1, label: 'ข้อมูลส่วนตัว', icon: 'person-circle-outline' },
  { id: 2, label: 'เวลามื้ออาหาร', icon: 'restaurant-outline' },
  { id: 3, label: 'ลบบัญชี', icon: 'trash-outline' }, //  icon 
  { id: 4, label: 'ออกจากระบบ', icon: 'log-out-outline' }, //  icon 
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
            if (onLogout) {
              await onLogout();
            } else {
              Alert.alert('เกิดข้อผิดพลาด', 'กรุณารีสตาร์ทแอพ');
            }
          }
        }
      ]
    );
  };
  
const SettingsScreen = ({ navigation,onLogout }) => {
  const handlePress = (label) => {
    switch (label) {
      case 'ข้อมูลส่วนตัว':
        navigation.navigate('ProfileScreen');
        break;
      case 'เวลามื้ออาหาร':
        navigation.navigate('MealTimes');
        break;
      case 'ลบบัญชี':
        Alert.alert('ยืนยัน', 'คุณต้องการลบบัญชีหรือไม่?', [
          { text: 'ยกเลิก', style: 'cancel' },
          { text: 'ลบ', onPress: () => console.log('บัญชีถูกลบ') },
        ]);
        break;
      case 'ออกจากระบบ':
        Alert.alert('ออกจากระบบ', 'คุณแน่ใจหรือไม่?', [
          { text: 'ยกเลิก', style: 'cancel' },
          { text: 'ออก', onPress: () => console.log('ออกจากระบบ') },
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
        >
          <View style={styles.cardContent}>
            <Ionicons name={item.icon} size={22} color={item.label === 'ออกจากระบบ' ? 'red' : '#3b3b3b'} style={styles.leftIcon} />
            <Text style={[styles.cardText, item.label === 'ออกจากระบบ' && { color: 'red' }]}>
              {item.label}
            </Text>
            {item.label === 'ข้อมูลส่วนตัว' || item.label === 'เวลามื้ออาหาร' ? (
              <Ionicons name="chevron-forward-outline" size={20} color="#555" style={styles.rightIcon} />
            ) : null}
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
  },
});
