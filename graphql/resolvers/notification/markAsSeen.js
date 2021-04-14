const Notification = require("../../../models/notification");

module.exports = async function ({ notificationId }, req) {
    if (!req.instructorIsAuth && !req.studentIsAuth) {
        const error = new Error("Not authenticated!");
        error.code = 403;
        throw error;
    }

    const notification = await Notification.findById(notificationId);
    if (notification.documentType === "chat") {
        await Notification.updateMany(
            { fromUser: notification.fromUser, documentType: "chat" },
            {
                $push: {
                    usersSeen: req.userId,
                },
            }
        );
    } else {
        notification.usersSeen.push(req.userId);
        await notification.save();
    }
    return true;
}