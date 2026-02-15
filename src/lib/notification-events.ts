export const NOTIFICATION_CHANGED_EVENT = 'notification:changed';

export const emitNotificationChanged = () => {
  if (typeof window === 'undefined') return;
  window.dispatchEvent(new Event(NOTIFICATION_CHANGED_EVENT));
};

