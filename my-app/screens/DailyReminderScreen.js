import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, FlatList, Button, Alert } from 'react-native';
import * as Notifications from 'expo-notifications';
import { requestNotificationPermission, scheduleNotification, cancelAllScheduledNotifications } from './NotificationHelper';

const DailyReminderScreen = () => {
  const [reminders, setReminders] = useState([]);

  const listScheduled = async () => {
    try {
      const items = await Notifications.getAllScheduledNotificationsAsync();
      console.log('🔔 scheduled:', items);
      Alert.alert(`มี ${items.length} scheduled notification(s) — ดู console`);
    } catch (e) {
      console.error('getAllScheduledNotificationsAsync error', e);
      Alert.alert('ไม่สามารถดึง scheduled notifications ดู console log');
    }
  };

  useEffect(() => {
    let mounted = true;

    (async () => {
      try {
        // clear previous schedules to avoid duplicates
        await cancelAllScheduledNotifications();

        const granted = await requestNotificationPermission();
        if (!granted) {
          console.warn('Notification permission not granted');
          return;
        }

        const now = Date.now();

        // test1: 30 seconds from now
        const t1 = new Date(now + 30 * 1000);
        const id1 = await scheduleNotification({
          title: 'ทดสอบแจ้งเตือน 1',
          body: 'แจ้งเตือนทดสอบจะมาถึงใน 30 วินาที',
          date: t1,
        });
        console.log('Scheduled test1 id:', id1);

        // test2: 90 seconds from now
        const t2 = new Date(now + 90 * 1000);
        const id2 = await scheduleNotification({
          title: 'ทดสอบแจ้งเตือน 2',
          body: 'แจ้งเตือนทดสอบจะมาถึงใน 1.5 นาที',
          date: t2,
        });
        console.log('Scheduled test2 id:', id2);

        if (!mounted) return;
        setReminders([
          { id: id1 || 'test1', title: 'ทดสอบแจ้งเตือน 1', time: t1.toLocaleTimeString() },
          { id: id2 || 'test2', title: 'ทดสอบแจ้งเตือน 2', time: t2.toLocaleTimeString() }
        ]);
      } catch (e) {
        console.error('Hard-code schedule error', e);
      }
    })();

    return () => { mounted = false; };
  }, []);

  const handleClear = async () => {
    await cancelAllScheduledNotifications();
    setReminders([]);
  };

  const triggerNow = async () => {
    try {
      await Notifications.cancelAllScheduledNotificationsAsync(); // optional
      const id = await Notifications.scheduleNotificationAsync({
        content: { title: 'ทดสอบทันที', body: 'แจ้งเตือนทันทีสำหรับทดสอบ' },
        trigger: null, // null = show immediately
      });
      console.log('triggerNow id', id);
      Alert.alert('ส่ง notification ทันที (เช็คอุปกรณ์)');
    } catch (e) {
      console.error('triggerNow error', e);
      Alert.alert('ส่ง notification ไม่สำเร็จ — ดู console');
    }
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>📅 ทดสอบการแจ้งเตือน</Text>

      {reminders.length === 0 ? (
        <Text>ยังไม่มีการตั้งแจ้งเตือนทดสอบ</Text>
      ) : (
        <FlatList
          data={reminders}
          keyExtractor={(item) => String(item.id)}
          renderItem={({ item }) => (
            <View style={styles.card}>
              <Text style={styles.name}>🔔 {item.title}</Text>
              <Text>เวลา: {item.time}</Text>
            </View>
          )}
        />
      )}

      <View style={{ marginTop: 12, flexDirection: 'row', justifyContent: 'space-between' }}>
        <Button title="List Scheduled" onPress={listScheduled} />
        <Button title="Trigger Now" onPress={triggerNow} />
      </View>

      <View style={{ marginTop: 12 }}>
        <Button title="ยกเลิกการแจ้งเตือนทั้งหมด" onPress={handleClear} />
      </View>
    </View>
  );
};

export default DailyReminderScreen;

const styles = StyleSheet.create({
  container: { flex: 1, padding: 20, backgroundColor: '#fff' },
  title: { fontSize: 20, fontWeight: 'bold', marginBottom: 12 },
  card: {
    padding: 12,
    backgroundColor: '#e0f7fa',
    borderRadius: 8,
    marginBottom: 10,
  },
  name: { fontWeight: 'bold', fontSize: 16 },
});