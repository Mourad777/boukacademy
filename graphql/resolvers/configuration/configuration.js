const Configuration = require("../../../models/configuration");
const Course = require("../../../models/course");
const io = require("../../../socket");
const Instructor = require("../../../models/instructor");
const { validateConfiguration } = require("./validate");
const { createToken } = require("../authentication/util");


module.exports = {
  configuration: async function ({ }, req) {
    let userType;
    if (req.instructorIsAuth) userType = "instructor";
    if (req.studentIsAuth) userType = "student";
    const user = await require(`../../../models/${userType}`).findById(
      req.userId
    );

    if (!user) {
      const error = new Error("No account found with the provided token");
      error.code = 401;
      throw error;
    }

    const config = await Configuration.findById(user.configuration);
    if (!config) {
      const error = new Error("No configuration found");
      error.code = 401;
      throw error;
    }
    let adjustedConfig;
    if (user.admin) {
      adjustedConfig = config;
    } else {
      //find admin config and merge the properties with user config
      const admin = await Instructor.findOne({ admin: true }).populate(
        "configuration"
      );

      const courses = await Course.find();

      // const coursesThatAllowOfficehoursAnytime = [];

      const coursesThatAllowOfficehoursAnytime = await Promise.all(
        courses
          .map(async (c) => {
            const instructorConfig = await Configuration.findOne({
              user: c.courseInstructor,
            });

            if (instructorConfig.isChatAllowedOutsideOfficehours) {
              return c._id;
            }
          })
          .filter((i) => i)
      );

      const adminSettings = admin._doc.configuration;
      adjustedConfig = {
        ...adminSettings._doc,
        ...config._doc,
        blockedStudents: [],
        blockedInstructors: [],
        coursesIsChatAllowedOutsideOfficehours: (userType = "student"
          ? coursesThatAllowOfficehoursAnytime
          : null),
      };
    }
    return adjustedConfig;
  },

  updateConfiguration: async function ({ configurationInput }, req) {

    let userType;
    if (req.instructorIsAuth) userType = "instructor";
    if (req.studentIsAuth) userType = "student";
    const user = await require(`../../../models/${userType}`).findById(
      req.userId
    );

    const isAccountSuspended = user.isAccountSuspended
    if (isAccountSuspended) {
      const error = new Error("Your account has been suspended contact the administrator");
      error.code = 403;
      throw error;
    }

    if (!user) {
      const error = new Error("No account found with the provided token");
      error.code = 401;
      throw error;
    }

    const config = await Configuration.findById(user.configuration);
    if (!config) {
      const error = new Error("No config found");
      error.code = 401;
      throw error;
    }

    const errors = validateConfiguration(configurationInput, userType, user.admin);
    if (errors.length > 0) {
      const error = new Error("Invalid input.");
      error.data = errors;
      error.code = 422;
      throw error;
    }
    const isStayLoggedInChanged = (config.isStayLoggedIn && !configurationInput.isStayLoggedIn) || (!config.isStayLoggedIn && configurationInput.isStayLoggedIn);



    // isCoursePushNotifications
    // isLessonPushNotifications
    // isAssignmentPushNotifications
    // isTestPushNotifications
    // isChatPushNotifications

    // isEnrollPushNotifications
    // isDropCoursePushNotifications

    // isNewInstructorAccountPushNotifications
    // isNewStudentAccountPushNotifications

    // isSendTestEmails
    // isSendLessonEmails
    // isSendAssignmentEmails
    // isSendCourseEmails

    // isSendTestPushNotifications
    // isSendLessonPushNotifications
    // isSendAssignmentPushNotifications
    // isSendCoursePushNotifications


    if (userType === "student") {
      config.isTestNotifications = configurationInput.isTestNotifications;
      config.isTestPushNotifications = configurationInput.isTestPushNotifications;
      config.isTestEmails = configurationInput.isTestEmails;
      config.isLessonNotifications = configurationInput.isLessonNotifications;
      config.isLessonPushNotifications = configurationInput.isLessonPushNotifications;
      config.isLessonEmails = configurationInput.isLessonEmails;
      config.isAssignmentNotifications =
        configurationInput.isAssignmentNotifications;
      config.isAssignmentPushNotifications =
        configurationInput.isAssignmentPushNotifications;
      config.isAssignmentEmails = configurationInput.isAssignmentEmails;
      config.isCourseNotifications = configurationInput.isCourseNotifications;
      config.isCoursePushNotifications = configurationInput.isCoursePushNotifications;
      config.isCourseEmails = configurationInput.isCourseEmails;
      config.isChatNotifications = configurationInput.isChatNotifications;
      config.isChatPushNotifications = configurationInput.isChatPushNotifications;
      config.isHideActiveStatus = configurationInput.isHideActiveStatus;
      config.isStayLoggedIn = configurationInput.isStayLoggedIn;
    }

    if (userType === "instructor" && !user.admin) {
      config.isTestNotifications = configurationInput.isTestNotifications;
      config.isTestEmails = configurationInput.isTestEmails;
      config.isTestPushNotifications = configurationInput.isTestPushNotifications;
      config.isAssignmentNotifications =
        configurationInput.isAssignmentNotifications;
      config.isAssignmentEmails = configurationInput.isAssignmentEmails;
      config.isAssignmentPushNotifications =
        configurationInput.isAssignmentPushNotifications;
      config.isSendTestNotifications =
        configurationInput.isSendTestNotifications;
      config.isSendTestEmails = configurationInput.isSendTestEmails;
      config.isSendTestPushNotifications =
        configurationInput.isSendTestPushNotifications;
      config.isSendLessonNotifications =
        configurationInput.isSendLessonNotifications;
      config.isSendLessonEmails = configurationInput.isSendLessonEmails;
      config.isSendLessonPushNotifications =
        configurationInput.isSendLessonPushNotifications;
      config.isSendAssignmentNotifications =
        configurationInput.isSendAssignmentNotifications;
      config.isSendAssignmentEmails = configurationInput.isSendAssignmentEmails;
      config.isSendAssignmentPushNotifications =
        configurationInput.isSendAssignmentPushNotifications;
      config.isSendCourseNotifications =
        configurationInput.isSendCourseNotifications;
      config.isSendCourseEmails = configurationInput.isSendCourseEmails;
      config.isSendCoursePushNotifications =
        configurationInput.isSendCoursePushNotifications;

      config.isChatAllowedOutsideOfficehours =
        configurationInput.isChatAllowedOutsideOfficehours;

      config.isChatNotifications = configurationInput.isChatNotifications;
      config.isChatPushNotifications = configurationInput.isChatPushNotifications;

      config.isEnrollEmails = configurationInput.isEnrollEmails;
      config.isEnrollNotifications = configurationInput.isEnrollNotifications;
      config.isEnrollPushNotifications = configurationInput.isEnrollPushNotifications;
      config.isDropCourseEmails = configurationInput.isDropCourseEmails;
      config.isDropCourseNotifications =
        configurationInput.isDropCourseNotifications;
      config.isDropCoursePushNotifications =
        configurationInput.isDropCoursePushNotifications;

      config.isHideActiveStatus = configurationInput.isHideActiveStatus;
      config.isStayLoggedIn = configurationInput.isStayLoggedIn;
    }

    if (userType === "instructor" && user.admin) {
      const instructors = await Instructor.find();

      const numberOfInstructorCourses = await Promise.all(
        instructors.map(async (inst) => {
          return await Course.countDocuments({ courseInstructor: inst._id });
        })
      );

      if (
        (numberOfInstructorCourses || []).some(
          (el) => el > configurationInput.instructorCoursesLimit
        ) &&
        configurationInput.isInstructorCoursesLimit
      ) {
        const error = new Error(
          "You cannot set the max courses limit to a number that is less than the number of current courses"
        );
        error.code = 403;
        throw error;
      }
      config.isTestNotifications = configurationInput.isTestNotifications;
      config.isTestEmails = configurationInput.isTestEmails;
      config.isTestPushNotifications = configurationInput.isTestPushNotifications;
      config.isAssignmentNotifications =
        configurationInput.isAssignmentNotifications;
      config.isAssignmentEmails = configurationInput.isAssignmentEmails;
      config.isAssignmentPushNotifications =
        configurationInput.isAssignmentPushNotifications;
      config.dropCourseGrade = configurationInput.dropCourseGrade;
      config.isDropCoursePenalty = configurationInput.isDropCoursePenalty;
      config.coursePassGrade = configurationInput.coursePassGrade;
      config.isEnrollAllowedAfterDropCourse =
        configurationInput.isEnrollAllowedAfterDropCourse;
      config.isInstructorCoursesLimit =
        configurationInput.isInstructorCoursesLimit;
      config.instructorCoursesLimit = configurationInput.instructorCoursesLimit;
      config.isApproveInstructorAccounts =
        configurationInput.isApproveInstructorAccounts;
      config.isApproveStudentAccounts =
        configurationInput.isApproveStudentAccounts;
      config.isApproveEnrollments =
        configurationInput.isApproveEnrollments;
      config.isContentBlockedCourseEnd =
        configurationInput.isContentBlockedCourseEnd;
      config.studentFileSizeLimit = configurationInput.studentFileSizeLimit;
      config.instructorFileSizeLimit =
        configurationInput.instructorFileSizeLimit;
      config.isPasswordRequiredStartTest =
        configurationInput.isPasswordRequiredStartTest;
      config.voiceRecordTimeLimit = configurationInput.voiceRecordTimeLimit;
      config.isChatAllowedOutsideOfficehours =
        configurationInput.isChatAllowedOutsideOfficehours;
      config.blockedStudents = configurationInput.blockedStudents;
      config.blockedInstructors = configurationInput.blockedInstructors;
      config.isChatNotifications = configurationInput.isChatNotifications;
      config.isChatPushNotifications = configurationInput.isChatPushNotifications;

      config.isEnrollEmails = configurationInput.isEnrollEmails;
      config.isEnrollNotifications = configurationInput.isEnrollNotifications;
      config.isEnrollPushNotifications = configurationInput.isEnrollPushNotifications;
      config.isDropCourseEmails = configurationInput.isDropCourseEmails;
      config.isDropCourseNotifications =
        configurationInput.isDropCourseNotifications;
      config.isDropCoursePushNotifications =
        configurationInput.isDropCoursePushNotifications;

      config.isNewInstructorAccountEmails =
        configurationInput.isNewInstructorAccountEmails;
      config.isNewInstructorAccountNotifications =
        configurationInput.isNewInstructorAccountNotifications;
      config.isNewInstructorAccountPushNotifications =
        configurationInput.isNewInstructorAccountPushNotifications;
      config.isNewStudentAccountEmails =
        configurationInput.isNewStudentAccountEmails;
      config.isNewStudentAccountNotifications =
        configurationInput.isNewStudentAccountNotifications;
      config.isNewStudentAccountPushNotifications =
        configurationInput.isNewStudentAccountPushNotifications;

      // config.isAllowDeleteStudentAccount =
      //   configurationInput.isAllowDeleteStudentAccount;
      // config.isAllowDeleteInstructorAccount =
      //   configurationInput.isAllowDeleteInstructorAccount;

      config.isHideActiveStatus = configurationInput.isHideActiveStatus;
      config.isStayLoggedIn = configurationInput.isStayLoggedIn;

      config.isSendTestNotifications =
        configurationInput.isSendTestNotifications;
      config.isSendTestEmails = configurationInput.isSendTestEmails;
      config.isSendTestPushNotifications =
        configurationInput.isSendTestPushNotifications;
      config.isSendLessonNotifications =
        configurationInput.isSendLessonNotifications;
      config.isSendLessonEmails = configurationInput.isSendLessonEmails;
      config.isSendLessonPushNotifications =
        configurationInput.isSendLessonPushNotifications;
      config.isSendAssignmentNotifications =
        configurationInput.isSendAssignmentNotifications;
      config.isSendAssignmentEmails = configurationInput.isSendAssignmentEmails;
      config.isSendAssignmentPushNotifications =
        configurationInput.isSendAssignmentPushNotifications;
      config.isSendCourseNotifications =
        configurationInput.isSendCourseNotifications;
      config.isSendCourseEmails = configurationInput.isSendCourseEmails;
      config.isSendCoursePushNotifications =
        configurationInput.isSendCoursePushNotifications;
    }
    await config.save();

    let newTokenData;
    if (isStayLoggedInChanged) {
      const expirationTime = config.isStayLoggedIn ? process.env.LONG_SESSION_REFRESH_TIME_LIMIT : process.env.SESSION_EXPIRATION_TIME;
      const refreshTokenExpiration = Date.now() + parseInt(config.isStayLoggedIn ? process.env.LONG_SESSION_REFRESH_TIME_LIMIT : process.env.SESSION_REFRESH_TIME_LIMIT) * 1000;
      const token = createToken(userType, user._id, user.email, expirationTime);
      newTokenData = {
        token,
        expiresIn: expirationTime,
        refreshTokenExpiration,
      }
    }

    io.getIO().emit("updateConfig", {
      userType: "all",
    });
    return newTokenData;
  },
};
