/**
 * Push notification service for breaking news and updates
 */

import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';

// Configure notification behavior
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: true,
    priority: Notifications.AndroidNotificationPriority.HIGH,
  }),
});

interface NotificationPreferences {
  enabled: boolean;
  breaking: boolean;
  daily: boolean;
  stanUpdates: { [stanId: string]: boolean };
}

class NotificationService {
  private expoPushToken: string | null = null;

  /**
   * Initialize notification service
   */
  async initialize(): Promise<void> {
    try {
      const { status: existingStatus } = await Notifications.getPermissionsAsync();
      let finalStatus = existingStatus;

      if (existingStatus !== 'granted') {
        const { status } = await Notifications.requestPermissionsAsync();
        finalStatus = status;
      }

      if (finalStatus !== 'granted') {
        console.log('Notification permission not granted');
        return;
      }

      // Get push token
      const token = await Notifications.getExpoPushTokenAsync({
        projectId: 'your-expo-project-id', // Replace with actual project ID
      });
      this.expoPushToken = token.data;
      console.log('Push token:', this.expoPushToken);

      // Store token for backend
      await AsyncStorage.setItem('pushToken', this.expoPushToken);

      // Configure notification channel for Android
      if (Platform.OS === 'android') {
        await Notifications.setNotificationChannelAsync('default', {
          name: 'default',
          importance: Notifications.AndroidImportance.MAX,
          vibrationPattern: [0, 250, 250, 250],
          lightColor: '#FF231F7C',
        });

        await Notifications.setNotificationChannelAsync('breaking', {
          name: 'Breaking News',
          importance: Notifications.AndroidImportance.MAX,
          vibrationPattern: [0, 500, 250, 500],
          lightColor: '#FF0000',
        });
      }
    } catch (error) {
      console.error('Error initializing notifications:', error);
    }
  }

  /**
   * Schedule daily briefing notification
   */
  async scheduleDailyBriefing(hour: number = 9, minute: number = 0): Promise<void> {
    try {
      await Notifications.cancelAllScheduledNotificationsAsync();

      await Notifications.scheduleNotificationAsync({
        content: {
          title: "🌟 Your Daily STAN Briefing is Ready!",
          body: 'Check out the latest updates about your favorite topics',
          data: { type: 'daily_briefing' },
          sound: true,
          priority: Notifications.AndroidNotificationPriority.HIGH,
        },
        trigger: {
          hour,
          minute,
          repeats: true,
        },
      });

      console.log('Daily briefing scheduled for', hour, ':', minute);
    } catch (error) {
      console.error('Error scheduling daily briefing:', error);
    }
  }

  /**
   * Send breaking news notification
   */
  async sendBreakingNews(
    stanName: string,
    title: string,
    message: string
  ): Promise<void> {
    try {
      await Notifications.scheduleNotificationAsync({
        content: {
          title: `🚨 Breaking: ${stanName}`,
          body: message,
          subtitle: title,
          data: {
            type: 'breaking_news',
            stanName,
          },
          sound: true,
          priority: Notifications.AndroidNotificationPriority.MAX,
          categoryIdentifier: 'breaking',
        },
        trigger: null, // Send immediately
      });
    } catch (error) {
      console.error('Error sending breaking news notification:', error);
    }
  }

  /**
   * Send new content notification
   */
  async sendNewContent(
    stanName: string,
    contentType: string,
    preview: string
  ): Promise<void> {
    try {
      await Notifications.scheduleNotificationAsync({
        content: {
          title: `✨ New ${contentType} from ${stanName}`,
          body: preview,
          data: {
            type: 'new_content',
            stanName,
            contentType,
          },
          sound: true,
        },
        trigger: null,
      });
    } catch (error) {
      console.error('Error sending new content notification:', error);
    }
  }

  /**
   * Get notification preferences
   */
  async getPreferences(): Promise<NotificationPreferences> {
    try {
      const prefs = await AsyncStorage.getItem('notificationPreferences');
      return prefs
        ? JSON.parse(prefs)
        : {
            enabled: true,
            breaking: true,
            daily: true,
            stanUpdates: {},
          };
    } catch (error) {
      console.error('Error getting preferences:', error);
      return {
        enabled: true,
        breaking: true,
        daily: true,
        stanUpdates: {},
      };
    }
  }

  /**
   * Update notification preferences
   */
  async updatePreferences(prefs: Partial<NotificationPreferences>): Promise<void> {
    try {
      const current = await this.getPreferences();
      const updated = { ...current, ...prefs };
      await AsyncStorage.setItem('notificationPreferences', JSON.stringify(updated));
    } catch (error) {
      console.error('Error updating preferences:', error);
    }
  }

  /**
   * Add notification listener
   */
  addNotificationListener(
    callback: (notification: Notifications.Notification) => void
  ): Notifications.Subscription {
    return Notifications.addNotificationReceivedListener(callback);
  }

  /**
   * Add notification response listener (when user taps notification)
   */
  addNotificationResponseListener(
    callback: (response: Notifications.NotificationResponse) => void
  ): Notifications.Subscription {
    return Notifications.addNotificationResponseReceivedListener(callback);
  }

  /**
   * Get push token
   */
  getPushToken(): string | null {
    return this.expoPushToken;
  }

  /**
   * Clear all notifications
   */
  async clearAllNotifications(): Promise<void> {
    await Notifications.dismissAllNotificationsAsync();
  }
}

export const notificationService = new NotificationService();
