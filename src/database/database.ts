import { Sequelize } from "sequelize";

// Load environment variables
import dotenv from "dotenv";
dotenv.config({ quiet: true });

// Configure database
const sequelize = new Sequelize(
  `postgres://${process.env.POSTGRES_USER || "postgres"}:${process.env.POSTGRES_PASSWORD || "password"}@${process.env.POSTGRES_HOSTNAME || "postgres"}:${process.env.POSTGRES_PORT || "5432"}/${process.env.POSTGRES_DATABASE || "thunder_database"}`,
  {
    logging: false,
  }
);

export default sequelize;
