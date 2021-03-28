const Course = require("../../../models/course");
const Student = require("../../../models/student");
const Instructor = require("../../../models/instructor");
const Category = require("../../../models/category");
const Test = require("../../../models/test");
const Question = require("../../../models/question");
const Result = require("../../../models/result");
const Lesson = require("../../../models/lesson");
const Notification = require("../../../models/notification");
const Configuration = require("../../../models/configuration");
const io = require("../../../socket");
const {
  validateCourse,
  validateFinalGrade,
  validateUpdateCourseResources,
} = require("./validate");
const xss = require("xss");
const { getObjectUrl, emptyS3Directory } = require("../../../s3");
const {
  textEditorWhitelist,
  noHtmlTags,
} = require("../validation/xssWhitelist");
const { updateUrls } = require("../../../util/getUpdatedUrls");
const { updateTestUrls } = require("../../../util/updateTestUrls");
const { clearHash } = require("../../../util/cache");
const lodash = require("lodash");
const { sendEmailsToStudents } = require("../../../util/email-students");
const { sendEmailToOneUser } = require("../../../util/email-user");
const { pushNotify } = require("../../../util/pushNotification")
//notification.save()
module.exports = {
  createCourse: async function ({ courseInput }, req) {
    if (!req.instructorIsAuth) {
      const error = new Error("Not authenticated!");
      error.code = 401;
      throw error;
    }
    const errors = await validateCourse(courseInput, req);
    if (errors.length > 0) {
      const error = new Error("Invalid input.");
      error.data = errors;
      error.code = 422;
      throw error;
    }

    const instructor = await Instructor.findById(req.userId);
    // .cache({
    //   key: courseInput.courseId,
    // });
    if (!instructor) {
      const error = new Error("No instructor found");
      error.code = 401;
      throw error;
    }
    const admin = await Instructor.findOne({ admin: true }).populate(
      "configuration"
    );
    const adminSettings = admin._doc.configuration;
    const isCoursesLimit = adminSettings.isInstructorCoursesLimit;
    const coursesLimit = adminSettings.instructorCoursesLimit;
    const numberOfInstructorCourses = await Course.countDocuments({
      courseInstructor: req.userId,
    });
    if (numberOfInstructorCourses >= coursesLimit && isCoursesLimit) {
      const error = new Error("Limit of number of courses reached");
      error.code = 403;
      throw error;
    }
    //get admin config
    //check if limit of courses reached

    let language;
    if (courseInput.language) {
      language =
        courseInput.language[0].toUpperCase() + courseInput.language.slice(1);
    }

    const course = new Course({
      _id: courseInput.courseId,
      courseName: xss(courseInput.courseName, noHtmlTags),
      studentCapacity: courseInput.studentCapacity,
      language: xss(language, noHtmlTags),
      courseInstructor: instructor,
      courseActive: courseInput.courseActive,
      enrollmentStartDate: courseInput.enrollmentStartDate,
      enrollmentEndDate: courseInput.enrollmentEndDate,
      courseStartDate: courseInput.courseStartDate,
      courseEndDate: courseInput.courseEndDate,
      courseDropDeadline: courseInput.courseDropDeadline,
      syllabus: courseInput.syllabus,
      prerequisites: courseInput.prerequisites,
      courseImage: courseInput.courseImage,
      regularOfficeHours: courseInput.regularOfficeHours,
      irregularOfficeHours: courseInput.irregularOfficeHours,
    });
    const createdCourse = await course.save();
    instructor.coursesTeaching.push(createdCourse);
    await instructor.save();
    clearHash(course._id);
    // clearRedis(); //need to clear the entire redis db bc the course is related not just to the user(instructor)
    //but also to the students
    io.getIO().emit("updateCourses", {
      userType: "all",
    });
    return { ...createdCourse._doc, _id: createdCourse._id.toString() };
  },

  updateCourse: async function ({ courseInput }, req) {
    const errors = await validateCourse(courseInput, req);
    if (errors.length > 0) {
      const error = new Error("Invalid input.");
      error.data = errors;
      error.code = 422;
      throw error;
    }
    if (!req.instructorIsAuth) {
      const error = new Error("Not authenticated!");
      error.code = 401;
      throw error;
    }
    const course = await Course.findById(courseInput.courseId);
    if (!course) {
      const error = new Error("No course found!");
      error.code = 404;
      throw error;
    }
    if (course.courseInstructor.toString() !== req.userId.toString()) {
      const error = new Error("Not authorized!");
      error.code = 403;
      throw error;
    }
    const instructorConfig = await Configuration.findOne({
      user: course.courseInstructor,
    });
    if (!instructorConfig) {
      const error = new Error("No configuration found!");
      error.code = 404;
      throw error;
    }
    const isSendNotifications = instructorConfig.isSendCourseNotifications

    const studentIdsEnrolled = course.studentsEnrollRequests.map((rq) => {
      if (rq.approved) {
        return rq.student;
      }
    });

    const isSendEmails = instructorConfig.isSendCourseEmails;
    const isSendPushNotifications = instructorConfig.isSendCoursePushNotifications;
    console.log('instructorConfig',instructorConfig)
    const prevRegOfficeHours = course.regularOfficeHours.map((o) => {
      return { day: o.day, startTime: o.startTime, endTime: o.endTime };
    });
    const currRegOfficeHourse = courseInput.regularOfficeHours.map((o) => {
      return { day: o.day, startTime: o.startTime, endTime: o.endTime };
    });

    const prevIrregOfficeHours = course.irregularOfficeHours.map((o) => {
      return {
        date: new Date(o.date),
        startTime: o.startTime,
        endTime: o.endTime,
      };
    });

    const currIrregOfficeHours = courseInput.irregularOfficeHours.map((o) => {
      return {
        date: new Date(o.date),
        startTime: o.startTime,
        endTime: o.endTime,
      };
    });

    const prevDropDeadline = course.courseDropDeadline
      ? new Date(course.courseDropDeadline)
      : null;
    const currDropDeadline = courseInput.courseDropDeadline
      ? new Date(courseInput.courseDropDeadline)
      : null;

    let language;
    if (courseInput.language) {
      language =
        courseInput.language[0].toUpperCase() + courseInput.language.slice(1);
    }

    course.courseName = xss(courseInput.courseName, noHtmlTags);
    course.courseActive = courseInput.courseActive;
    course.studentCapacity = courseInput.studentCapacity;
    course.language = xss(language, noHtmlTags);
    course.enrollmentStartDate = courseInput.enrollmentStartDate;
    course.enrollmentEndDate = courseInput.enrollmentEndDate;
    course.courseStartDate = courseInput.courseStartDate;
    course.courseEndDate = courseInput.courseEndDate;
    course.courseDropDeadline = courseInput.courseDropDeadline;
    course.syllabus = xss(courseInput.syllabus, textEditorWhitelist);
    course.courseImage = xss(courseInput.courseImage, noHtmlTags);
    course.prerequisites = courseInput.prerequisites;
    course.regularOfficeHours = courseInput.regularOfficeHours;
    course.irregularOfficeHours = courseInput.irregularOfficeHours;

    const updatedCourse = await course.save();
    let courseDropDeadlineNotification;
    const admin = await Instructor.findOne({ admin: true }).populate(
      "configuration"
    );
    const adminSettings = admin._doc.configuration;
    const grade = adminSettings.dropCourseGrade
    const isDropCoursePenalty = adminSettings.isDropCoursePenalty
    const docUrl = `student-panel/courses/syllabus/${course._id}`
    const notificationOptions = {
      users: studentIdsEnrolled,
      multipleUsers: true,
      course: course,
      grade: grade,
      url: docUrl,
      condition: 'isCoursePushNotifications',
    }
    if (
      (prevDropDeadline || "").toString() !==
      (currDropDeadline || "").toString()
    ) {
      courseDropDeadlineNotification = new Notification({
        toUserType: "student",
        fromUser: req.userId,
        content: ["courseDropDeadline"],
        documentType: "courseDropDeadline",
        documentId: course._id,
        course: course._id,
      });
      //push notifications
      if (isSendPushNotifications) {
        console.log('-----------------------------------------------------------isSendPushNotifications1',isSendPushNotifications)
        await pushNotify({ ...notificationOptions, content: isDropCoursePenalty ? "courseDropDeadline" : "courseDropDeadlineChanged", })
      }
      if (isSendEmails) {
        const content = "courseDropDeadline";
        const subject = "courseDropDeadlineChanged";
        await sendEmailsToStudents({
          studentIdsEnrolled,
          course: updatedCourse,
          content: isDropCoursePenalty ? content : subject,
          subject,
          condition: 'isCourseEmails',
          buttonText: "courseDetails",
          buttonUrl: docUrl,
        });
      }
    }

    let officeHourNotification;
    if (
      //need to use map to remove the id property since it always changes when you update the course
      !lodash.isEqual(prevRegOfficeHours, currRegOfficeHourse) ||
      !lodash.isEqual(prevIrregOfficeHours, currIrregOfficeHours)
    ) {
      officeHourNotification = new Notification({
        toUserType: "student",
        fromUser: req.userId,
        content: ["officeHoursUpdated"],
        documentType: "courseOfficeHours",
        documentId: course._id,
        course: course._id,
      });
      if (isSendPushNotifications) {
        console.log('-----------------------------------------------------------isSendPushNotifications2',isSendPushNotifications)
        await pushNotify({ ...notificationOptions, content: "officeHoursUpdatedFor", })
      }
      if (isSendEmails) {
        const content = "officeHoursUpdatedFor";
        const subject = "officeHoursUpdated";
        await sendEmailsToStudents({
          studentIdsEnrolled,
          course: updatedCourse,
          content,
          subject,
          condition: 'isCourseEmails',
          buttonText: "courseDetails",
          buttonUrl: docUrl,
        });
      }
    }

    if (courseDropDeadlineNotification && isSendNotifications) {
      await Notification.findOneAndDelete({
        documentType: "courseDropDeadline",
        course: course._id,
      });
      courseDropDeadlineNotification.save();
    }
    if (officeHourNotification && isSendNotifications) {
      await Notification.findOneAndDelete({
        documentType: "courseOfficeHours",
        course: course._id,
      });
      officeHourNotification.save();
    }
    clearHash(course._id);
    // io.getIO().emit("updateCourses", {
    //   userType: "all",
    // });
    return {
      ...updatedCourse._doc,
      _id: updatedCourse._id.toString(),
    };
  },

  updateCourseResources: async function ({ resources, courseId }, req) {
    const course = await Course.findById(courseId);
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
    if (!req.instructorIsAuth) {
      const error = new Error("No instructor authenticated");
      error.code = 404;
      throw error;
    }

    const errors = await validateUpdateCourseResources(resources);
    if (errors.length > 0) {
      const error = new Error("Invalid input.");
      error.data = errors;
      error.code = 422;
      throw error;
    }

    course.resources = resources;

    const updatedCourse = await course.save();
    // io.getIO().emit("updateStudents", {
    //   userType: "all",
    // });
    return updatedCourse;
  },

  changeCourseState: async function ({ courseId }, req) {
    const course = await Course.findById(courseId);
    if (!course) {
      const error = new Error("No course found!");
      error.code = 404;
      throw error;
    }
    if (course.courseInstructor.toString() !== req.userId.toString()) {
      const error = new Error("Not authorized!");
      error.code = 403;
      throw error;
    }
    if (!req.instructorIsAuth) {
      const error = new Error("No instructor authenticated");
      error.code = 404;
      throw error;
    }

    const courseTests = await Test.find({ course: courseId });
    const courseTestIds = courseTests
      .filter((t) => !t.assignment)
      .map((t) => t._id);
    const results = await Result.find({ test: { $in: courseTestIds } });
    const openResults = (results || []).filter((r) => !r.closed);
    const openResultsIds = (openResults || []).map((r) => r._id);
    const studentsTakingTest = await Student.find({
      "testInSession.test": { $in: courseTestIds },
    });
    const filteredStudentsTakingTest = studentsTakingTest.filter((i) => i);

    //step 1 find all test ids that are in that course
    //step 2 find all students with a test in session that matches one of the test ids
    //step 3 if there is a match set the test in session to null
    await Student.updateMany(
      {
        "testInSession.test": { $in: courseTestIds },
      },
      { testInSession: null, $pullAll: { testResults: openResultsIds } }
    );

    //step 1 find all students who have a test in session before setting the test in session to null
    //step 2 find and delete all results that match the student and the test that they are taking
    //step 3 delete the results
    await Promise.all(
      filteredStudentsTakingTest.map(async (s) => {
        const result = await Result.findOne({
          test: s.testInSession.test,
          student: s._id,
        });
        const resultDirectory = `courses/${courseId}/tests/${s.testInSession.test}/results/${result._id}`;
        await emptyS3Directory(resultDirectory);
        await result.remove();
      })
    );

    course.courseActive = !course.courseActive;
    const updatedCourse = await course.save();
    clearHash(courseId);

    if (!course.courseActive) {
      io.getIO().emit("mainMenu", {
        userType: "student",
        courseId,
        action: "deactivateCourse",
        message: "The course has been de-activated",
      });
    }

    io.getIO().emit("updateCourses", {
      courseId,
      userType: "student",
      action: "exitCourse",
    });

    return {
      ...updatedCourse._doc,
      _id: updatedCourse._id.toString(),
    };
  },

  deleteCourse: async function ({ id }, req) {
    if (!req.instructorIsAuth && !req.adminIsAuth) {
      const error = new Error("Not authenticated!");
      error.code = 401;
      throw error;
    }
    const course = await Course.findById(id);
    // .cache({ key: id });
    if (!course) {
      const error = new Error("No course found!");
      error.code = 404;
      throw error;
    }

    if (course.courseInstructor.toString() !== req.userId.toString()) {
      const error = new Error("Not authorized!");
      error.code = 403;
      throw error;
    }

    const tests = await Test.find({ course: id });
    // .cache({ key: id });
    const instructor = await Instructor.findById(req.userId);
    const students = await Student.find();
    // .cache({ key: id });
    const results = await Result.find({ course: id });
    // .cache({
    //   key: id,
    // });

    if (!instructor) {
      const error = new Error("No course instructor found");
      error.code = 404;
      throw error;
    }

    const studentIds = students.map((s) => s._id);

    const resultsToPull = (results || []).map((item) => item._id) || [];
    const testIds = (tests || []).map((test) => test._id.toString());

    const assignmentSessionIdsToDelete = [];
    const testSessionIdsToDelete = [];

    (students || []).forEach((student) => {
      (student.assignmentsInSession || []).forEach((session) => {
        if ((testIds || []).includes(session.assignment.toString())) {
          assignmentSessionIdsToDelete.push({ _id: session._id });
        }
      });

      if (
        (testIds || [])
          .includes((student.testInSession || {}).test || "")
          .toString() &&
        (student.testInSession || {}).test
      ) {
        testSessionIdsToDelete.push({ test: student.testInSession.test });
      }
    });
    const areAssignmentsInSessionToDelete =
      assignmentSessionIdsToDelete.length > 0;
    const areTestsInSessionToDelete = testSessionIdsToDelete.length > 0;

    await Student.updateMany(
      { _id: { $in: studentIds } },
      {
        $unset: areTestsInSessionToDelete
          ? {
            testInSession: {
              // $or doesn't accept empty array, hense the condition
              $or: testSessionIdsToDelete,
            },
          }
          : {},
        $pull: areAssignmentsInSessionToDelete
          ? {
            assignmentsInSession: {
              $or: assignmentSessionIdsToDelete,
            },
            coursesEnrolled: id,
          }
          : {
            coursesEnrolled: id,
          },
        $pullAll: { testResults: resultsToPull },
      },
      { multi: true }
    );

    instructor.coursesTeaching.pull(id);
    await Category.findOneAndDelete({ course: id });
    await Lesson.deleteMany({ course: id });
    await Result.deleteMany({ course: id });
    await instructor.save();
    await Test.deleteMany({ course: id });
    await Question.deleteMany({ course: id });
    await Course.findByIdAndRemove(id);
    await Notification.deleteMany({ course: id });
    clearHash(id);

    io.getIO().emit("updateCourses", {
      userType: "all",
      action: "exitCourse",
      courseId: id,
      message: "The course was deleted",
    });


    const courseDirectory = `courses/${id}`;
    await emptyS3Directory(courseDirectory);
    return true;
  },

  courses: async function ({ }, req) {
    //enrolled
    const courses = await Course.find()
      .populate("courseInstructor")
      .populate("prerequisites")
      .populate("tests")
      .populate("lessons")
      .populate({
        path: "studentsEnrollRequests.student",
        model: "Student",
        populate: {
          path: "testResults",
          model: "Result",
        },
      });
    // .cache({ key: req.userId });
    const userId = req.userId;
    if (!req.studentIsAuth && !req.instructorIsAuth) {
      const error = new Error("No student or instructor logged in");
      error.code = 401;
      throw error;
    }
    const student = await Student.findById(userId);
    if (!student && req.studentIsAuth) {
      const error = new Error("No student found");
      error.code = 401;
      throw error;
    }
    const instructor = await Instructor.findById(userId);
    if (!instructor && req.instructorIsAuth) {
      const error = new Error("No instructor found");
      error.code = 401;
      throw error;
    }

    const fixedDocs = await Promise.all(
      courses.map(async (course) => {
        if (
          req.instructorIsAuth &&
          course.courseInstructor._id.toString() !== userId.toString()
        )
          return null;
        const fixedResources = await Promise.all(
          (course.resources || []).map(async (r) => {
            return {
              _id: r._id,
              resourceName: r.resourceName,
              resource: await getObjectUrl(r.resource),
            };
          })
        );
        let fixedTests = (course.tests || [])
          .filter((test) => test.published)
          .map(async (test) => {
            const fixedMcqs = (test.multipleChoiceQuestions || []).map(
              (mcq) => {
                //hide the answer explanation and correct answers
                return {
                  ...mcq._doc,
                  solution: "",
                  correctAnswers: [],
                  question: "",
                  answerOptions: [],
                };
              }
            );
            const fixedEssayQuestions = (test.essayQuestions || []).map(
              (essayQ) => {
                //hide the answer explanation
                return { ...essayQ._doc, question: "", solution: "" };
              }
            );
            const fixedSpeakingQuestions = (test.speakingQuestions || []).map(
              (speakingQ) => {
                //hide the audio answer
                return {
                  ...speakingQ._doc,
                  audio: "",
                  question: "",
                  questionAudio: "",
                };
              }
            );

            //hide the blank
            const fixedFillInBlanksQuestions = (
              (test.fillInBlanksQuestions || {}).blanks || []
            ).map((blank) => {
              let answerOptions = [];
              let numIncAns = 0;
              if (blank.selectableAnswer) {
                (blank.incorrectAnswers || []).forEach((answer) => {
                  if (answer !== "" || null) {
                    numIncAns += 1;
                  }
                });

                answerOptions = blank.incorrectAnswers;

                const insert = (arr, index, newItem) => [
                  ...arr.slice(0, index),
                  newItem,
                  ...arr.slice(index),
                ];
                const randomIndex = Math.floor(Math.random() * numIncAns);
                //merge the correct answer with the incorrect answers at a random index
                //into a new array - answerOptions
                //the random index is based on the number of incorrect answers
                answerOptions = insert(
                  answerOptions,
                  randomIndex,
                  blank.correctAnswer
                );
              }
              //hide incorrect and correct answers
              return {
                ...blank._doc,
                correctAnswer: "",
                answerOptions: [],
                incorrectAnswers: [],
                selectableAnswer: false,
                audio: "",
              };
            });
            const gradeReleaseDate = new Date(
              (test.gradeReleaseDate || "").toString()
            ).getTime();
            const isGradeReleaseDate =
              Date.now() > gradeReleaseDate || !gradeReleaseDate;
            const isClosedTestResult = await Result.findOne({
              student: req.userId,
              test: test._id,
              closed: true,
            });
            return {
              ...test._doc,
              classAverage: isGradeReleaseDate ? test.classAverage : null,
              multipleChoiceQuestions: fixedMcqs,
              essayQuestions: fixedEssayQuestions,
              speakingQuestions: fixedSpeakingQuestions,
              readingMaterials: [],
              audioMaterials: [],
              videoMaterials: [],
              fillInBlanksQuestions: {
                text: "",
                blanks: fixedFillInBlanksQuestions,
              },
              completed: isClosedTestResult ? true : false,
            };
          });
        const fixedLessons = await Promise.all(
          course.lessons
            .filter((lesson) => {
              //if lesson not puplished and student logged in, return null
              if (
                (lesson.published && req.studentIsAuth) ||
                req.instructorIsAuth
              )
                return lesson;
              return null;
            })
            .map(async (lesson) => {
              //if lesson puplished but not available right now and student logged in, hide slides
              if (
                req.studentIsAuth &&
                new Date((lesson.availableOnDate || "").toString()).getTime() >
                Date.now()
              ) {
                return {
                  ...lesson._doc,
                  lessonSlides: [],
                };
              }
              return {
                ...lesson._doc,
                lessonSlides: lesson.lessonSlides.map(async (slide) => {
                  let studentsSeen;
                  let individualStudentSeen;
                  if (req.instructorIsAuth) studentsSeen = slide.studentsSeen;
                  if (req.studentIsAuth) {
                    studentsSeen = [];
                    individualStudentSeen = (slide.studentsSeen || {}).includes(
                      req.userId.toString()
                    );
                  }
                  const fixedContent = await updateUrls(slide.slideContent);
                  const audio = await getObjectUrl(slide.audio);
                  const video = await getObjectUrl(slide.video);
                  return {
                    slideContent: fixedContent,
                    audio,
                    video,
                    studentsSeen,
                    seen: individualStudentSeen,
                  };
                }),
              };
            })
        );
        const fixedSyllabus = await updateUrls(course.syllabus);
        const tempCourseImageUrl = await getObjectUrl(course.courseImage);
        if (req.instructorIsAuth)
          fixedTests = course.tests.map(async (test) => {
            return await updateTestUrls(test);
          });
        //case for giving courses to instructors that created the course
        const studentsEnrollRequests = await Promise.all(
          course.studentsEnrollRequests.map(async (request) => {
            const urlProfilePicture = await getObjectUrl(
              request.student.profilePicture
            );
            const documents = await Promise.all(
              (request.student.documents || []).map(async (d) => {
                return {
                  documentType: d.documentType,
                  document: await getObjectUrl(d.document),
                };
              })
            );
            return {
              ...request._doc,
              student: {
                ...request.student._doc,
                profilePicture: urlProfilePicture,
                documents,
              },
            };
          })
        );
        const numberOfStudents = studentsEnrollRequests.filter(
          (r) => r.approved
        ).length;
        if (req.instructorIsAuth) {
          return {
            ...course._doc,
            _id: course._id.toString(),
            tests: fixedTests,
            resources: fixedResources,
            lessons: fixedLessons,
            syllabus: fixedSyllabus,
            courseImage: tempCourseImageUrl,
            studentsEnrollRequests,
            numberOfStudents,
          };
        }

        const courseResult =
          (course.studentGrades || []).find(
            (r) => r.student.toString() === userId.toString()
          ) || {};
        //case for giving courses to students not enrolled
        if (
          !(
            (course.studentsEnrollRequests || []).findIndex(
              (r) =>
                r.student._id.toString() === userId.toString() && r.approved
            ) > -1
          ) ||
          !course.courseActive
        ) {
          const isDroppedOut = !!((course.studentsEnrollRequests || []).find(er => er.student._id.toString() === req.userId.toString()) || {}).droppedOut
          return {
            ...course._doc,
            _id: course._id.toString(),
            tests: [],
            lessons: [],
            resources: [],
            studentGrades: [],
            studentsEnrollRequests: [],
            grade: courseResult.grade,
            passed: courseResult.passed,
            droppedOut: isDroppedOut,
            syllabus: fixedSyllabus,
            courseImage: tempCourseImageUrl,
            accessDenied:
              course.studentsEnrollRequests.findIndex(
                (r) =>
                  r.student._id.toString() === userId.toString() &&
                  r.denied &&
                  !r.resubmissionAllowed
              ) > -1,
            enrolled: false,
            enrollmentRequested:
              course.studentsEnrollRequests.findIndex(
                (r) =>
                  r.student._id.toString() === userId.toString() &&
                  !r.denied &&
                  !r.approved &&
                  !r.droppedOut
              ) > -1,
            completed: (student.completedCourses || []).includes(
              course._id.toString()
            ),
            numberOfStudents,
          };
        }
        //case for giving courses to students enrolled
        const totalNumberOfTests = course.tests.length;
        return {
          ...course._doc,
          _id: course._id.toString(),
          tests: fixedTests,
          courseInstructor: {
            ...course.courseInstructor._doc,
            profilePicture: await getObjectUrl(
              course.courseInstructor.profilePicture
            ),
          },
          totalIncludedTests: totalNumberOfTests,
          resources: fixedResources,
          studentGrades: [],
          studentsEnrollRequests: [],
          lessons: fixedLessons,
          syllabus: fixedSyllabus,
          courseImage: tempCourseImageUrl,
          grade: courseResult.grade,
          passed: courseResult.passed,
          enrolled: true,
          enrollmentRequested: false,

          completed: (student.completedCourses || []).includes(
            course._id.toString()
          ),
          numberOfStudents,
        };
      })
    );
    return fixedDocs.filter((item) => item);
  },

  course: async function ({ id }, req) {
    if (!req.instructorIsAuth) {
      const error = new Error("Not authenticated!");
      error.code = 403;
      throw error;
    }
    const instructor = await Instructor.findById(req.userId);
    // .cache({
    //   key: id,
    // });
    if (!instructor) {
      const error = new Error("No instructor found");
      error.code = 401;
      throw error;
    }
    if (
      !(instructor.coursesTeaching || []).includes(id.toString()) &&
      req.instructorIsAuth
    ) {
      const error = new Error("Not authorized!");
      error.code = 403;
      throw error;
    }
    const course = await Course.findById(id).populate("prerequisites");
    // .cache({ key: req.userId });
    if (!course) {
      const error = new Error("No course found");
      error.code = 401;
      throw error;
    }
    const tempCourseImageUrl = await getObjectUrl(course.courseImage);
    const fixedSyllabus = await updateUrls(course.syllabus);
    return {
      ...course._doc,
      courseImage: tempCourseImageUrl,
      syllabus: fixedSyllabus,
      _id: course._id.toString(),
    };
  },

  instructorCourses: async function ({ }, req) {
    if (!req.instructorIsAuth) {
      const error = new Error("Not authenticated!");
      error.code = 403;
      throw error;
    }
    const instructor = await Instructor.findById(req.userId)
      .populate({
        path: "coursesTeaching",
        model: "Course",
        populate: {
          path: "tests",
          model: "Test",
        },
      })
      .populate({
        path: "coursesTeaching",
        model: "Course",
        populate: {
          path: "prerequisites",
          model: "Course",
        },
      })
      .populate({
        path: "coursesTeaching",
        model: "Course",
        populate: {
          path: "lessons",
          model: "Lesson",
        },
      });
    // .cache({ key: req.userId });

    if (!instructor) {
      const error = new Error("No instructor found");
      error.code = 401;
      throw error;
    }

    const fixedDocs = await Promise.all(
      instructor.coursesTeaching.map(async (course) => {
        const tempCourseImageUrl = await getObjectUrl(course.courseImage);
        const fixedSyllabus = await updateUrls(course.syllabus);
        return {
          ...course._doc,
          _id: course._id.toString(),
          courseImage: tempCourseImageUrl,
          syllabus: fixedSyllabus,
          lessons: course.lessons.map(async (lesson) => {
            return {
              ...lesson._doc,
              lessonSlides: lesson.lessonSlides.map(async (slide) => {
                const fixedContent = await updateUrls(slide.slideContent);
                const audio = await getObjectUrl(slide.audio);
                const video = await getObjectUrl(slide.video);
                return { slideContent: fixedContent, audio, video };
              }),
            };
          }),
          tests: course.tests.map(async (test) => {
            return await updateTestUrls(test);
          }),
        };
      })
    );
    return fixedDocs;
  },

  enrollRequest: async function ({ studentId, courseId }, req) {
    const student = await Student.findById(studentId);
    const course = await Course.findById(courseId);
    if (!student) {
      const error = new Error("No student found");
      error.code = 401;
      throw error;
    }
    if (!course) {
      const error = new Error("No course found");
      error.code = 401;
      throw error;
    }
    if (studentId.toString() !== req.userId.toString()) {
      const error = new Error("Not authorized!");
      error.code = 403;
      throw error;
    }
    const previousRequest = course.studentsEnrollRequests.find(
      (r) => r.student.toString() === student._id.toString()
    );
    //check if the course was graded
    const isGrade = !!((course.studentGrades || []).find(sg => sg.student._id.toString() === studentId.toString()) || {}).grade
    if (isGrade) {
      const error = new Error("The course has already been graded!");
      error.code = 403;
      throw error;
    }
    //check to see if enrollment is allowed after course drop and
    //check to see if the course was dropped
    const admin = await Instructor.findOne({ admin: true }).populate(
      "configuration"
    );
    const adminSettings = admin._doc.configuration;
    const isEnrollmentAllowedAfterCourseDrop = adminSettings.isEnrollAllowedAfterDropCourse;
    const courseDropDeadline = new Date(
      (course.courseDropDeadline || "").toString()
    ).getTime();

    if (!isEnrollmentAllowedAfterCourseDrop && previousRequest.droppedOut) {
      const error = new Error("Re-enrollment after dropping the course has been disabled by the admin");
      error.code = 403;
      throw error;
    }
    //check to see if the request has already been sent
    if (
      course.studentsEnrollRequests.findIndex(
        (r) =>
          r.student.toString() === studentId.toString() &&
          !r.droppedOut &&
          !r.resubmissionAllowed
      ) > -1
    ) {
      const error = new Error(
        "You already sent a request to enroll in this course!"
      );
      error.code = 403;
      throw error;
    }

    //if there is a course drop deadline and deadline has not yet been passed allow enroll
    //if the deadline has been passed do not allow enrollment under any circumstance
    const courseDropDeadlinePassed = courseDropDeadline < Date.now()
    if (course.courseDropDeadline && courseDropDeadlinePassed && previousRequest.droppedOut) {
      const error = new Error(
        "Since the course drop deadline has passed you can no longer enroll"
      );
      error.code = 403;
      throw error;
    }


    // //check to see if the course was dropped
    // if (course.studentsDropped.includes(studentId.toString())) {
    //   const error = new Error(
    //     "You dropped the course and therefore cannot enroll again!"
    //   );
    //   error.code = 403;
    //   throw error;
    // }

    //check if prereqs were completed
    const incompletePrerequisite = (course.prerequisites || []).findIndex(
      (item) => {
        if (!student.completedCourses.includes(item.toString())) return item;
      }
    );

    if (incompletePrerequisite > -1) {
      const error = new Error("Did not complete all course prerequisites!");
      error.code = 403;
      throw error;
    }
    //check if date falls within the enrollment period
    const enrollmentStartDate = new Date(
      (course.enrollmentStartDate || "").toString()
    ).getTime();
    const enrollmentEndDate = new Date(
      (course.enrollmentEndDate || "").toString()
    ).getTime();
    if (Date.now() < enrollmentStartDate || Date.now() > enrollmentEndDate) {
      const error = new Error("Not within enrollment period");
      error.code = 403;
      throw error;
    }
    await Notification.findOneAndDelete({
      documentType: "courseEnrollRequest",
      fromUser: req.userId,
      course: courseId,
    });

    const notification = new Notification({
      toUserType: "unique",
      toSpecificUser: course.courseInstructor,
      fromUser: req.userId,
      content: ["courseEnrollRequest"],
      documentType: "courseEnrollRequest",
      documentId: courseId,
      course: courseId,
    });


    if (previousRequest)
      course.studentsEnrollRequests.pull(previousRequest._id);

    course.studentsEnrollRequests.push({
      student: student._id,
      approved: false,
      denied: false,
      droppedOut: false,
      resubmissionAllowed: false,
    });
    // student.coursesEnrolled.push(course);
    // await student.save();
    await course.save();
    await notification.save();
    const docUrl = `instructor-panel/course/${course._id}/students/requested/${student._id}`
    const notificationOptions = {
      multipleUsers: false,
      course: course,
      userId: course.courseInstructor,
      isInstructorRecieving: true,
      student,
      url: docUrl,
      condition: 'isEnrollPushNotifications',
    }
    await pushNotify({ ...notificationOptions, content: "courseEnrollRequest" })
    await sendEmailToOneUser({
      userId: course.courseInstructor,
      course,
      subject: 'courseEnrollRequestSubject',
      content: 'courseEnrollRequest',
      student,
      condition: 'isEnrollEmails',
      userType: 'instructor',
      buttonText: 'userDetails',
      buttonUrl: docUrl,
    });
    clearHash(course._id);
    io.getIO().emit("updateCourses", {
      userType: "instructor",
    });
    io.getIO().emit("updateStudents", {
      userType: "all",
      courseId: course._id,
    });
    return "student enrolled";
  },

  enrollApprove: async function ({ studentId, courseId }, req) {
    const student = await Student.findById(studentId);
    const instructor = await Instructor.findById(req.userId);
    const course = await Course.findById(courseId);
    const admin = await Instructor.findOne({ admin: true }).populate(
      "configuration"
    );
    const adminSettings = admin._doc.configuration;
    const isApproveEnrollments = adminSettings.isApproveEnrollments;

    if (!instructor && isApproveEnrollments) {
      const error = new Error("No instructor authenticated");
      error.code = 403;
      throw error;
    }
    const config = await Configuration.findOne({
      user: req.userId,
    });

    if (!config) {
      const error = new Error("No configuration found!");
      error.code = 404;
      throw error;
    }
    const isSendNotifications = config.isSendCourseNotifications
    const isSendEmails = config.isSendCourseEmails || !instructor
    const isSendPushNotifications = config.isSendCoursePushNotifications || !instructor

    if (!student) {
      const error = new Error("No student found");
      error.code = 401;
      throw error;
    }
    if (!course) {
      const error = new Error("No course found");
      error.code = 401;
      throw error;
    }
    //check to see if student is already enrolled ._id
    if (
      student.coursesEnrolled.includes(
        course._id.toString() ||
        course.studentsEnrollRequests.findIndex(
          (r) => r.student._id.toString() === studentId.toString()
        ) > -1
      )
    ) {
      const error = new Error("Student already enrolled");
      error.code = 403;
      throw error;
    }

    //check to see if student has been graded previously
    const gradeToReplace = course.studentGrades.find(
      (g) => g.student.toString() === studentId.toString()
    );
    if (gradeToReplace) {
      course.studentGrades.pull(gradeToReplace._id)
    }

    //check course capacity
    const numberOfStudentsEnrolled = (
      course.studentsEnrollRequests || []
    ).filter((r) => r.approved).length;
    const courseCapacity = course.studentCapacity;
    if (numberOfStudentsEnrolled >= courseCapacity && courseCapacity) {
      const error = new Error("The course is at maximum student capacity");
      error.code = 403;
      throw error;
    }

    await Notification.deleteMany({
      documentType: {
        $in: ["courseEnrollDeny", "courseEnrollApprove", "autoEnroll"],
      },
      fromUser: req.userId,
      course: courseId,
    });

    const notification = new Notification({
      toUserType: instructor ? "unique" : 'instructor',
      fromUser: req.userId,
      toSpecificUser: instructor ? studentId : course.courseInstructor,
      content: instructor ? ["courseEnrollApprove"] : ['autoEnroll'],
      documentType: instructor ? "courseEnrollApprove" : "autoEnroll",
      documentId: courseId,
      course: courseId,
    });

    const requestToReplace = course.studentsEnrollRequests.find(
      (r) => r.student.toString() === student._id.toString()
    );
    if (requestToReplace)
      course.studentsEnrollRequests.pull(requestToReplace._id);
    course.studentsEnrollRequests.push({
      student: student._id,
      approved: true,
      denied: false,
      droppedOut: false,
      resubmissionAllowed: false,
    });

    // course.studentsDropped.pull(student);
    // course.studentsEnrollDenied.pull(student);
    // course.studentsEnrolled.push(student);
    student.coursesEnrolled.push(course);
    await student.save();
    await course.save();
    if (isSendNotifications || !instructor) await notification.save();
    let userId;
    if (!!instructor) userId = student._id
    if (!instructor) userId = course.courseInstructor

    const docUrl = !!instructor ? `student-panel/course/${course._id}/modules` : `instructor-panel/course/${course._id}/students/enrolled/${studentId}`;
    const notificationOptions = {
      multipleUsers: false,
      content: !!instructor ? "courseEnrollApprove" : 'autoEnroll',
      course: course,
      userId,
      student,
      instructor,
      isStudentRecieving: !!instructor,
      isInstructorRecieving: !instructor,
      url: docUrl,
      condition: !!instructor ? 'isCoursePushNotifications' : "isEnrollPushNotifications",
    }
    if (isSendPushNotifications) {
      await pushNotify(notificationOptions)
    }
    if (isSendEmails) {
      await sendEmailToOneUser({
        userId: !!instructor ? studentId : course.courseInstructor,
        course,
        subject: !!instructor ? "courseEnrollApproveSubject" : 'autoEnrollSubject',
        content: !!instructor ? "courseEnrollApprove" : 'autoEnroll',
        student,
        condition: !!instructor ? 'isCourseEmails' : "isEnrollEmails",
        userType: !!instructor ? 'student' : 'instructor',
        buttonUrl: docUrl,
        buttonText: !!instructor ? 'yourAccount' : 'userDetails'
      });
    }
    clearHash(course._id);
    io.getIO().emit("updateCourses", {
      userType: "student",
      userId: studentId,
    });
    io.getIO().emit("updateStudents", {
      userType: "all",
      courseId: course._id,
    });
    return !!instructor ? "student request approved" : "Enroll success";
  },

  enrollDeny: async function (
    { studentId, courseId, reason, allowResubmission },
    req
  ) {
    const student = await Student.findById(studentId);

    const instructor = await Instructor.findById(req.userId);
    const course = await Course.findById(courseId);
    if (!instructor) {
      const error = new Error("No instructor authenticated");
      error.code = 401;
      throw error;
    }
    if (!student) {
      const error = new Error("No student found");
      error.code = 401;
      throw error;
    }
    if (!course) {
      const error = new Error("No course found");
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
    const isSendNotifications = instructorConfig.isSendCourseNotifications
    const isSendEmails = instructorConfig.isSendCourseEmails
    const isSendPushNotifications = instructorConfig.isSendCoursePushNotifications;
    await Notification.deleteMany({
      documentType: {
        $in: ["courseEnrollDeny", "courseEnrollApprove"],
      },
      fromUser: req.userId,
      course: courseId,
    });

    const content = ["courseEnrollDeny"];
    if (allowResubmission) {
      content.push("allowResubmission");
    }

    const requestToReplace = course.studentsEnrollRequests.find(
      (r) => r.student.toString() === student._id.toString()
    );
    if (requestToReplace)
      course.studentsEnrollRequests.pull(requestToReplace._id);

    course.studentsEnrollRequests.push({
      student: student._id,
      approved: false,
      denied: true,
      deniedReason: reason,
      droppedOut: false,
      resubmissionAllowed: allowResubmission,
    });

    student.coursesEnrolled.pull(courseId);
    const notification = new Notification({
      toUserType: "unique",
      fromUser: req.userId,
      toSpecificUser: student._id,
      content,
      documentType: "courseEnrollDeny",
      documentId: courseId,
      course: courseId,
      message: reason,
    });
    //step 1 check if student is taking a test
    if (student._doc.testInSession) {
      //step 2 find the testResult
      const result = await Result.findOne({
        student: student._id,
        test: student.testInSession.test,
      });
      if (result) {
        //step 3 pull the test result from student array
        student.testResults.pull(result._id);
        //step 4 delete test result
        await Result.findByIdAndDelete(result._id);
        //step 5 set test in session to null
        student.testInSession = null;
        //step 6 delete result file directory
        const resultDirectory = `courses/${courseId}/tests/${student.testInSession.test}/results/${result._id}`;
        await emptyS3Directory(resultDirectory);
      }
    }

    await course.save();
    await student.save();
    if (isSendNotifications) await notification.save();
    clearHash(course._id);
    const docUrl = 'student-panel/courses';
    const notificationOptions = {
      multipleUsers: false,
      content: 'courseEnrollDeny',
      course: course,
      userId: studentId,
      isStudentRecieving: true,
      url: docUrl,
      condition: 'isCoursePushNotifications',
    }
    if (isSendPushNotifications) {
      await pushNotify(notificationOptions)
    }
    if (isSendEmails) {
      await sendEmailToOneUser({
        userId: studentId,
        course,
        subject: 'courseEnrollDenySubject',
        content: 'courseEnrollDeny',
        student,
        condition: 'isCourseEmails',
        userType: 'student',
        buttonText: "yourAccount",
        buttonUrl: docUrl,
      });
    }

    io.getIO().emit("updateCourses", {
      userId: student._id,
      courseId: courseId,
      action: "exitCourse",
    });

    return "student request denied";
  },

  dropCourse: async function ({ studentId, courseId }, req) {
    const student = await Student.findById(studentId); //can't cache student with course key since a student can take multiple courses
    const course = await Course.findById(courseId);
    if (!student) {
      const error = new Error("No student found");
      error.code = 401;
      throw error;
    }
    if (!course) {
      const error = new Error("No course found");
      error.code = 401;
      throw error;
    }
    if (studentId.toString() !== req.userId.toString()) {
      const error = new Error("Not authorized!");
      error.code = 403;
      throw error;
    }
    // const courseDropDeadline = new Date(
    //   (course.courseDropDeadline || "").toString()
    // ).getTime();

    // const admin = await Instructor.findOne({ admin: true }).populate(
    //   "configuration"
    // );
    // const adminSettings = admin._doc.configuration;
    //check to see if course has already been graded, if so prevent drop
    const isGraded = !!(course.studentGrades.find(gr => gr.grade && gr.student.toString() === studentId.toString()));
    if (isGraded) {
      const error = new Error("You can't drop the course since it has been graded");
      error.code = 403;
      throw error;
    }
    // if ((Date.now() > courseDropDeadline) && adminSettings.isDropCoursePenalty) {
    //   course.studentGrades.push({
    //     student: studentId,
    //     passed: false,
    //     grade: adminSettings.dropCourseGrade,
    //     gradeOverride: false,
    //   });

    // }
    //check to see if not already dropped
    if (
      course.studentsEnrollRequests.findIndex(
        (r) => r.student.toString() === studentId.toString() && r.droppedOut
      ) > -1
    ) {
      const error = new Error("You have already dropped the course!");
      error.code = 403;
      throw error;
    }

    await Notification.findOneAndDelete({
      documentType: "courseDrop",
      fromUser: req.userId,
      course: courseId,
    });

    const notification = new Notification({
      toUserType: "instructor",
      fromUser: req.userId,
      content: ["courseDrop"],
      documentType: "courseDrop",
      documentId: courseId,
      course: courseId,
    });
    await notification.save();
    await Result.updateMany(
      { student: studentId },
      {
        $set: {
          closed: true,
        },
      }
    );

    const requestToReplace = course.studentsEnrollRequests.find(
      (r) => r.student.toString() === student._id.toString()
    );
    if (requestToReplace)
      course.studentsEnrollRequests.pull(requestToReplace._id);

    course.studentsEnrollRequests.push({
      student: student._id,
      approved: false,
      denied: false,
      droppedOut: true,
      resubmissionAllowed: false,
    });

    student.coursesEnrolled.pull(course);
    student.testInSession = null;
    student.assignmentsInSession = [];
    const studentWithNewCourse = await student.save();
    await course.save();
    clearHash(course._id);
    const docUrl = `instructor-panel/course/${course._id}/students/enrolled/${student._id}`;
    const notificationOptions = {
      multipleUsers: false,
      content: 'courseDrop',
      course: course,
      userId: course.courseInstructor,
      isInstructorRecieving: true,
      student,
      url: docUrl,
      condition: 'isDropCoursePushNotifications',
    }
    await pushNotify(notificationOptions)
    await sendEmailToOneUser({
      userId: course.courseInstructor,
      course,
      subject: 'courseDropSubject',
      content: 'courseDrop',
      student,
      condition: 'isDropCourseEmails',
      userType: 'instructor',
      buttonText: "userDetails",
      buttonUrl: docUrl,
    });
    io.getIO().emit("updateCourses", {
      userType: "all",
      courseId: course._id,
    });
    io.getIO().emit("updateStudents", {
      userType: "all",
      courseId: course._id,
    });
    return {
      ...studentWithNewCourse._doc,
      _id: studentWithNewCourse._id.toString(),
    };
  },

  gradeCourse: async function (
    {
      gradeCourseInput: {
        studentId,
        courseId,
        grade,
        gradeOverride,
        gradeAdjustmentExplanation,
        passed,
      },
    },
    req
  ) {
    const student = await Student.findById(studentId);
    const instructor = await Instructor.findById(req.userId);
    const course = await Course.findById(courseId);
    if (!instructor) {
      const error = new Error("No instructor authenticated");
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
    };
    const isSendNotifications = instructorConfig.isSendCourseNotifications;
    const isSendEmails = instructorConfig.isSendCourseEmails;
    const isSendPushNotifications = instructorConfig.isSendCoursePushNotifications;
    if (!student) {
      const error = new Error("No student found");
      error.code = 401;
      throw error;
    }
    if (!course) {
      const error = new Error("No course found");
      error.code = 401;
      throw error;
    }
    const admin = await Instructor.findOne({ admin: true }).populate(
      "configuration"
    );
    const adminSettings = admin._doc.configuration;
    const isCourseDropped = course.studentsEnrollRequests.find(er => {
      return !!(er.student._id.toString() === studentId.toString() && er.droppedOut)
    })

    //stop grading if the student dropped out and there is a drop deadline and the deadline has not yet passed
    const courseDropDeadline = new Date(
      (course.courseDropDeadline || "").toString()
    ).getTime();

    if ((isCourseDropped && !course.courseDropDeadline) || (isCourseDropped && course.courseDropDeadline && (courseDropDeadline > Date.now()))) {
      const error = new Error("Can't grade the course if their is no drop deadline or the deadline has not yet passed");
      error.code = 401;
      throw error;

    }

    const errors = await validateFinalGrade({
      grade,
      gradeOverride,
      dropCourseGrade: adminSettings.dropCourseGrade,
      isDropCoursePenalty: adminSettings.isDropCoursePenalty
    }, req);
    if (errors.length > 0) {
      const error = new Error("Invalid input.");
      error.data = errors;
      error.code = 422;
      throw error;
    }
    //check to see if the course is dropped, if so prevent grading

    await Notification.findOneAndDelete({
      documentId: courseId,
      toSpecificUser: studentId,
      documentType: "courseGrade",
    });

    const gradeToReplace = course.studentGrades.find(
      (g) => g.student.toString() === student._id.toString()
    );
    const notificationContent = [];
    if (gradeToReplace) {
      course.studentGrades.pull(gradeToReplace._id);
      // notificationContent = `The instructor adjusted your grade for ${course.courseName}. You ${passed ? 'passed' : 'failed'} with a grade of ${grade}%.`
      notificationContent.push("adjustGradeCourse");
    } else {
      // notificationContent = `You ${passed ? "passed" : "failed"} ${
      //   course.courseName
      // } with a grade of ${grade}%.`;
      notificationContent.push("gradeCourse");
    }
    course.studentGrades.push({
      student: studentId,
      passed,
      grade,
      gradeOverride,
      gradeAdjustmentExplanation: xss(gradeAdjustmentExplanation, noHtmlTags),
    });
    if (passed && !student.completedCourses.includes(courseId.toString())) {
      student.completedCourses.push(courseId);
    }
    if (!passed && student.completedCourses.includes(courseId.toString())) {
      student.completedCourses.pull(courseId);
    }
    const notification = new Notification({
      toUserType: "unique",
      fromUser: req.userId,
      toSpecificUser: studentId,
      content: notificationContent,
      documentType: "courseGrade",
      documentId: courseId,
      course: courseId,
    });
    await student.save();
    await course.save();
    if (isSendNotifications) await notification.save();
    const notificationOptions = {
      multipleUsers: false,
      content: notificationContent[0],
      course: course,
      userId: studentId,
      isStudentRecieving: true,
      student,
      passed,
      grade,
      url: 'transcript',
      condition: 'isCoursePushNotifications',
    }
    if (isSendPushNotifications) {
      await pushNotify(notificationOptions)
    }
    if (isSendEmails) {
      await sendEmailToOneUser({
        userId: studentId,
        course,
        subject: `${notificationContent[0]}Subject`,
        content: notificationContent[0],
        student,
        condition: 'isCourseEmails',
        userType: 'student',
        grade,
        passed,
        buttonText: 'transcript',
        buttonUrl: 'transcript'
      });
    }
    clearHash(course._id);
    io.getIO().emit("updateCourses", {
      userType: "student",
      userId: studentId,
    });
    io.getIO().emit("updateStudents", {
      userType: "all",
      courseId: course._id,
    });
    return true;
  },
};
