import {
  CommentReplyView,
  PersonMentionView,
  PrivateMessageView,
} from "lemmy-js-client";

import { UnifiedPushObject } from "./../../types/unified_push_object";

function createUnifiedPushNotification(
  mention: PersonMentionView | undefined,
  reply: CommentReplyView | undefined,
  message: PrivateMessageView | undefined
): UnifiedPushObject {
  const note: UnifiedPushObject = {
    reply: reply,
    mention: mention,
    message: message,
  };

  return note;
}

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

export { createUnifiedPushNotification, sendUnifiedPushNotification };
