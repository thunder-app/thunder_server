import express from "express";

// Types
import { Request, Response } from "express";
import { NotificationRequest } from "./types/notification_request";

// Database
import sequelize from "./database/database";

// Helper functions
import { addNotification } from "./notifications/notifications";

// Start cron job
import notificationService from "./notifications/service/notification_service";
import Notification from "./database/models/notification";
notificationService.start();

const DEBUG_MODE = true;

// Create an Express app
const app = express();
const port = 2831;

// Middleware for body parsing
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Routes
app.post("/notifications", async (req: Request, res: Response) => {
  const { type, token, jwts, instance } = req.body as NotificationRequest;

  if (!type || !token || !jwts || !instance)
    return res.status(400).send("Missing one or more required parameters");

  try {
    const results = [];

    for (const jwt of jwts) {
      let notification = await addNotification(type, token, jwt, instance);
      results.push(notification.toJSON());
    }

    res.status(201).json(results);
  } catch (error) {
    console.error("Error creating notification:", error);
    res.status(500).json({ error: "Internal Server Error" });
  }
});

app.delete("/notifications", (req, res) => {
  const { jwts } = req.body as NotificationRequest;

  if (!jwts)
    return res.status(400).send("Missing one or more required parameters");

  try {
    for (const jwt of jwts) {
      let notification = Notification.destroy({ where: { jwt } });
    }

    res.status(200).json({ message: "Notifications deleted successfully" });
  } catch (error) {
    console.error("Error deleting notification:", error);
    res.status(500).json({ error: "Internal Server Error" });
  }
});

// Start the server and connect to the database
app.listen(port, async () => {
  console.log(`Server is running on http://localhost:${port}`);

  await sequelize.sync({ force: DEBUG_MODE });
  console.log("All models were synchronized successfully.");
});
