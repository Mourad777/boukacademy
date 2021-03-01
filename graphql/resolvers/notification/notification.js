const Notification = require("../../../models/notification");
const { getObjectUrl } = require("../../../s3");
const Student = require("../../../models/student");
const Instructor = require("../../../models/instructor");
const Course = require("../../../models/course");
const Configuration = require("../../../models/configuration");

module.exports = {
  notifications: async function ({ }, req) {
    if (!req.instructorIsAuth && !req.studentIsAuth) {
      const error = new Error("Not authenticated!");
      error.code = 403;
      throw error;
    }

    const student = await Student.findById(req.userId);
    const instructor = await Instructor.findById(req.userId);
    const notifications = await Notification.find();
    const configuration = await Configuration.findOne({ user: req.userId });
    const processedNotifications = await Promise.all(
      (
        notifications.filter(
          (n) =>
            n.toUserType ===
            `${req.studentIsAuth ? "student" : "instructor"}` ||
            n.userType === "all" ||
            (n.toSpecificUser || "").toString() === req.userId
        ) || []
      )
        .reverse()
        .map(async (n) => {
          const seen = (n.usersSeen || []).includes(req.userId.toString());
          //filter notifications according to users config settings
          if (
            (n.documentType === "courseOfficeHours" &&
              !configuration.isCourseNotifications) ||
            (n.documentType === "assignment" &&
              !configuration.isAssignmentNotifications) ||
            (n.documentType === "test" && !configuration.isTestNotifications) ||
            (n.documentType === "lesson" &&
              !configuration.isLessonNotifications) ||
            (n.documentType === "testReview" &&
              !configuration.isTestNotifications) ||
            (n.documentType === "assignmentReview" &&
              !configuration.isAssignmentNotifications) ||
            (n.documentType === "resetTest" &&
              !configuration.isTestNotifications) ||
            (n.documentType === "resetAssignment" &&
              !configuration.isAssignmentNotifications) ||
            (n.documentType === "testSubmitted" &&
              !configuration.isTestNotifications) ||
            (n.documentType === "assignmentSubmitted" &&
              !configuration.isAssignmentNotifications) ||

            (n.documentType === "newStudentAccount" &&
              !configuration.isNewStudentAccountNotifications) ||

            (n.documentType === "newInstructorAccount" &&
              !configuration.isNewInstructorAccountNotifications) ||

            (n.documentType === "assignmentSubmitted" &&
              !configuration.isAssignmentNotifications) ||

            (n.documentType === "autoEnroll" &&
              !configuration.isEnrollNotifications) ||

            (n.documentType === "testExcused" &&
              !configuration.isTestNotifications) ||
            (n.documentType === "assignmentExcused" &&
              !configuration.isAssignmentNotifications) ||

            (n.documentType === "courseEnrollRequest" &&
              !configuration.isEnrollNotifications) ||
            (n.documentType === "courseEnrollDeny" &&
              !configuration.isCourseNotifications) ||
            (n.documentType === "courseEnrollApprove" &&
              !configuration.isCourseNotifications) ||
            (n.documentType === "courseDrop" &&
              !configuration.isDropCourseNotifications) ||
            (n.documentType === "courseDropDeadline" &&
              !configuration.isCourseNotifications) ||
            (n.documentType === "courseGrade" &&
              !configuration.isCourseNotifications) ||
            (n.documentType === "chat" &&
              !configuration.isChatNotifications)
          )
            return null;
          if (student) {
            //filter student notifications
            if (
              !(
                student.coursesEnrolled.includes(n.course) ||
                (n.documentType === "courseEnrollDeny" &&
                  course.studentsEnrollRequests.findIndex(
                    (r) =>
                      r.student._id.toString() === student._id.toString() &&
                      r.denied
                  ) > -1)
              ) ||
              !course.courseActive
            )
              return null;
          }
          if (instructor && n.course) {
            //filter instructor notifications
            if (!instructor.coursesTeaching.includes(n.course)) return null;
          }
          return {
            ...n._doc,
            avatar: await getObjectUrl(n.avatar),
            seen,
          };
        })
    );
    return (processedNotifications || []).filter((n) => n);
  },

  markAsSeen: async function ({ notificationId }, req) {
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
  },
};
