import cron from "node-cron";
import { Op } from "sequelize";
import { isAfter, subMinutes } from "date-fns";
import { LemmyHttp } from "lemmy-js-client";
import { Sequelize } from "sequelize";

import AccountNotification from "../../database/models/account_notification";
import { provider, createAPNSNotification } from "../apns/apns";
import { createUnifiedPushNotification, sendTestUnifiedPushNotification, sendUnifiedPushNotification } from "../unifiedpush/unifiedpush";

// The interval in minutes to check for new notifications
const INTERVAL = 1;

// The current trigger time for the cron job
let triggerDateTime;

/**
 * Checks for new unread replies, and sends a notification for each one based on the type of the notification.
 * 
 * @param client - the Lemmy HTTP client to use to make API calls. This client should already be initialized with the proper [jwt].
 * @param notification - the [AccountNotification] to check for unread replies.
 */
async function checkUnreadReplies(
  client: LemmyHttp,
  notification: AccountNotification
) {
  const timestamp = notification.get("timestamp") as Date;

  // Get all unread replies
  let { replies } = await client.getReplies({
    limit: 50,
    unread_only: true,
  });

  // Filter out replies newer than the last timestamp
  replies = replies.filter((reply) => {
    // Change `0` to the number of minutes you want to check. It makes it easier to debug without having to create a lot of replies.
    return isAfter(new Date(reply.comment.published), subMinutes(timestamp, 0));
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
        await sendUnifiedPushNotification(createUnifiedPushNotification(undefined, reply, undefined), token);
        break;
      default:
        break;
    }
  }
}

/**
 * Checks for new unread mentions, and sends a notification for each one based on the type of the notification.
 * 
 * @param client - the Lemmy HTTP client to use to make API calls. This client should already be initialized with the proper [jwt].
 * @param notification - the [AccountNotification] to check for unread mentions.
 */
async function checkUnreadMentions(
  client: LemmyHttp,
  notification: AccountNotification
) {
  const timestamp = notification.get("timestamp") as Date;

  // Get all unread mentions
  let { mentions } = await client.getPersonMentions({
    limit: 50,
    unread_only: true,
  });

  // Filter out mentions newer than the last timestamp
  mentions = mentions.filter((mention) => {
    return isAfter(new Date(mention.person_mention.published), subMinutes(timestamp, 0));
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
        await sendUnifiedPushNotification(createUnifiedPushNotification(mention, undefined, undefined), token);
        break;
      default:
        break;
    }
  }
}

/**
 * Checks for new unread private messages, and sends a notification for each one based on the type of the notification.
 * 
 * @param client - the Lemmy HTTP client to use to make API calls. This client should already be initialized with the proper [jwt].
 * @param notification - the [AccountNotification] to check for unread private messages.
 */
async function checkUnreadMessages(
  client: LemmyHttp,
  notification: AccountNotification
) {
  const timestamp = notification.get("timestamp") as Date;

  // Get all unread private messages
  let { private_messages: privateMessages } = await client.getPrivateMessages({
    limit: 50,
    unread_only: true,
  });

  // Filter out messages newer than the last timestamp
  privateMessages = privateMessages.filter((message) => {
    return isAfter(new Date(message.private_message.published), subMinutes(timestamp, 0));
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
        await sendUnifiedPushNotification(createUnifiedPushNotification(undefined, undefined, message), token);
        break;
      default:
        break;
    }
  }
}

async function checkTests(notification: AccountNotification) {
  if (notification.get("testQueued") as boolean) {
    console.log('Found 1 test queued');
    
    const notificationType = notification.get("type") as string;
    const token = notification.get("token") as string;

    switch (notificationType) {
      case "apn":
        // TODO: Implement this for APN
      case "unifiedPush":
        await sendTestUnifiedPushNotification(token);
        break;
      default:
        break;
    }
  }
}

/**
 * The main function that checks for new notifications. This is triggered from a cron job and is ran at every `INTERVAL` minutes.
 */
const checkNotifications = async () => {
  triggerDateTime = new Date();

  const notifications = await AccountNotification.findAll({
    where: Sequelize.or({ timestamp: { [Op.lt]: subMinutes(triggerDateTime, INTERVAL) } }, { testQueued: true }),
  });

  console.log("Found " + notifications.length + " notifications to check");

  // Group notifications by instance
  let groupedNotifications: { [key: string]: AccountNotification[] } = {};

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
        await checkTests(notification);

        // Update the notification timestamp
        await notification.update({ timestamp: triggerDateTime, testQueued: false });
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

export { notificationService, checkNotifications };
