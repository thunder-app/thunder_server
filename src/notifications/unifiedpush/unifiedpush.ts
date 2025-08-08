import { setGlobalDispatcher, Agent } from "undici";
import { CommentReplyView, PersonMentionView, PrivateMessageView } from "lemmy-js-client";

import { UnifiedPushObject } from "./../../types/unified_push_object";

import { createSlimCommentReplyView } from "../../types/lemmy";

setGlobalDispatcher(new Agent({ connect: { timeout: 30_000 } }));

/**
 * Creates the template for the notification to be sent to UnifiedPush.
 * 
 * @param mention - the [PersonMentionView] associated with the notification
 * @param reply - the [CommentReplyView] associated with the notification
 * @param message - the [PrivateMessageView] associated with the notification
 * 
 * @returns {UnifiedPushObject} the notification to be sent
 */
function createUnifiedPushNotification(mention?: PersonMentionView, reply?: CommentReplyView, message?: PrivateMessageView): UnifiedPushObject {
  const note: UnifiedPushObject = {
    reply: createSlimCommentReplyView(reply),
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
async function sendUnifiedPushNotification(payload: UnifiedPushObject, token: string, test: boolean = false) {
  console.log(`Sending UnifiedPush notification to ${token}`);

  fetch(token, {
    method: "POST",
    body: test ? 'test' : JSON.stringify(payload),
    headers: {
      "Content-type": "application/json; charset=UTF-8",
    },
  });
}

export { createUnifiedPushNotification, sendUnifiedPushNotification };
