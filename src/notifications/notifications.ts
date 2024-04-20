import Notification from "../database/models/notification";

/**
 * Create a new Notification record in the database. A Notification record represents a single account.
 *
 * @param type - indicates the type of notification to be sent. This can be either "apns" or "upush".
 * @param token - uniquely identifies a single device. This can be a string from APNs, or an endpoint for UnifiedPush.
 * @param jwt - authentication token of the user. This is required in order to fetch notifications on behalf of the user.
 *
 * @returns the created Notification record
 */
async function addNotification(
  type: string,
  token: string,
  jwt: string,
  instance: string,
): Promise<Notification> {
  // First, check to see if the Notification record already exists for a given [jwt]
  let existingNotification = await Notification.findOne({ where: { jwt } });
  
  if (!existingNotification) {
    const notification = await Notification.create({ type, token, jwt, instance });
    await notification.save();

    return notification;
  }
  
  if (existingNotification && existingNotification.get("type") === type && existingNotification.get("token") === token && existingNotification.get("instance") === instance) {
    // Check to see if all the fields match. If so, we don't need to create a new Notification record.
    return existingNotification;
  } else {
    // Update the existing Notification record
    existingNotification = await existingNotification?.update({ type, token, instance });
    return existingNotification;
  }
}

/**
 * Retrieves an array of existing Notification record for a single device.
 *
 * @param token - uniquely identifies a single device. This can be a string from APNs, or an endpoint for UnifiedPush.
 *
 * @returns an array of Notification records
 */
async function getNotification(token: string): Promise<Notification[]> {
  return await Notification.findAll({ where: { token } });
}

/**
 * Deletes one or more Notification records in the database.
 * If [jwt] is provided, only the Notification records associated with the [jwt] will be deleted.
 * If [token] is provided, only the Notification records associated with the [token] will be deleted.
 *
 * @param jwt - authentication token of the user. This is required in order to fetch notifications on behalf of the user.
 * @param token - uniquely identifies a single device. This can be a string from APNs, or an endpoint for UnifiedPush.
 *
 * @returns the number of deleted Notification records
 */
async function deleteNotification(
  jwt: string | undefined,
  token: string | undefined
): Promise<number> {
  if (!jwt && !token) throw new Error("Either jwt or token must be provided");
  if (jwt && token) throw new Error("Only one of jwt or token can be provided");

  if (jwt) return await Notification.destroy({ where: { jwt } });

  return await Notification.destroy({ where: { token } });
}

export { addNotification, getNotification, deleteNotification };
