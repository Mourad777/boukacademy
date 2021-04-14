const Lesson = require("../../../models/lesson");
const Course = require("../../../models/course");
const Instructor = require("../../../models/instructor");
const Notification = require("../../../models/notification");
const Configuration = require("../../../models/configuration");
const { validateLesson } = require("./validate");
const xss = require("xss");
const io = require("../../../socket");
const {noHtmlTags} = require("../validation/xssWhitelist");
const moment = require("moment");
const { sendEmailsToStudents } = require("../../../util/email-students");
const { pushNotify } = require("../../../util/pushNotification");

module.exports = async function ({ lessonInput }, req) {
    if (!req.instructorIsAuth) {
        const error = new Error("Not authenticated!");
        error.code = 401;
        throw error;
    }
    const instructor = await Instructor.findById(req.userId);
    if (!instructor) {
        const error = new Error("No instructor found");
        error.code = 401;
        throw error;
    }
    if (
        !(instructor.coursesTeaching || []).includes(
            lessonInput.course.toString()
        )
    ) {
        const error = new Error("Not authorized!");
        error.code = 403;
        throw error;
    }
    const instructorConfig = await Configuration.findOne({
        user: req.userId,
    });
    if (!instructorConfig) {
        const error = new Error("No configuration found!");
        error.code = 404;
        throw error;
    }
    const errors = await validateLesson(lessonInput);
    if (errors.length > 0) {
        const error = new Error("Invalid input.");
        error.data = errors;
        error.code = 422;
        throw error;
    }
    const lesson = await Lesson.findById(lessonInput._id);
    if (!lesson) {
        const error = new Error("No lesson found");
        error.code = 401;
        throw error;
    }
    const course = await Course.findById(lesson.course);
    if (!course) {
        const error = new Error("No course found");
        error.code = 401;
        throw error;
    }

    const slides = lessonInput.slideContent.map((item, index) => {
        //removing the possibility of having a null value for comparison purposes
        const newAudio =
            (lessonInput.slideAudio || {})[index] === null
                ? ""
                : (lessonInput.slideAudio || {})[index] || "";
        const newVideo =
            (lessonInput.slideVideo || {})[index] === null
                ? ""
                : (lessonInput.slideVideo || {})[index] || "";
        const newContent = item === null ? "" : item || "";
        const oldSlides = lesson.lessonSlides;

        const oldAudio =
            (oldSlides[index] || {}).audio === null
                ? ""
                : (oldSlides[index] || {}).audio || "";
        const oldVideo =
            (oldSlides[index] || {}).video === null
                ? ""
                : (oldSlides[index] || {}).video || "";
        const oldContent =
            (oldSlides[index] || {}).slideContent === null
                ? ""
                : (oldSlides[index] || {}).slideContent || "";
        //compare old slides and new slides to see if anything changed
        //if changed reset lesson progress for all students
        const isSameAudio = oldAudio.toString() === newAudio.toString();
        const isSameVideo = oldVideo.toString() === newVideo.toString();
        const isSameContent = oldContent.toString() === newContent.toString();

        return {
            slideContent: newContent,
            audio: newAudio,
            video: newVideo,
            studentsSeen:
                isSameAudio && isSameVideo && isSameContent
                    ? lesson.lessonSlides[index].studentsSeen
                    : [],
        };
    });
    const lessonReleaseDate = new Date(
        (lessonInput.availableOnDate || "").toString()
    ).getTime();
    const oldDessonReleaseDate = new Date(
        (lesson.availableOnDate || "").toString()
    ).getTime();
    const isLessonReleaseDate =
        Date.now() > lessonReleaseDate || !lessonReleaseDate;
    const readableLessonReleaseDate = moment(
        parseInt(lessonReleaseDate)
    ).format("dddd, MMMM Do YYYY, HH:mm");

    const isReleaseDateChanged = (lessonReleaseDate || '').toString() !== (oldDessonReleaseDate || '').toString();

    let content = ["lessonUpdated"]
    if (!isLessonReleaseDate && lessonReleaseDate && isReleaseDateChanged)
        content = ["lessonUpdatedDateChanged"]

    //case if published state did not changed
    if (!lesson.published) {
        content = ["newLesson"]
        if (!isLessonReleaseDate && lessonReleaseDate)
            content = ["newLessonLaterDate"]
    }

    if (instructorConfig.isSendLessonNotifications) {
        let notification;
        await Notification.findOneAndDelete({
            documentId: lesson._id,
            documentType: "lesson",
        });

        if (lessonInput.published) {
            notification = new Notification({
                toUserType: "student",
                course: lessonInput.course,
                content,
                documentType: "lesson",
                documentId: lesson._id,
                fromUser: req.userId,
            });
        } else {
            await Notification.findOneAndDelete({
                documentId: lesson._id,
                documentType: "lesson",
            });
        }
        if (notification) await notification.save();

    }

    const studentIdsEnrolled = course.studentsEnrollRequests.map((rq) => {
        if (rq.approved) {
            return rq.student;
        }
    });
    const isLessonAvailable = (new Date((lessonInput.availableOnDate || "").toString()).getTime() < Date.now()) || !lessonInput.availableOnDate
    const docUrl = isLessonAvailable ? `student-panel/course/${lesson.course}/lesson/${lesson._id}/preview` : `student-panel/course/${lesson.course}/lessons`;
    const notificationOptions = {
        multipleUsers: true,
        users: studentIdsEnrolled,
        content: !lesson.published ? 'newLessonSubject' : 'lessonUpdatedSubject',
        course: course,
        lesson,
        url: docUrl,
        condition: 'isLessonPushNotifications',
    }
    const isSendPushNotifications = instructorConfig.isSendLessonPushNotifications;
    if (lessonInput.published && isSendPushNotifications) {
        await pushNotify(notificationOptions)
    }

    const isSendEmails = instructorConfig.isSendLessonEmails;

    if (isSendEmails && lessonInput.published) {
        let content = "lessonUpdated";
        let subject = "lessonUpdatedSubject";

        let date;
        if (!isLessonReleaseDate && lessonReleaseDate) {
            date = new Date(lessonInput.availableOnDate).getTime();
            content = "lessonUpdatedDateChanged";
        }
        if (!lesson.published) {
            content = "newLesson"
            subject = "newLessonSubject"
            if (!isLessonReleaseDate && lessonReleaseDate)
                content = "newLessonLaterDate"
        }

        await sendEmailsToStudents({
            studentIdsEnrolled,
            course,
            content,
            subject,
            date,
            lesson,
            condition: 'isLessonEmails',
            buttonText: !isLessonReleaseDate && lessonReleaseDate ? "" : 'viewLesson',
            buttonUrl: !isLessonReleaseDate && lessonReleaseDate ? "" : docUrl,
        });

    }

    lesson.lessonName = xss(lessonInput.lessonName.trim(), noHtmlTags);
    lesson.published = lessonInput.published;
    lesson.availableOnDate = lessonInput.availableOnDate;
    lesson.lessonSlides = slides;
    lesson.course = lessonInput.course;
    const updatedLesson = await lesson.save();
    io.getIO().emit("updateCourses", {
        userType: "student",
    });

    return {
        ...updatedLesson._doc,
        _id: updatedLesson._id.toString(),
    };
}