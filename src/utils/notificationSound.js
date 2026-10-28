import notificationSoundUrl from "../assets/notification-sound.mp3";

let audioInstance = null;

export const playNotificationSound = () => {
  try {
    const isMuted = localStorage.getItem("worknest_global_mute") === "true";
    if (isMuted) return;

    try {
      const storedUser = localStorage.getItem("worknestUser");
      if (storedUser) {
        const parsed = JSON.parse(storedUser);
        if (
          parsed?.dndUntil &&
          new Date(parsed.dndUntil).getTime() > Date.now()
        ) {
          return;
        }
      }
    } catch {}

    if (!audioInstance) {
      audioInstance = new Audio(notificationSoundUrl);
      audioInstance.preload = "auto";
    }

    audioInstance.currentTime = 0;
    const playPromise = audioInstance.play();
    if (playPromise !== undefined) {
      playPromise.catch((err) => {
        console.debug(
          "Notification sound play interrupted or blocked by browser policy:",
          err,
        );
      });
    }
  } catch (error) {
    console.debug("Failed to play notification sound:", error);
  }
};

export default playNotificationSound;
