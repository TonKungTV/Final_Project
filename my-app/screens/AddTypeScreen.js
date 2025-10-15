import React, { useState } from 'react';
import { View, Text, TextInput, Button, Alert, StyleSheet } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { BASE_URL } from './config';

const AddTypeScreen = ({ navigation }) => {
  const [name, setName] = useState('');

  const handleSave = async () => {
    if (!name.trim()) return Alert.alert('กรุณากรอกชื่อประเภท');
    const userId = await AsyncStorage.getItem('userId');
    try {
      const res = await fetch(`${BASE_URL}/api/types`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ TypeName: name, UserID: userId ? parseInt(userId, 10) : null }),
      });
      if (res.ok) {
        const json = await res.json();
        const newId = json.id ?? null;
        Alert.alert('บันทึกเรียบร้อย');
        navigation.navigate('AddMedication', { newTypeId: newId, newTypeName: name });
      } else {
        const txt = await res.text().catch(() => '');
        console.error('create type failed', txt);
        Alert.alert('เกิดข้อผิดพลาดในการบันทึก');
      }
    } catch (e) {
      console.error('create type error', e);
      Alert.alert('เชื่อมต่อ backend ไม่ได้');
    }
  };

  return (
    <View style={styles.container}>
      <Text style={styles.label}>ชื่อประเภทยา</Text>
      <TextInput value={name} onChangeText={setName} style={styles.input} />
      <Button title="บันทึก" onPress={handleSave} />
    </View>
  );
};

export default AddTypeScreen;

const styles = StyleSheet.create({
  container: { flex: 1, padding: 16, backgroundColor: '#fff' },
  label: { fontWeight: 'bold', marginBottom: 8 },
  input: { borderWidth: 1, borderColor: '#ccc', padding: 10, borderRadius: 8, marginBottom: 12 },
});