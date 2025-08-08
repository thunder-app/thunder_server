import { PersonMentionView, PrivateMessageView } from "lemmy-js-client";

import { SlimCommentReplyView } from "./lemmy";

export type UnifiedPushObject = {
  mention?: PersonMentionView,
  reply?: SlimCommentReplyView,
  message?: PrivateMessageView
};
