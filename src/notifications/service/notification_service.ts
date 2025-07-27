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
  // You can hard-code this to a lower number for testing
  var lastReplyId = notification.get("lastReplyId") as number;

  // Get all unread replies
  let { replies } = await client.getReplies({
    limit: 50,
    unread_only: true,
    sort: "New",
  });

  // Filter out replies newer than the last id
  replies = replies.filter((reply) => {
    return reply.comment_reply.id > lastReplyId;
  });

  const isFirstCheck = lastReplyId == null;

  lastReplyId = replies[0]?.comment_reply?.id || lastReplyId || 0;

  if (isFirstCheck) {
    // The first time we check for a given account we don't want to send all notifications from the past.
    // So just update the ID and let the NEXT check send NEW notifications.
    return lastReplyId;
  }

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

  return lastReplyId;
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
  // You can hard-code this to a lower number for testing
  var lastMentionId = notification.get("lastMentionId") as number;

  // Get all unread mentions
  let { mentions } = await client.getPersonMentions({
    limit: 50,
    unread_only: true,
    sort: "New",
  });

  // Filter out mentions newer than the last id
  mentions = mentions.filter((mention) => {
    return mention.person_mention.id > lastMentionId;
  });

  const isFirstCheck = lastMentionId == null;

  lastMentionId = mentions[0]?.person_mention?.id || lastMentionId || 0;

  if (isFirstCheck) {
    // The first time we check for a given account we don't want to send all notifications from the past.
    // So just update the ID and let the NEXT check send NEW notifications.
    return lastMentionId;
  }
  
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

  return lastMentionId;
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
  // You can hard-code this to a lower number for testing
  var lastMessageId = notification.get("lastMessageId") as number;

  // Get all unread private messages
  let { private_messages: privateMessages } = await client.getPrivateMessages({
    limit: 50,
    unread_only: true,
  });

  // Filter out messages newer than the last id
  privateMessages = privateMessages.filter((privateMessage) => {
    return privateMessage.private_message.id > lastMessageId;
  });

  const isFirstCheck = lastMessageId == null;

  lastMessageId = privateMessages[0]?.private_message?.id || lastMessageId || 0;

  if (isFirstCheck) {
    // The first time we check for a given account we don't want to send all notifications from the past.
    // So just update the ID and let the NEXT check send NEW notifications.
    return lastMessageId;
  }

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

  return lastMessageId;
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
  const notifications = await AccountNotification.findAll();

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
        const lastReplyId = await checkUnreadReplies(client, notification);
        const lastMentionId = await checkUnreadMentions(client, notification);
        const lastMessageId = await checkUnreadMessages(client, notification);
        await checkTests(notification);

        // Update the notification
        await notification.update({ lastReplyId: lastReplyId, lastMentionId: lastMentionId, lastMessageId: lastMessageId, testQueued: false });
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
