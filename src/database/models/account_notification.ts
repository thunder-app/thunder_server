import { DataTypes, Model } from "sequelize";

import sequelize from "../database";

class AccountNotification extends Model {}

AccountNotification.init(
  {
    id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true,
    },
    type: {
      type: DataTypes.STRING,
      allowNull: false,
    },
    jwt: {
      type: DataTypes.STRING,
      allowNull: false,
      get() {
        // Never return the actual JWT for security reasons
        return "**SECRET**";
      },
    },
    token: {
      type: DataTypes.STRING,
      allowNull: false,
    },
    instance: {
      type: DataTypes.STRING,
      allowNull: false,
    },
    timestamp: {
      type: DataTypes.DATE,
      allowNull: false,
      defaultValue: DataTypes.NOW,
    }
  },
  { sequelize }
);

export default AccountNotification;
