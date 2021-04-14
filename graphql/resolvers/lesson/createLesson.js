const Lesson = require("../../../models/lesson");
const Course = require("../../../models/course");
const Instructor = require("../../../models/instructor");
const Notification = require("../../../models/notification");
const Configuration = require("../../../models/configuration");
const { validateLesson } = require("./validate");
const xss = require("xss");
const io = require("../../../socket");
const {textEditorWhitelist,noHtmlTags} = require("../validation/xssWhitelist");
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
    const instructorConfig = await Configuration.findOne({
        user: req.userId,
    });
    if (!instructorConfig) {
        const error = new Error("No configuration found!");
        error.code = 404;
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
    const errors = await validateLesson(lessonInput);
    if (errors.length > 0) {
        const error = new Error("Invalid input.");
        error.data = errors;
        error.code = 422;
        throw error;
    }
    const slides = lessonInput.slideContent.map((item, index) => {
        return {
            slideContent: xss(item, textEditorWhitelist),
            audio: xss((lessonInput.slideAudio || [])[index], textEditorWhitelist),
            video: xss((lessonInput.slideVideo || [])[index], textEditorWhitelist),
        };
    });

    const course = await Course.findById(lessonInput.course);
    if (!course) {
        const error = new Error("No course found");
        error.code = 401;
        throw error;
    }

    let content = ["newLesson"]
    const lessonReleaseDate = new Date(
        (lessonInput.availableOnDate || "").toString()
    ).getTime();
    const isLessonReleaseDate =
        Date.now() > lessonReleaseDate || !lessonReleaseDate;
    if (!isLessonReleaseDate && lessonReleaseDate)
        content = ["newLessonLaterDate"]


    const notification = new Notification({
        toUserType: "student",
        fromUser: req.userId,
        content,
        documentType: "lesson",
        documentId: lessonInput._id,
        course: lessonInput.course,
    });

    const lesson = new Lesson({
        _id: lessonInput._id,
        lessonName: xss(lessonInput.lessonName.trim(), noHtmlTags),
        published: lessonInput.published,
        availableOnDate: lessonInput.availableOnDate,
        lessonSlides: slides,
        course: lessonInput.course,
    });
    const createdLesson = await lesson.save();
    course.lessons.push(createdLesson._id);
    await course.save();
    if (instructorConfig.isSendLessonNotifications) await notification.save();
    const isSendEmails = instructorConfig.isSendLessonEmails;
    const isSendPushNotifications = instructorConfig.isSendLessonPushNotifications;

    const studentIdsEnrolled = course.studentsEnrollRequests.map((rq) => {
        if (rq.approved) {
            return rq.student;
        }
    });
    const isLessonAvailable = (new Date((createdLesson.availableOnDate || "").toString()).getTime() < Date.now()) || !createdLesson.availableOnDate;
    const docUrl = isLessonAvailable ? `student-panel/course/${lessonInput.course}/lesson/${createdLesson._id}/preview` : `student-panel/course/${lessonInput.course}/lessons`
    const notificationOptions = {
        multipleUsers: true,
        users: studentIdsEnrolled,
        content: 'newLessonSubject',
        course: course,
        lesson: createdLesson,
        url: docUrl,
        condition: 'isLessonPushNotifications',
    }
    if (lessonInput.published) {
        if (isSendEmails) {
            let content = "newLesson";
            let subject = "newLessonSubject";
            let date;
            if (!isLessonReleaseDate && lessonReleaseDate) {
                date = new Date(lessonInput.availableOnDate).getTime()
                content = "newLessonLaterDate";
            }

            await sendEmailsToStudents({
                studentIdsEnrolled,
                course,
                content,
                subject,
                date,
                lesson: createdLesson,
                condition: 'isLessonEmails',
                buttonText: !isLessonReleaseDate && lessonReleaseDate ? "" : 'viewLesson',
                buttonUrl: !isLessonReleaseDate && lessonReleaseDate ? "" : docUrl,
            });

        }
        if (isSendPushNotifications) {
            await pushNotify(notificationOptions)
        }
    }


    io.getIO().emit("updateCourses", {
        userType: "student",
    });
    return { ...createdLesson._doc, _id: createdLesson._id.toString() };
}