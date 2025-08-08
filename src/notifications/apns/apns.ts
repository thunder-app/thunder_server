import apn from "@parse/node-apn";
import { CommentReplyView, PersonMentionView, PrivateMessageView } from "lemmy-js-client";

let provider : apn.Provider;

if (process.env.APNS_KEY_ID && process.env.APNS_TEAM_ID) {
  const options = {
    token: {
      key: "src/notifications/apns/apns.p8",
      keyId: process.env.APNS_KEY_ID as string,
      teamId: process.env.APNS_TEAM_ID as string,
    },
    production: false,
  };

  provider = new apn.Provider(options);
} else {
  console.warn("APN Key ID or Team ID is empty; not initializing APN service.");
}

/**
 * Creates the template for the notification to be sent to APNs.
 * 
 * @param mention - the [PersonMentionView] associated with the notification
 * @param reply - the [CommentReplyView] associated with the notification
 * @param message - the [PrivateMessageView] associated with the notification
 * 
 * @returns {apn.Notification} the notification to be sent
 */
function createAPNSNotification(
  mention: PersonMentionView | undefined,
  reply: CommentReplyView | undefined,
  message: PrivateMessageView | undefined
): apn.Notification {
  const note = new apn.Notification();

  note.expiry = Math.floor(Date.now() / 1000) + 3600; // Expires 1 hour from now.
  note.topic = process.env.APNS_APP_BUNDLE_ID as string;

  if (mention) {
    note.alert = "You were mentioned in a comment";
    note.payload = { message: mention.comment.content, sender: mention.creator.display_name ?? mention.creator.name };
  } else if (reply) {
    note.alert = "You have a new reply";
    note.payload = { message: reply.comment.content, sender: reply.creator.display_name ?? reply.creator.name };
  } else if (message) {
    note.alert = `You have a new message from ${message.creator.display_name ?? message.creator.name}`;
    note.payload = { message: message.private_message.content, sender: message.creator.display_name ?? message.creator.name };
  }

  return note;
}

export { provider, createAPNSNotification };
