const Lesson = require("../../../models/lesson");
const Category = require("../../../models/category");
const Course = require("../../../models/course");
const Instructor = require("../../../models/instructor");
const Notification = require("../../../models/notification");
const Configuration = require("../../../models/configuration");

const { validateLesson } = require("./validate");
const xss = require("xss");
const io = require("../../../socket");
const {
  textEditorWhitelist,
  noHtmlTags,
} = require("../validation/xssWhitelist");
const { updateUrls } = require("../../../util/getUpdatedUrls");
const { emptyS3Directory, getObjectUrl } = require("../../../s3");
const moment = require("moment");
const { sendEmailsToStudents } = require("../../../util/email-students");

module.exports = {
  createLesson: async function ({ lessonInput }, req) {
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
    await notification.save();
    const isSendEmails = instructorConfig.isSendLessonEmails;
    if (isSendEmails) {
      let content = "newLesson";
      let subject = "newLessonSubject";
      let date;
      if(!isLessonReleaseDate && lessonReleaseDate){
        date = new Date(lessonInput.availableOnDate).getTime()
        content = "newLessonLaterDate";
      }
      const studentIdsEnrolled = course.studentsEnrollRequests.map((rq) => {
        if (rq.approved) {
          return rq.student;
        }
      });
      await sendEmailsToStudents({
        studentIdsEnrolled,
        course,
        content,
        subject,
        date,
        lesson:createdLesson,
        condition:'isLessonEmails'
      });
    }

    io.getIO().emit("updateCourses", {
      userType: "student",
    });
    return { ...createdLesson._doc, _id: createdLesson._id.toString() };
  },

  updateLesson: async function ({ lessonInput }, req) {
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

    const isReleaseDateChanged = (lessonReleaseDate||'').toString() !== (oldDessonReleaseDate||'').toString();

    await Notification.findOneAndDelete({
      documentId: lesson._id,
      documentType: "lesson",
    });
    let content = ["lessonUpdated"]
    if (!isLessonReleaseDate && lessonReleaseDate && isReleaseDateChanged)
      content = ["lessonUpdatedDateChanged"]

    //case if published state did not changed
    if (!lesson.published) {
      content = ["newLesson"]
      if (!isLessonReleaseDate && lessonReleaseDate)
        content = ["newLessonLaterDate"]
    }

    let notification;
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

    lesson.lessonName = xss(lessonInput.lessonName.trim(), noHtmlTags);
    lesson.published = lessonInput.published;
    lesson.availableOnDate = lessonInput.availableOnDate;
    lesson.lessonSlides = slides;
    lesson.course = lessonInput.course;
    if (notification) await notification.save();
    const updatedLesson = await lesson.save();
    io.getIO().emit("updateCourses", {
      userType: "student",
    });

    const isSendEmails = instructorConfig.isSendLessonEmails;
    if (isSendEmails) {
      let content = "lessonUpdated";
      let subject = "lessonUpdatedSubject";
      let date;
      if(!isLessonReleaseDate && lessonReleaseDate){
        date = new Date(lessonInput.availableOnDate).getTime();
        content = "lessonUpdatedDateChanged";
      }
      const studentIdsEnrolled = course.studentsEnrollRequests.map((rq) => {
        if (rq.approved) {
          return rq.student;
        }
      });
      await sendEmailsToStudents({
        studentIdsEnrolled,
        course,
        content,
        subject,
        date,
        lesson,
        condition:'isLessonEmails'
      });
    }
    return {
      ...updatedLesson._doc,
      _id: updatedLesson._id.toString(),
    };
  },

  deleteLesson: async function ({ id }, req) {
    if (!req.instructorIsAuth) {
      const error = new Error("Not authenticated!");
      error.code = 401;
      throw error;
    }
    const lesson = await Lesson.findById(id);
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
    const instructor = await Instructor.findById(req.userId);
    if (!instructor) {
      const error = new Error("No instructor found");
      error.code = 401;
      throw error;
    }
    if (course.courseInstructor.toString() !== req.userId.toString()) {
      const error = new Error("Not authorized!");
      error.code = 403;
      throw error;
    }
    //remove lesson from category model
    const categories = await Category.findOne({ course: lesson.course });
    if (categories) {
      categories.modules.forEach((module) => {
        module.lessons.pull(id);
        module.subjects.forEach((subject) => {
          subject.lessons.pull(id);
          subject.topics.forEach((topic) => {
            topic.lessons.pull(id);
          });
        });
      });
      await categories.save();
    }

    course.lessons.pull(id);
    course.save();
    await lesson.remove();
    const lessonDirectory = `courses/${lesson.course}/lessons/${id}`;
    await Notification.deleteMany({ documentId: id });
    await emptyS3Directory(lessonDirectory);
    io.getIO().emit("updateCourses", {
      userType: "student",
      action:'deleteLesson',
      lessonId:id,
    });
    return true;
  },

  lesson: async function ({ id }, req) {
    if (!req.instructorIsAuth && !req.studentIsAuth) {
      const error = new Error("Not authenticated!");
      error.code = 401;
      throw error;
    }
    const lesson = await Lesson.findById(id);
    const course = await Course.findById(lesson.course);
    if (!lesson) {
      const error = new Error("No lesson found");
      error.code = 401;
      throw error;
    }
    if (!course) {
      const error = new Error("No course found");
      error.code = 401;
      throw error;
    }
    if (course.courseInstructor.toString() !== req.userId.toString()) {
      const error = new Error("Not authorized!");
      error.code = 403;
      throw error;
    }
    //check if user id matches found instructor id on course
    return {
      ...lesson._doc,
      _id: lesson._id.toString(),
      lessonSlides: await Promise.all(
        lesson.lessonSlides.map(async (slide) => {
          const fixedContent = await updateUrls(slide.slideContent);
          return {
            ...slide._doc,
            slideContent: fixedContent,
            audio: await getObjectUrl(slide.audio),
            video: await getObjectUrl(slide.video),
          };
        })
      ),
    };
  },

  markSlideAsSeen: async function ({ lessonId, slideNumber }, req) {
    console.log("params: ", lessonId, slideNumber);
    if (!req.studentIsAuth) {
      const error = new Error("Not authenticated!");
      error.code = 401;
      throw error;
    }
    const lesson = await Lesson.findById(lessonId);
    if (!lesson) {
      const error = new Error("No lesson found");
      error.code = 401;
      throw error;
    }
    if (
      !((lesson.lessonSlides[slideNumber] || {}).studentsSeen || []).includes(
        req.userId.toString()
      )
    ) {
      lesson.lessonSlides[slideNumber].studentsSeen.push(req.userId);
      await lesson.save();
    }
    return true;
  },
};
