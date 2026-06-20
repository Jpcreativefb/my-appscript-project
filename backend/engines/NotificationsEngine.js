/* =========================================================
   NOTIFICATIONS ENGINE
   Free version: automatic email notifications only.
   Phone preference is stored for manual contact/export.
========================================================= */

const NOTIFICATION_LOG_SHEET =
  "NotificationLog";

function getNotificationLogSheet_(){

  const ss =
    SpreadsheetApp.getActive();

  let sh =
    ss.getSheetByName(
      NOTIFICATION_LOG_SHEET
    );

  if (!sh) {

    sh = ss.insertSheet(
      NOTIFICATION_LOG_SHEET
    );

    sh.appendRow([
      "Timestamp",
      "AdminUsername",
      "GameId",
      "Subject",
      "Message",
      "RecipientEmail",
      "RecipientPhone",
      "RecipientUsername",
      "Channel",
      "Status",
      "Error"
    ]);

  }

  return sh;

}

function logNotification_(entry){

  getNotificationLogSheet_()
    .appendRow([
      new Date().toISOString(),
      entry.adminUsername || "",
      entry.gameId || "",
      entry.subject || "",
      entry.message || "",
      entry.recipientEmail || "",
      entry.recipientPhone || "",
      entry.recipientUsername || "",
      entry.channel || "",
      entry.status || "",
      entry.error || ""
    ]);

}

function getNotificationPreference(token){

  const username =
    requireUserFromToken_(
      token
    );

  const record =
    findUserRecordByUsername_(
      username
    );

  if (!record) {
    throw new Error("User not found");
  }

  return {
    success: true,
    username: username,
    email: record.user["Email"] || "",
    phone: record.user["Phone"] || "",
    preferredContactMethod:
      record.user["PreferredContactMethod"] || "none",
    notificationOptIn:
      record.user["NotificationOptIn"] === true ||
      String(record.user["NotificationOptIn"] || "")
        .trim()
        .toLowerCase() === "true",
    notificationChannel:
      record.user["NotificationChannel"] || "none",
    note:
      "Free version sends automatic notifications by email only. Phone is stored only."
  };

}

function setNotificationPreference(
  token,
  contactMethod,
  email,
  phone
){

  const username =
    requireUserFromToken_(
      token
    );

  const record =
    findUserRecordByUsername_(
      username
    );

  if (!record) {
    throw new Error("User not found");
  }

  const method =
    normalizeContactMethod_(
      contactMethod
    );

  email =
    normalizeEmail_(
      email || record.user["Email"]
    );

  phone =
    normalizePhone_(
      phone || record.user["Phone"]
    );

  if (
    email &&
    !validateEmail_(email)
  ) {
    return {
      success: false,
      message: "Enter a valid email"
    };
  }

  if (!validatePhoneOptional_(phone)) {
    return {
      success: false,
      message: "Enter a valid 10-digit phone number"
    };
  }

  if (
    method === "email" &&
    !email
  ) {
    return {
      success: false,
      message: "Email is required for automatic notifications"
    };
  }

  if (
    method === "phone" &&
    !phone
  ) {
    return {
      success: false,
      message: "Phone is required when phone is selected"
    };
  }

  const now =
    new Date().toISOString();

  const optIn =
    method !== "none";

  updateUserFields_(
    record.rowNumber,
    {
      email: email,
      emailKey: email,
      phone: phone,
      phoneKey: buildPhoneKey_(phone),
      preferredContactMethod: method,
      notificationOptIn: optIn,
      notificationChannel: method,
      notificationEmail: method === "email" ? email : "",
      notificationPhone: method === "phone" ? phone : "",
      notificationOptInAt: optIn ? now : "",
      notificationOptOutAt: optIn ? "" : now,
      lastUpdated: now
    }
  );

  return {
    success: true,
    preferredContactMethod: method,
    notificationOptIn: optIn,
    notificationChannel: method,
    message:
      method === "email"
        ? "Email notifications enabled"
        : method === "phone"
          ? "Phone saved. Automatic text messages are disabled in the free version."
          : "Notifications turned off"
  };

}

function adminSendMassNotification(
  token,
  subject,
  message,
  gameId
){

  const adminUsername =
    requireAdminFromToken_(
      token
    );

  subject =
    String(subject || "").trim();

  message =
    String(message || "").trim();

  if (!subject || !message) {

    return {
      success: false,
      message: "Subject and message are required"
    };

  }

  const records =
    getAllUserRecords_();

  let sent = 0;
  let skipped = 0;
  let failed = 0;
  let phoneOnly = 0;

  records.forEach(record => {

    const user =
      record.user;

    const optIn =
      user["NotificationOptIn"] === true ||
      String(user["NotificationOptIn"] || "")
        .trim()
        .toLowerCase() === "true";

    const channel =
      normalizeContactMethod_(
        user["NotificationChannel"] ||
        user["PreferredContactMethod"]
      );

    const email =
      normalizeEmail_(
        user["NotificationEmail"] ||
        user["Email"]
      );

    const phone =
      normalizePhone_(
        user["NotificationPhone"] ||
        user["Phone"]
      );

    const username =
      String(user["Username"] || "").trim();

    if (!optIn || channel === "none") {

      skipped++;

      return;

    }

    if (channel === "phone") {

      phoneOnly++;

      logNotification_({
        adminUsername: adminUsername,
        gameId: gameId,
        subject: subject,
        message: message,
        recipientPhone: phone,
        recipientUsername: username,
        channel: "phone",
        status: "SKIPPED_FREE_VERSION",
        error: "Automatic SMS requires a paid provider"
      });

      return;

    }

    if (!validateEmail_(email)) {

      failed++;

      logNotification_({
        adminUsername: adminUsername,
        gameId: gameId,
        subject: subject,
        message: message,
        recipientEmail: email,
        recipientUsername: username,
        channel: "email",
        status: "FAILED",
        error: "Missing or invalid email"
      });

      return;

    }

    try {

      MailApp.sendEmail(
        email,
        subject,
        message
      );

      sent++;

      logNotification_({
        adminUsername: adminUsername,
        gameId: gameId,
        subject: subject,
        message: message,
        recipientEmail: email,
        recipientUsername: username,
        channel: "email",
        status: "SENT",
        error: ""
      });

    } catch (err) {

      failed++;

      logNotification_({
        adminUsername: adminUsername,
        gameId: gameId,
        subject: subject,
        message: message,
        recipientEmail: email,
        recipientUsername: username,
        channel: "email",
        status: "FAILED",
        error: err.message || String(err)
      });

    }

  });

  return {
    success: true,
    sent: sent,
    skipped: skipped,
    phoneOnly: phoneOnly,
    failed: failed,
    message:
      "Email notifications sent: " + sent +
      ". Phone-only users skipped: " + phoneOnly +
      ". Failed: " + failed + "."
  };

}

function adminGetPhoneNotificationList(token){

  requireAdminFromToken_(
    token
  );

  const records =
    getAllUserRecords_();

  const users =
    records
      .map(record => record.user)
      .filter(user => {

        const optIn =
          user["NotificationOptIn"] === true ||
          String(user["NotificationOptIn"] || "")
            .trim()
            .toLowerCase() === "true";

        const channel =
          normalizeContactMethod_(
            user["NotificationChannel"] ||
            user["PreferredContactMethod"]
          );

        return optIn && channel === "phone";

      })
      .map(user => ({
        username: user["Username"] || "",
        phone: user["NotificationPhone"] || user["Phone"] || ""
      }));

  return {
    success: true,
    users: users
  };

}
