import cron from "node-cron";
import { Op } from "sequelize";
import { isAfter, subMinutes } from "date-fns";
import { LemmyHttp } from "lemmy-js-client";

import Notification from "../../database/models/notification";
import { provider, createAPNSNotification } from "../apns/apns";
import { createUnifiedPushNotification, sendUnifiedPushNotification } from "../unifiedpush/unifiedpush";

const INTERVAL = 1;
let triggerDateTime;

async function checkUnreadReplies(
  client: LemmyHttp,
  notification: Notification
) {
  const timestamp = notification.get("timestamp") as Date;

  // Get all unread replies
  let { replies } = await client.getReplies({
    limit: 50,
    unread_only: true,
  });

  // Filter out replies newer than the last timestamp
  replies = replies.filter((reply) => {
    return isAfter(new Date(reply.comment.published), subMinutes(timestamp, 90));
  });

  console.log("Found " + replies.length + " unread replies");

  for (const reply of replies) {
    const notificationType = notification.get("type") as string;
    const token = notification.get("token") as string;

    switch (notificationType) {
      case "apn":
        const result = await provider.send(
          createAPNSNotification(undefined, reply, undefined),
          token
        );
        break;
      case "unifiedPush":
        // TODO: send push notification
        await sendUnifiedPushNotification(createUnifiedPushNotification(undefined, reply, undefined), token);
        break;
      default:
        break;
    }
  }
}

async function checkUnreadMentions(
  client: LemmyHttp,
  notification: Notification
) {
  const timestamp = notification.get("timestamp") as Date;

  // Get all unread mentions
  let { mentions } = await client.getPersonMentions({
    limit: 50,
    unread_only: true,
  });

  // Filter out mentions newer than the last timestamp
  mentions = mentions.filter((mention) => {
    return isAfter(new Date(mention.person_mention.published), timestamp);
  });

  console.log("Found " + mentions.length + " unread mentions");

  for (const mention of mentions) {
    const notificationType = notification.get("type") as string;
    const token = notification.get("token") as string;

    switch (notificationType) {
      case "apn":
        const result = await provider.send(
          createAPNSNotification(mention, undefined, undefined),
          token
        );
      case "unifiedPush":
        // TODO: send push notification
        break;
      default:
        break;
    }
  }
}

async function checkUnreadMessages(
  client: LemmyHttp,
  notification: Notification
) {
  const timestamp = notification.get("timestamp") as Date;

  // Get all unread private messages
  let { private_messages: privateMessages } = await client.getPrivateMessages({
    limit: 50,
    unread_only: true,
  });

  // Filter out messages newer than the last timestamp
  privateMessages = privateMessages.filter((message) => {
    return isAfter(new Date(message.private_message.published), timestamp);
  });

  console.log("Found " + privateMessages.length + " unread messages");

  for (const message of privateMessages) {
    const notificationType = notification.get("type") as string;
    const token = notification.get("token") as string;

    switch (notificationType) {
      case "apn":
        await provider.send(
          createAPNSNotification(undefined, undefined, message),
          token
        );
      case "unifiedPush":
        // TODO: send push notification
        break;
      default:
        break;
    }
  }
}

const checkNotifications = async () => {
  triggerDateTime = new Date();

  const notifications = await Notification.findAll({
    where: { timestamp: { [Op.lt]: subMinutes(triggerDateTime, INTERVAL) } },
  });

  console.log("Found " + notifications.length + " notifications to check");

  // Group notifications by instance
  let groupedNotifications: { [key: string]: Notification[] } = {};

  for (const notification of notifications) {
    const instance = notification.get("instance") as string;

    if (!groupedNotifications[instance]) {
      groupedNotifications[instance] = [notification];
    } else {
      groupedNotifications[instance].push(notification);
    }
  }

  console.log(
    "Found " + Object.keys(groupedNotifications).length + " instances to check"
  );

  // For each instance, check if the given account has any notifications
  const instances = Object.keys(groupedNotifications);

  for (const instance of instances) {
    const notifications = groupedNotifications[instance];
    const client: LemmyHttp = new LemmyHttp(`https://${instance}`);

    for (const notification of notifications) {
      const jwt = notification.getDataValue("jwt") as string;
      client.setHeaders({ Authorization: `Bearer ${jwt}` });

      try {
        await checkUnreadReplies(client, notification);
        await checkUnreadMentions(client, notification);
        await checkUnreadMessages(client, notification);

        // Update the notification timestamp
        await notification.update({ timestamp: triggerDateTime });
      } catch (error) {
        console.error(error);
      }
    }
  }
};

// Define a cron schedule with a given interval
const schedule = `*/${INTERVAL} * * * *`;

// Randomize start time to stagger execution
const randomDelay = Math.floor(Math.random() * 600);

// Schedule the function to run at the defined intervals with random delay
const notificationService = cron.schedule(
  schedule,
  () => {
    setTimeout(() => {
      checkNotifications();
    }, randomDelay);
  },
  {
    scheduled: true,
    runOnInit: true,
  }
);

export default notificationService;
