const Course = require("../../../models/course");
const Student = require("../../../models/student");
const Instructor = require("../../../models/instructor");
const Result = require("../../../models/result");
const { getObjectUrl } = require("../../../s3");
const { updateUrls } = require("../../../util/getUpdatedUrls");
const { updateTestUrls } = require("../../../util/updateTestUrls");
const { updateResultUrls } = require("../../../util/updateResultUrls");

module.exports = async function ({ }, req) {
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
                    const fixedTestResults = await Promise.all((request.student.testResults || []).map(
                        async (result) => await updateResultUrls(result)
                    ));

                    return {
                        ...request._doc,
                        student: {
                            ...request.student._doc,
                            profilePicture: urlProfilePicture,
                            documents,
                            testResults: fixedTestResults,
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
                    couponCode: "",
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
                couponCode: "",
                completed: (student.completedCourses || []).includes(
                    course._id.toString()
                ),
                numberOfStudents,
            };
        })
    );
    return fixedDocs.filter((item) => item);
}