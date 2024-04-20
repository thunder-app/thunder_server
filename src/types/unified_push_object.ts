import {
  CommentReplyView,
  PersonMentionView,
  PrivateMessageView,
} from "lemmy-js-client";

export type UnifiedPushObject = {
  mention: PersonMentionView | undefined,
  reply: CommentReplyView | undefined,
  message: PrivateMessageView | undefined
};
