import {
  CommentReplyView,
  PersonMentionView,
  PrivateMessageView,
} from "lemmy-js-client";
import { setGlobalDispatcher, Agent } from "undici";

import { UnifiedPushObject } from "./../../types/unified_push_object";

import { createSlimCommentReplyView } from "../../types/lemmy";

setGlobalDispatcher(new Agent({connect: { timeout: 30_000 }}));

/**
 * Creates the template for the notification to be sent to UnifiedPush.
 * 
 * @param mention - the [PersonMentionView] associated with the notification
 * @param reply - the [CommentReplyView] associated with the notification
 * @param message - the [PrivateMessageView] associated with the notification
 * 
 * @returns {UnifiedPushObject} the notification to be sent
 */
function createUnifiedPushNotification(
  mention: PersonMentionView | undefined,
  reply: CommentReplyView | undefined,
  message: PrivateMessageView | undefined
): UnifiedPushObject {
  const note: UnifiedPushObject = {
    reply: createSlimCommentReplyView(reply),
    // TODO: Use slim models for mention/message below
    mention: mention,
    message: message,
  };

  return note;
}

/**
 * Sends the notification through UnifiedPush.
 * 
 * @param payload - the notification information to be sent
 * @param token - the endpoint for UnifiedPush
 */
async function sendUnifiedPushNotification(
  payload: UnifiedPushObject,
  token: string
) {
  fetch(token, {
    method: "POST",
    body: JSON.stringify(payload),
    headers: {
      "Content-type": "application/json; charset=UTF-8",
    },
  });
}

/**
 * Sends the notification through UnifiedPush.
 */
async function sendTestUnifiedPushNotification(
  token: string
) {
  fetch(token, {
    method: "POST",
    body: 'test',
    headers: {
      "Content-type": "application/json; charset=UTF-8",
    },
  });
}

export { createUnifiedPushNotification, sendUnifiedPushNotification, sendTestUnifiedPushNotification };
