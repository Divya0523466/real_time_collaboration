export const requestNotificationPermission = async () => {
  if (!("Notification" in window)) {
    console.warn("This browser does not support desktop notification");
    return false;
  }

  if (Notification.permission === "granted") {
    return true;
  }

  if (Notification.permission !== "denied") {
    const permission = await Notification.requestPermission();
    return permission === "granted";
  }

  return false;
};

export const showDesktopNotification = (title, options = {}) => {
  if (!("Notification" in window)) return;
  
  if (Notification.permission === "granted") {
    const notification = new Notification(title, {
      ...options
    });

    notification.onclick = function() {
      window.focus();
      this.close();
    };
  }
};
