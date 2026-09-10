import Constants from "expo-constants";
import { Platform } from "react-native";

const FIXNOW_REQUESTS_CHANNEL = "fixnow-live-requests";

function isExpoGo() {
  return Constants.appOwnership === "expo";
}

async function loadNotificationsModule() {
  if (isExpoGo()) {
    return undefined;
  }

  const Notifications = await import("expo-notifications");

  Notifications.setNotificationHandler({
    handleNotification: async () => ({
      shouldShowBanner: true,
      shouldShowList: true,
      shouldPlaySound: true,
      shouldSetBadge: false
    })
  });

  return Notifications;
}

export async function prepareLocalNotifications() {
  const Notifications = await loadNotificationsModule();

  if (!Notifications) {
    return false;
  }

  const permissions = await Notifications.getPermissionsAsync();
  let status = permissions.status;

  if (status !== "granted") {
    const requestedPermissions = await Notifications.requestPermissionsAsync();
    status = requestedPermissions.status;
  }

  if (Platform.OS === "android") {
    await Notifications.setNotificationChannelAsync(FIXNOW_REQUESTS_CHANNEL, {
      name: "Live Requests",
      importance: Notifications.AndroidImportance.HIGH,
      vibrationPattern: [0, 250, 180, 250],
      lightColor: "#0F9D58",
      sound: "default"
    });
  }

  return status === "granted";
}

export async function sendLiveRequestPanelNotification(title: string, body: string, requestId: string) {
  const Notifications = await loadNotificationsModule();

  if (!Notifications) {
    return;
  }

  await Notifications.scheduleNotificationAsync({
    content: {
      title,
      body,
      sound: "default",
      data: {
        requestId,
        type: "live-request"
      }
    },
    trigger: {
      type: Notifications.SchedulableTriggerInputTypes.DATE,
      date: new Date(Date.now() + 200),
      channelId: Platform.OS === "android" ? FIXNOW_REQUESTS_CHANNEL : undefined
    }
  });
}
