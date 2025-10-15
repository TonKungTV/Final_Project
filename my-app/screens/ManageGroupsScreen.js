import React, { useState, useEffect } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, Alert, StyleSheet,
  ScrollView, Modal, Platform
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { BASE_URL } from './config';

const ManageGroupsScreen = ({ navigation }) => {
  const [groups, setGroups] = useState([]);
  const [modalVisible, setModalVisible] = useState(false);
  const [editingItem, setEditingItem] = useState(null);
  const [name, setName] = useState('');

  useEffect(() => {
    fetchGroups();
  }, []);

  const fetchGroups = async () => {
    try {
      const userId = await AsyncStorage.getItem('userId');
      const q = userId ? `?userId=${userId}` : '';
      const res = await fetch(`${BASE_URL}/api/groups${q}`);
      const data = await res.json();
      setGroups(Array.isArray(data) ? data : []);
    } catch (e) {
      console.error('fetch groups error', e);
    }
  };

  const handleSave = async () => {
    if (!name.trim()) {
      return Alert.alert('กรุณากรอกชื่อกลุ่มโรค');
    }

    const userId = await AsyncStorage.getItem('userId');
    
    try {
      if (editingItem) {
        // แก้ไข
        const res = await fetch(`${BASE_URL}/api/groups/${editingItem.GroupID || editingItem.id}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ 
            GroupName: name, 
            UserID: userId ? parseInt(userId, 10) : null 
          }),
        });
        
        if (res.ok) {
          Alert.alert('สำเร็จ', 'แก้ไขกลุ่มโรคเรียบร้อยแล้ว');
          fetchGroups();
          closeModal();
        } else {
          Alert.alert('ผิดพลาด', 'ไม่สามารถแก้ไขได้');
        }
      } else {
        // เพิ่มใหม่
        const res = await fetch(`${BASE_URL}/api/groups`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ 
            GroupName: name, 
            UserID: userId ? parseInt(userId, 10) : null 
          }),
        });
        
        if (res.ok) {
          Alert.alert('สำเร็จ', 'เพิ่มกลุ่มโรคเรียบร้อยแล้ว');
          fetchGroups();
          closeModal();
        } else {
          Alert.alert('ผิดพลาด', 'ไม่สามารถเพิ่มได้');
        }
      }
    } catch (e) {
      console.error(e);
      Alert.alert('เชื่อมต่อ backend ไม่ได้');
    }
  };

  const handleDelete = (item) => {
    Alert.alert(
      'ยืนยันการลบ',
      `ต้องการลบ "${item.GroupName || item.name}" หรือไม่?`,
      [
        { text: 'ยกเลิก', style: 'cancel' },
        {
          text: 'ลบ',
          style: 'destructive',
          onPress: async () => {
            try {
              const res = await fetch(`${BASE_URL}/api/groups/${item.GroupID || item.id}`, {
                method: 'DELETE',
              });
              
              if (res.ok) {
                Alert.alert('สำเร็จ', 'ลบกลุ่มโรคเรียบร้อยแล้ว');
                fetchGroups();
              } else {
                Alert.alert('ผิดพลาด', 'ไม่สามารถลบได้');
              }
            } catch (e) {
              console.error(e);
              Alert.alert('เชื่อมต่อ backend ไม่ได้');
            }
          },
        },
      ]
    );
  };

  const openAddModal = () => {
    setEditingItem(null);
    setName('');
    setModalVisible(true);
  };

  const openEditModal = (item) => {
    setEditingItem(item);
    setName(item.GroupName || item.name || '');
    setModalVisible(true);
  };

  const closeModal = () => {
    setModalVisible(false);
    setEditingItem(null);
    setName('');
  };

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
          <Ionicons name="arrow-back" size={24} color="#fff" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>จัดการกลุ่มโรค</Text>
        <View style={{ width: 40 }} />
      </View>

      {/* Add Button */}
      <TouchableOpacity style={styles.addButton} onPress={openAddModal}>
        <Ionicons name="add-circle" size={24} color="#fff" />
        <Text style={styles.addButtonText}>เพิ่มกลุ่มโรคใหม่</Text>
      </TouchableOpacity>

      {/* List */}
      <ScrollView style={styles.list}>
        {groups.length === 0 ? (
          <View style={styles.emptyState}>
            <Ionicons name="folder-open-outline" size={64} color="#ccc" />
            <Text style={styles.emptyText}>ยังไม่มีกลุ่มโรค</Text>
          </View>
        ) : (
          groups.map((item) => (
            <View key={item.GroupID || item.id} style={styles.card}>
              <View style={styles.cardContent}>
                <Ionicons name="medical" size={24} color="#4da6ff" />
                <Text style={styles.cardTitle}>{item.GroupName || item.name}</Text>
                {/* แสดง badge สำหรับ default items */}
                {item.UserID === null && (
                  <View style={styles.defaultBadge}>
                    <Text style={styles.defaultBadgeText}>ค่าเริ่มต้น</Text>
                  </View>
                )}
              </View>
              {/* แสดงปุ่มแก้ไข/ลบ เฉพาะ custom items (UserID ไม่เป็น null) */}
              {item.UserID !== null && (
                <View style={styles.cardActions}>
                  <TouchableOpacity
                    style={[styles.actionButton, styles.editButton]}
                    onPress={() => openEditModal(item)}
                  >
                    <Ionicons name="create-outline" size={20} color="#fff" />
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[styles.actionButton, styles.deleteButton]}
                    onPress={() => handleDelete(item)}
                  >
                    <Ionicons name="trash-outline" size={20} color="#fff" />
                  </TouchableOpacity>
                </View>
              )}
            </View>
          ))
        )}
      </ScrollView>

      {/* Modal */}
      <Modal visible={modalVisible} animationType="slide" transparent={true}>
        <View style={styles.modalBackground}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>
                {editingItem ? 'แก้ไขกลุ่มโรค' : 'เพิ่มกลุ่มโรคใหม่'}
              </Text>
              <TouchableOpacity onPress={closeModal}>
                <Ionicons name="close" size={24} color="#666" />
              </TouchableOpacity>
            </View>

            <View style={styles.inputContainer}>
              <Text style={styles.label}>ชื่อกลุ่มโรค <Text style={styles.required}>*</Text></Text>
              <TextInput
                value={name}
                onChangeText={setName}
                style={styles.input}
                placeholder="ระบุชื่อกลุ่มโรค"
                placeholderTextColor="#999"
              />
            </View>

            <View style={styles.modalActions}>
              <TouchableOpacity style={styles.cancelButton} onPress={closeModal}>
                <Text style={styles.cancelButtonText}>ยกเลิก</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.saveButton} onPress={handleSave}>
                <Text style={styles.saveButtonText}>บันทึก</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f7fa',
  },
  header: {
    backgroundColor: '#4da6ff',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 16,
    paddingTop: Platform.OS === 'ios' ? 50 : 16,
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 4,
      },
      android: {
        elevation: 4,
      },
    }),
  },
  backButton: {
    padding: 8,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#fff',
  },
  addButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#28a745',
    margin: 16,
    padding: 16,
    borderRadius: 12,
    ...Platform.select({
      ios: {
        shadowColor: '#28a745',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.3,
        shadowRadius: 4,
      },
      android: {
        elevation: 3,
      },
    }),
  },
  addButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
    marginLeft: 8,
  },
  list: {
    flex: 1,
    paddingHorizontal: 16,
  },
  emptyState: {
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 60,
  },
  emptyText: {
    marginTop: 16,
    fontSize: 16,
    color: '#999',
  },
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#fff',
    padding: 16,
    borderRadius: 12,
    marginBottom: 12,
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.1,
        shadowRadius: 3,
      },
      android: {
        elevation: 2,
      },
    }),
  },
  cardContent: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  cardTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#2c3e50',
    marginLeft: 12,
  },
  cardActions: {
    flexDirection: 'row',
    gap: 8,
  },
  actionButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  editButton: {
    backgroundColor: '#4da6ff',
  },
  deleteButton: {
    backgroundColor: '#dc3545',
  },
  modalBackground: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContent: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 24,
    width: '90%',
    maxWidth: 400,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#2c3e50',
  },
  inputContainer: {
    marginBottom: 20,
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
    color: '#34495e',
    marginBottom: 8,
  },
  required: {
    color: '#e74c3c',
  },
  input: {
    backgroundColor: '#f8f9fa',
    borderWidth: 1,
    borderColor: '#e1e8ed',
    borderRadius: 12,
    padding: 14,
    fontSize: 16,
    color: '#2c3e50',
  },
  modalActions: {
    flexDirection: 'row',
    gap: 12,
  },
  cancelButton: {
    flex: 1,
    backgroundColor: '#fff',
    borderWidth: 2,
    borderColor: '#e1e8ed',
    padding: 14,
    borderRadius: 12,
    alignItems: 'center',
  },
  cancelButtonText: {
    color: '#7f8c8d',
    fontSize: 16,
    fontWeight: '600',
  },
  saveButton: {
    flex: 1,
    backgroundColor: '#4da6ff',
    padding: 14,
    borderRadius: 12,
    alignItems: 'center',
  },
  saveButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
  cardContent: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  cardTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#2c3e50',
    marginLeft: 12,
    flex: 1,
  },
  defaultBadge: {
    backgroundColor: '#e3f2fd',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    marginLeft: 8,
  },
  defaultBadgeText: {
    fontSize: 11,
    color: '#1976d2',
    fontWeight: '600',
  },
});

export default ManageGroupsScreen;