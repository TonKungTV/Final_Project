import * as Notifications from 'expo-notifications';
import * as Device from 'expo-device';

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: false,
  }),
});

export async function requestNotificationPermission() {
  if (!Device.isDevice) {
    console.warn('Notifications: not running on a physical device; some features may be unavailable.');
  }
  const { status: existingStatus } = await Notifications.getPermissionsAsync();
  if (existingStatus === 'granted') return true;
  const { status } = await Notifications.requestPermissionsAsync();
  return status === 'granted';
}

export async function ensureAndroidChannel() {
  try {
    await Notifications.setNotificationChannelAsync('med-channel', {
      name: 'Medication reminders',
      importance: Notifications.AndroidImportance.MAX,
      vibrationPattern: [0, 250, 250, 250],
      lightColor: '#FF231F7C',
      sound: 'default',
    });
  } catch (e) {
    console.warn('Failed to create Android notification channel', e);
  }
}

export async function cancelAllScheduledNotifications() {
  try {
    await Notifications.cancelAllScheduledNotificationsAsync();
  } catch (e) {
    console.warn('cancelAllScheduledNotifications error', e);
  }
}

/**
 * scheduleNotification:
 *  - title, body: strings
 *  - date: JS Date object (local time)
 * Returns scheduled notification id (string) or null on failure
 */
export async function scheduleNotification({ title, body, date }) {
  try {
    if (!date || !(date instanceof Date)) return null;
    // if target time in past, skip
    const now = new Date();
    if (date <= now) return null;

    if (Device.isDevice && Platform.OS === 'android') {
      await ensureAndroidChannel();
    }

    const trigger = date; // Date trigger supported by expo-notifications
    const id = await Notifications.scheduleNotificationAsync({
      content: { title, body, sound: 'default' },
      trigger,
    });
    return id;
  } catch (e) {
    console.error('scheduleNotification error', e);
    return null;
  }
}