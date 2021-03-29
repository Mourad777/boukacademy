const Course = require("../models/course");
const Student = require("../models/student");
const Instructor = require("../models/instructor");
const Test = require("../models/test");
const Question = require("../models/question");
const Result = require("../models/result");
const Lesson = require("../models/lesson");
const Message = require("../models/message");
const { getKeysFromString } = require("./extractURL");
const { getQuestionsUrls } = require("../graphql/resolvers/test/util/getQuestionsUrls");
const { getTestUrls } = require("../graphql/resolvers/question/util/getTestUrls");

const getCourseKeys = async () => {
    const courseKeys = [];
    const courses = await Course.find();

    courses.forEach(crs => {
        if (crs.syllabus) {
            const syllabusKeys = getKeysFromString(crs.syllabus) || [];
            syllabusKeys.forEach(image => courseKeys.push(image));
        }
        if (crs.courseImage) {
            courseKeys.push(crs.courseImage);
        }

    })
    return courseKeys;
}

const getStudentKeys = async () => {
    const studentKeys = [];
    const students = await Student.find();

    students.forEach(st => {
        if (st.profilePicture) {
            studentKeys.push(st.profilePicture);
        }
        st.documents.forEach(doc => {
            if (doc.document) {
                studentKeys.push(doc.document)
            }
        })
    })
    return studentKeys;
}

const getInstructorKeys = async () => {
    const instructorKeys = [];
    const instructors = await Instructor.find();

    instructors.forEach(inst => {
        if (inst.profilePicture) {
            instructorKeys.push(inst.profilePicture);
        }
        inst.documents.forEach(doc => {
            if (doc.document) {
                instructorKeys.push(doc.document)
            }
        })
    });
    return instructorKeys;
}

const getTestKeys = async () => {
    const tests = await Test.find();
    const testQuestionKeys = getTestUrls(tests);
    const testMaterialKeys = [];
    tests.forEach(t => {
        t.readingMaterials.forEach(rm => {
            if (rm.fileUpload && rm.content) {
                testMaterialKeys.push(rm.content)
            } else {
                if (rm.content) {
                    const readingMaterialKeys = getKeysFromString(rm.content) || [];
                    readingMaterialKeys.forEach(image => testMaterialKeys.push(image))
                }
            }
        });
        t.audioMaterials.forEach(am => {
            if (am.audio) {
                testMaterialKeys.push(am.audio)
            }
        });
        t.videoMaterials.forEach(vm => {
            if (vm.video) {
                testMaterialKeys.push(vm.video)
            }
        });
    });
    const testKeys = [...testQuestionKeys, ...testMaterialKeys];
    return testKeys;
}

const getQuestionKeys = async () => {
    const questions = await Question.find();
    const questionKeys = getQuestionsUrls(questions)
    return questionKeys;
}

const getResultKeys = async () => {
    const resultKeys = [];
    const results = await Result.find();
    results.forEach(rlt => {
        rlt.essaySection.answers.forEach(ans => {
            const instructorCorrectionKeys = getKeysFromString(ans.instructorCorrection) || [];
            instructorCorrectionKeys.forEach(image => {
                if (image) {
                    resultKeys.push(image)
                }
            });
        });

        rlt.speakingSection.answers.forEach(ans => {
            if (ans.feedbackAudio) {
                resultKeys.push(ans.feedbackAudio);

            }
            if (ans.answer) {
                resultKeys.push(ans.answer);
            }
        });
    });
    return resultKeys;
}

const getLessonKeys = async () => {
    const lessonKeys = [];
    const lessons = await Lesson.find();

    lessons.forEach(l => {
        l.lessonSlides.forEach(sl => {
            const lessonContentKeys = getKeysFromString(sl.slideContent) || [];
            lessonContentKeys.forEach(image => {
                if (image) {
                    lessonKeys.push(image)
                }
            });
            if (sl.audio) {
                lessonKeys.push(sl.audio);
            }
            if (sl.video) {
                lessonKeys.push(sl.video);
            }

        })
    })
    return lessonKeys;
}

const getMessageKeys = async () => {
    const messageKeys = [];
    const messages = await Message.find();
    messages.forEach(m => {
        if (m.file) {
            messageKeys.push(m.file)
        }
    });
    return messageKeys;
}

const getAllKeys = async () => {
    const allKeys = [
        ...await getCourseKeys(),
        ...await getInstructorKeys(),
        ...await getStudentKeys(),
        ...await getTestKeys(),
        ...await getQuestionKeys(),
        ...await getResultKeys(),
        ...await getLessonKeys(),
        ...await getMessageKeys(),
    ];
    return allKeys;
}

exports.getAllKeys = getAllKeys;