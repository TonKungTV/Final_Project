import React, { createContext, useContext, useState, useEffect, useRef } from 'react';
import {
  Animated,
  Easing,
  Vibration,
  Platform,
  View,
  Text,
  TouchableOpacity,
  StyleSheet
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Audio } from 'expo-av';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { BASE_URL } from '../screens/config';

const NotificationContext = createContext();

export const useNotification = () => useContext(NotificationContext);

const NOTIFY_SOUND = require('../assets/notify.mp3');

export const NotificationProvider = ({ children }) => {
  const [notifications, setNotifications] = useState([]);
  const [alertedIds, setAlertedIds] = useState(new Set());
  const [items, setItems] = useState([]);
  const soundRef = useRef(null);
  const [soundReady, setSoundReady] = useState(false);

  const TEST_MODE = true;
  const TEST_ALERT_INTERVAL_MS = 15000;
  const alertLeadMinutes = 0;

  // โหลดเสียง
  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        await Audio.setAudioModeAsync({
          playsInSilentModeIOS: true,
          staysActiveInBackground: false,
          interruptionModeIOS: 2,
          interruptionModeAndroid: 2,
          shouldDuckAndroid: true,
          playThroughEarpieceAndroid: false
        });

        const { sound } = await Audio.Sound.createAsync(
          NOTIFY_SOUND,
          { shouldPlay: false, volume: 1.0 }
        );
        if (mounted) {
          soundRef.current = sound;
          setSoundReady(true);
          console.log('[Sound] Loaded OK');
        }
      } catch (e) {
        console.log('โหลดเสียงล้มเหลว:', e.message);
      }
    })();

    return () => {
      mounted = false;
      if (soundRef.current) soundRef.current.unloadAsync().catch(() => {});
    };
  }, []);

  const hapticAndSound = () => {
    try {
      if (Platform.OS === 'android') Vibration.vibrate(250);
      else Vibration.vibrate([0, 180, 80, 180]);
    } catch {}

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

  const pushNotification = (med, onTake, onSkip) => {
    const nid = `${med.id}-${Date.now()}`;
    const anim = new Animated.Value(-100);
    setNotifications(prev => [...prev, {
      id: nid,
      medId: med.id,
      title: 'ถึงเวลาทานยา',
      message: `${med.name} (${(med.rawTime || '').slice(0, 5)})`,
      medObj: med,
      anim,
      onTake,
      onSkip
    }]);
    hapticAndSound();

    // Animation
    setTimeout(() => {
      Animated.timing(anim, {
        toValue: 0,
        duration: 260,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: true
      }).start(() => {
        setTimeout(() => dismissNotification(nid), 10000);
      });
    }, 0);
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

  const buildTodayDate = (timeStr) => {
    if (!timeStr) return null;
    const parts = timeStr.split(':');
    if (parts.length < 2) return null;
    const now = new Date();
    const h = parseInt(parts[0], 10);
    const m = parseInt(parts[1], 10);
    if (isNaN(h) || isNaN(m)) return null;
    return new Date(now.getFullYear(), now.getMonth(), now.getDate(), h, m, 0, 0);
  };

  const checkDueMedications = () => {
    const now = new Date();
    const newAlerted = new Set(alertedIds);

    items.forEach(it => {
      if (it.status !== 'รอกิน') return;
      const medDate = buildTodayDate(it.rawTime || it.Time);
      if (!medDate) return;
      const triggerTime = new Date(medDate.getTime() - alertLeadMinutes * 60000);
      if (now >= triggerTime && !newAlerted.has(it.id)) {
        newAlerted.add(it.id);
        pushNotification(it, it.onTake, it.onSkip);
      }
    });

    if (TEST_MODE && ![...newAlerted].length) {
      const pending = items.find(i => i.status === 'รอกิน');
      if (pending && !newAlerted.has(pending.id)) {
        newAlerted.add(pending.id);
        pushNotification(pending, pending.onTake, pending.onSkip);
      }
    }

    if (newAlerted.size !== alertedIds.size) setAlertedIds(newAlerted);
  };

  // Interval ตรวจสอบ
  useEffect(() => {
    const interval = setInterval(() => {
      checkDueMedications();
      if (TEST_MODE) console.log('✅ [Context] ตรวจสอบการแจ้งเตือนยา');
    }, TEST_MODE ? TEST_ALERT_INTERVAL_MS : 30000);
    return () => clearInterval(interval);
  }, [items, alertedIds]);

  return (
    <NotificationContext.Provider value={{ setItems, pushNotification }}>
      {children}
      {/* Notification Overlay */}
      {notifications.length > 0 && (
        <View pointerEvents="box-none" style={styles.notificationOverlay}>
          <View style={styles.notificationStack}>
            {notifications.map(n => (
              <Animated.View
                key={n.id}
                style={[styles.notificationCard, { transform: [{ translateY: n.anim }] }]}
              >
                <View style={styles.notificationHeader}>
                  <Text style={styles.notificationTitle}>{n.title}</Text>
                  <TouchableOpacity onPress={() => dismissNotification(n.id)}>
                    <Ionicons name="close" size={18} color="#fff" />
                  </TouchableOpacity>
                </View>
                <Text style={styles.notificationMessage}>{n.message}</Text>
                <View style={styles.notificationActions}>
                  <TouchableOpacity
                    style={[styles.notifBtn, { backgroundColor: '#dc3545' }]}
                    onPress={() => {
                      dismissNotification(n.id);
                      if (n.onSkip) n.onSkip(n.medObj);
                    }}
                  >
                    <Ionicons name="close-circle" size={14} color="#fff" />
                    <Text style={styles.notifBtnText}>ข้าม</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[styles.notifBtn, { backgroundColor: '#28a745' }]}
                    onPress={() => {
                      dismissNotification(n.id);
                      if (n.onTake) n.onTake(n.medObj);
                    }}
                  >
                    <Ionicons name="checkmark-circle" size={14} color="#fff" />
                    <Text style={styles.notifBtnText}>กินแล้ว</Text>
                  </TouchableOpacity>
                </View>
              </Animated.View>
            ))}
          </View>
        </View>
      )}
    </NotificationContext.Provider>
  );
};

const styles = StyleSheet.create({
  notificationOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    zIndex: 9999
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
  }
});