import {
  PersonMentionView,
  PrivateMessageView,
} from "lemmy-js-client";

import { SlimCommentReplyView } from "./lemmy";

export type UnifiedPushObject = {
  mention: PersonMentionView | undefined,
  reply: SlimCommentReplyView | undefined,
  message: PrivateMessageView | undefined
};
