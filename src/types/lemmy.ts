import { CommentReplyView } from "lemmy-js-client";

export type SlimCommentReplyView = {
  comment_reply_id: number,
  comment_content: string,
  comment_removed: boolean,
  comment_deleted: boolean,
  creator_name: string,
  creator_actor_id: string,
  post_name: string,
  community_name: string,
  community_actor_id: string,
  recipient_name: string,
  recipient_actor_id: string,
}

export function createSlimCommentReplyView(reply: CommentReplyView | undefined): SlimCommentReplyView | undefined {
  if (!reply) return undefined;

  return {
    comment_reply_id: reply.comment_reply.id,
    comment_content: reply.comment.content,
    comment_removed: reply.comment.removed,
    comment_deleted: reply.comment.deleted,
    creator_name: reply.creator.name,
    creator_actor_id: reply.creator.actor_id,
    post_name: reply.post.name,
    community_name: reply.community.name,
    community_actor_id: reply.community.actor_id,
    recipient_name: reply.recipient.name,
    recipient_actor_id: reply.recipient.actor_id,
  };
}