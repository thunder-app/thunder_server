export type NotificationRequest = {
  type: string;
  token: string;
  jwts: Array<string>;
  instance: string;
};
