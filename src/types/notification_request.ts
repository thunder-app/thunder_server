export type NotificationRequest = {
  type: string;
  token: string;
  jwt: string;
  instance: string;
};

export type DeleteNotificationRequest = {
  jwts: Array<string>;
};