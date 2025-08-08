import { DataTypes, Model } from "sequelize";

import sequelize from "../database";

class AccountNotification extends Model {}

AccountNotification.init(
  {
    id: {
      type: DataTypes.INTEGER,
      field: "id",
      primaryKey: true,
      autoIncrement: true,
    },
    type: {
      type: DataTypes.STRING,
      field: "type",
      allowNull: false,
    },
    jwt: {
      type: DataTypes.STRING,
      field: "jwt",
      allowNull: false,
      get() {
        // Never return the actual JWT for security reasons
        return "**SECRET**";
      },
    },
    token: {
      type: DataTypes.STRING,
      field: "token",
      allowNull: false,
    },
    instance: {
      type: DataTypes.STRING,
      field: "instance",
      allowNull: false,
    },
    test: {
      type: DataTypes.BOOLEAN,
      field: "test",
      allowNull: false,
      defaultValue: false
    },
    lastReplyId: {
      type: DataTypes.INTEGER,
      field: "last_reply_id",
      allowNull: true,
      defaultValue: null,
    },
    lastMentionId: {
      type: DataTypes.INTEGER,
      field: "last_mention_id",
      allowNull: true,
      defaultValue: null,
    },
    lastMessageId: {
      type: DataTypes.INTEGER,
      field: "last_message_id",
      allowNull: true,
      defaultValue: null,
    },
  },
  { sequelize }
);

export default AccountNotification;
