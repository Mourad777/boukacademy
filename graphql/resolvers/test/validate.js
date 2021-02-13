const validator = require("validator");
const moment = require("moment");
const Test = require("../../../models/test");
const Course = require("../../../models/course");
const { checkDuplicates } = require("../../../util/checkDuplicates");

const validateTest = async (
  testInput,
  multipleChoiceQuestionsInput,
  essayQuestionsInput,
  speakingQuestionsInput,
  fillBlankQuestionsInput,
  req
) => {
  const errors = [];
  const courseTests = await Test.find({ course: testInput.course });
  const filteredTests = (courseTests || []).filter((test) => !test.assignment);
  const filteredAssignments = (courseTests || []).filter(
    (test) => test.assignment
  );

  if (!validator.isLength(testInput.testName, { min: 1 }) || !testInput.testName.trim()) {
    errors.push({ message: "Test name must be atleast 1 character." });
  }
  if (testInput.assignment) {
    (filteredAssignments || []).forEach((test) => {
      if (
        (testInput.testId || "").toString() !== (test._id || "").toString() &&
        test.testName.toLowerCase().trim() ===
        testInput.testName.toLowerCase().trim()
      ) {
        errors.push({
          message: "You already have an assignment with that name.",
        });
      }
    });
  }
  if (!testInput.assignment) {
    (filteredTests || []).forEach((test) => {
      if (
        (testInput.testId || "").toString() !== (test._id || "").toString() &&
        test.testName.toLowerCase().trim() ===
        testInput.testName.toLowerCase().trim()
      ) {
        errors.push({ message: "You already have a test with that name." });
      }
    });
  }
  if (!validator.isBoolean(testInput.published + "")) {
    errors.push({ message: "Published must be true or false" });
  }
  if (!validator.isBoolean(testInput.isGradeIncluded + "")) {
    errors.push({ message: "Graded included must be true or false" });
  }
  if (!validator.isAlphanumeric(testInput.instructor)) {
    errors.push({ message: "Instructor must be an alpha numeric id" });
  }
  const testTypes = ["quiz", "midterm", "final"];
  if (!testTypes.includes(testInput.testType) && !testInput.assignment) {
    errors.push({ message: "Test type must be either quiz, midterm or final" });
  }
  //make sure that there is only 1 final exam
  const foundFinalExam = courseTests.find(
    (t) => t.testType.toString() === "final"
  );
  if (
    foundFinalExam &&
    testInput.testType === "final" &&
    foundFinalExam._id.toString() !== testInput.testId.toString()
  ) {
    errors.push({ message: "There can only be 1 final exam" });
  }

  if (testInput.isGradeIncluded &&
    (!validator.isFloat(testInput.testWeight + "") ||
      !(testInput.testWeight > 0) ||
      !(testInput.testWeight <= 1000))
  ) {
    errors.push({
      message:
        "Test weight must be a positive float, less then or equal to 1000",
    });
  }
  if (!testInput.isGradeIncluded &&
    !(testInput.testWeight === 0)
  ) {
    errors.push({
      message:
        "Test weight must be 0 if test is excluded from course grade",
    });
  }
  if (testInput.passingGrade) {
    if (
      !validator.isFloat(testInput.passingGrade + "") ||
      testInput.passingGrade < 1 ||
      testInput.passingGrade > 100
    ) {
      errors.push({
        message: "The passing grade must be between 1 and 100",
      });
    }
  }
  if (
    !testInput.assignment &&
    (testInput.timer || testInput.timer === 0) &&
    (!validator.isInt(testInput.timer + "") || !(testInput.timer > 0))
  ) {
    errors.push({ message: "Test timer must be a positive integer" });
  }
  if (
    testInput.availableOnDate &&
    !moment(testInput.availableOnDate).isValid()
  ) {
    errors.push({ message: "Available on date is not a valid date" });
  }
  if (testInput.dueDate && !moment(testInput.dueDate).isValid()) {
    errors.push({ message: "Due date is not a valid date" });
  }
  if (
    testInput.gradeReleaseDate &&
    !moment(testInput.gradeReleaseDate).isValid()
  ) {
    errors.push({ message: "Grade release date is not a valid date" });
  }
  if (!validator.isBoolean(testInput.passingRequired + "") && !testInput.assignment) {
    errors.push({ message: "Passing required must be true or false" });
  }
  if (testInput.passingRequired === true && (testInput.testType === 'quiz' || testInput.assignment)) {
    errors.push({ message: "Passing required only applies to midterms and finals" });
  }
  if (testInput.passingRequired === true && !testInput.passingGrade) {
    errors.push({ message: "Specify a passing grade or switch to passing not required" });
  }
  if (
    !validator.isBoolean(testInput.allowLateSubmission + "") &&
    testInput.assignment
  ) {
    errors.push({ message: "Allow late submission must be true or false" });
  }
  if (
    testInput.allowLateSubmission &&
    (!testInput.latePenalty || !testInput.lateDaysAllowed)
  ) {
    errors.push({
      message:
        "If you allow late submission, you must specify how many late days you allow as an integer greater than 0 and the daily penalty as an integer or decimal greater than 0 and less than 100",
    });
  }
  if (
    testInput.latePenalty &&
    (!validator.isFloat(testInput.latePenalty + "") ||
      !(testInput.latePenalty > 0) ||
      !(testInput.latePenalty < 100))
  ) {
    errors.push({
      message:
        "Late penalty must be an integer or decimal number greater than 0 and less than 100",
    });
  }
  if (
    testInput.lateDaysAllowed &&
    (!validator.isInt(testInput.lateDaysAllowed + "") ||
      !(testInput.lateDaysAllowed > 0))
  ) {
    errors.push({
      message: "Late days allowed must be an integer greater than 0",
    });
  }
  if (!((testInput.testSections || []).length > 0)) {
    errors.push({
      message: "Must select atleast 1 test section",
    });
  }

  const testSections = ["mc", "essay", "speaking", "fillblanks"];
  const isMcSection = testInput.testSections.includes("mc");
  const isEssaySection = testInput.testSections.includes("essay");
  const isSpeakingSection = testInput.testSections.includes("speaking");
  const isFillblankSection = testInput.testSections.includes("fillblanks");
  (testInput.testSections || []).forEach((section) => {
    if (!testSections.includes(section)) {
      errors.push({
        message:
          "Test section must include one of the following: [mc,essay,speaking,fillblanks]",
      });
    }
  });
  (testInput.sectionWeights || []).forEach((weight, index) => {
    if (index === 0 && isMcSection && !weight) {
      errors.push({
        message: "The multiple-choice section should have a weight",
      });
    }
    if (index === 1 && isEssaySection && !weight) {
      errors.push({
        message: "The essay section should have a weight",
      });
    }
    if (index === 2 && isSpeakingSection && !weight) {
      errors.push({
        message: "The speaking section should have a weight",
      });
    }
    if (index === 3 && isFillblankSection && !weight) {
      errors.push({
        message: "The fill-in-the-blanks section should have a weight",
      });
    }
    if (
      weight &&
      (!validator.isFloat(weight + "") || !(weight > 0) || !(weight <= 100))
    ) {
      errors.push({
        message:
          "Section weights must be an integer or a decimal number greater than 0 and less than or equal to 100",
      });
    }
  });
  //check that sections weights are equal to 100
  const sectionWeightsSum = (testInput.sectionWeights || []).reduce(
    (a, b) => a + b,
    0
  );
  if (!(sectionWeightsSum >= 99.99 && sectionWeightsSum <= 100)) {
    errors.push({
      message: "The sum of the section weights must equal 100",
    });
  }

  const course = await Course.findById(testInput.course);
  const courseStart = new Date(course.courseStartDate).getTime();
  const courseEnd = new Date(course.courseEndDate).getTime();
  const availableOn = new Date(testInput.availableOnDate).getTime();
  const gradeRelease = new Date(testInput.gradeReleaseDate).getTime();
  const dueOn = new Date(testInput.dueDate).getTime();
  if (course.courseStartDate && course.courseEndDate) {
    //available on date and due dates must fall between the course start date and course end date
    if (
      testInput.availableOnDate &&
      courseStart &&
      courseEnd &&
      (!(availableOn > courseStart) || !(availableOn < courseEnd))
    ) {
      errors.push({
        message:
          "Available on date must fall within the course period duration",
      });
    }

    if (
      testInput.dueDate &&
      (!(dueOn > courseStart) || !(dueOn < courseEnd)) &&
      courseStart &&
      courseEnd
    ) {
      errors.push({
        message: "Due date must fall within the course period duration",
      });
    }
    //grade release date must fall after course start date and can also fall after course end date
    if (
      testInput.gradeReleaseDate &&
      !(gradeRelease > courseStart) &&
      courseStart
    ) {
      errors.push({
        message: "Grade release date must be after course start date",
      });
    }
  }
  //the 3 dates should be in the correct chronological order
  if (!(availableOn < gradeRelease) && availableOn && gradeRelease) {
    errors.push({
      message: "Available on date must come before grade release date",
    });
  }
  if (!(availableOn < dueOn) && availableOn && dueOn) {
    errors.push({
      message: "Available on date must come before due date",
    });
  }
  if (!(dueOn < gradeRelease) && gradeRelease && dueOn) {
    errors.push({
      message: "Grade release date should be after the due date",
    });
  }
  console.log('testInput.allowLateSubmission', testInput.allowLateSubmission)
  console.log('gradeRelease', gradeRelease)
  console.log('dueOn', dueOn)
  console.log('(dueOn + 86,400,000 * testInput.lateDaysAllowed)', (dueOn + 86400000 * testInput.lateDaysAllowed))
  console.log('testInput.lateDaysAllowed', testInput.lateDaysAllowed)
  console.log('dueOn + 86,400,000 * testInput.lateDaysAllowed)  < gradeRelease', (dueOn + 86400000 * testInput.lateDaysAllowed) < gradeRelease)
  if (!((dueOn + 86400000 * testInput.lateDaysAllowed) < gradeRelease) && gradeRelease && dueOn && testInput.allowLateSubmission) {
    errors.push({
      message: "Grade release date should be after the due date plus the number of late days allowed",
    });
  }
  const materialSections = [
    "multipleChoice",
    "essay",
    "speaking",
    "fillInTheBlanks",
    "test",
  ];
  (testInput.readingMaterials || []).forEach((material, index) => {
    //************sanitize material.content for xss *************/
    if (!materialSections.includes(material.section)) {
      errors.push({
        message:
          "reading material section should be one of the following: multipleChoice, essay, speaking, fillInTheBlanks, test",
      });
    }
    if (!validator.isBoolean(material.fileUpload + "")) {
      errors.push({
        message: "reading material fileupload must be true or false",
      });
    }
    if (index === 0 && !isMcSection && !validator.isEmpty(material.content)) {
      errors.push({
        message:
          "There should not be multiple-choice section reading materials since the section was not selected",
      });
    }
    if (
      index === 1 &&
      !isEssaySection &&
      !validator.isEmpty(material.content)
    ) {
      errors.push({
        message:
          "There should not be essay section reading materials since the section was not selected",
      });
    }

    if (
      index === 2 &&
      !isSpeakingSection &&
      !validator.isEmpty(material.content)
    ) {
      errors.push({
        message:
          "There should not be speaking section reading materials since the section was not selected",
      });
    }
    if (
      index === 3 &&
      !isFillblankSection &&
      !validator.isEmpty(material.content)
    ) {
      errors.push({
        message:
          "There should not be fill-in-the-blanks section reading materials since the section was not selected",
      });
    }
  });
  (testInput.audioMaterials || []).forEach((material, index) => {
    //************sanitize material.audio for xss *************/
    if (!materialSections.includes(material.section)) {
      errors.push({
        message:
          "audio material section should be one of the following: multipleChoice,essay,speaking,fillInTheBlanks,test",
      });
    }
    if (!validator.isBoolean(material.fileUpload + "")) {
      errors.push({
        message: "audio material fileupload must be true or false",
      });
    }
    if (index === 0 && !isMcSection && !validator.isEmpty(material.audio)) {
      errors.push({
        message:
          "There should not be multiple-choice section audio materials since the section was not selected",
      });
    }
    if (index === 1 && !isEssaySection && !validator.isEmpty(material.audio)) {
      errors.push({
        message:
          "There should not be essay section audio materials since the section was not selected",
      });
    }
    if (
      index === 3 &&
      !isSpeakingSection &&
      !validator.isEmpty(material.audio)
    ) {
      errors.push({
        message:
          "There should not be speaking section audio materials since the section was not selected",
      });
    }
    if (
      index === 3 &&
      !isFillblankSection &&
      !validator.isEmpty(material.audio)
    ) {
      errors.push({
        message:
          "There should not be fill-in-the-blanks section audio materials since the section was not selected",
      });
    }
  });
  //multiple-choice section validation
  if (isMcSection) {
    (multipleChoiceQuestionsInput || []).forEach((item, index) => {
      //sanitize item.question item.answerOptions item.solution
      if (validator.isEmpty(item.question)) {
        errors.push({
          message: `[Multiple-choice section error] Question ${index + 1
            } is empty`,
        });
      }
      if (!validator.isFloat(item.marks + "") || !(item.marks > 0)) {
        errors.push({
          message: `[Multiple-choice section error] Marks in question ${index + 1
            } needs to be an integer or decimal number greater than 0`,
        });
      }
      const numberOfAnswerOptions = (item.answerOptions || []).length;
      const numberOfCorrectAnswers = (item.correctAnswers || []).length;
      if (numberOfAnswerOptions === numberOfCorrectAnswers) {
        errors.push({
          message: `[Multiple-choice section error] At least 1 answer option must remain unchecked in question ${index + 1
            }`,
        });
      }
      if (numberOfCorrectAnswers === 0) {
        errors.push({
          message: `[Multiple-choice section error] You must select at least 1 correct answer in question ${index + 1
            }`,
        });
      }
      if (numberOfAnswerOptions < 2) {
        errors.push({
          message: `[Multiple-choice section error] There must be at least 2 answer options in question ${index + 1
            }`,
        });
      }
      item.answerOptions.forEach((option, answerIndex) => {
        if (validator.isEmpty(option)) {
          errors.push({
            message: `[Multiple-choice section error] Answer option ${answerIndex + 1
              } in question ${index + 1} is empty`,
          });
        }
      });

      const duplicateCorrectAnswers =
        checkDuplicates(item.correctAnswers) || [];
      if (duplicateCorrectAnswers.length > 0) {
        errors.push({
          message: `[Multiple-choice section error] The correct answers cannot repeat themselves in question ${index + 1
            }`,
        });
      }
      const trimmedAnswerOptions = (item.answerOptions || []).map((answer) =>
        answer.trim()
      );
      const duplicateAnswerOptions =
        checkDuplicates(trimmedAnswerOptions) || [];
      if (duplicateAnswerOptions.length > 0) {
        errors.push({
          message: `[Multiple-choice section error] The answer options cannot repeat themselves in question ${index + 1
            }`,
        });
      }
      item.correctAnswers.forEach((answer) => {
        if (!validator.isInt(answer + "") || !(parseInt(answer) > 0)) {
          errors.push({
            message: `[Multiple-choice section error] The correct answer must be an integer greater than 0 in question ${index + 1
              }`,
          });
        }
        if (!(parseInt(answer) <= numberOfAnswerOptions)) {
          errors.push({
            message: `[Multiple-choice section error] Their is no correct answer ${answer}, the total amount of answers is ${numberOfAnswerOptions} in question ${index + 1
              }`,
          });
        }
      });
    });
  }
  //essay section validation
  if (isEssaySection) {
    (essayQuestionsInput || []).forEach((item, index) => {
      //sanitize item.question item.solution
      if (validator.isEmpty(item.question)) {
        errors.push({
          message: `[Essay section error] Question ${index + 1} is empty`,
        });
      }
      if (!validator.isFloat(item.marks + "") || !(item.marks > 0)) {
        errors.push({
          message: `[Essay section error] Marks in question ${index + 1
            } needs to be an integer or decimal number greater than 0`,
        });
      }
    });
  }
  //speaking section validation
  if (isSpeakingSection) {
    (speakingQuestionsInput || []).forEach((item, index) => {
      //sanitize item.question item.audioQuestion item.audioAnswer
      if (
        validator.isEmpty(item.question) &&
        validator.isEmpty(item.questionAudio)
      ) {
        errors.push({
          message: `[Speaking section error] Must provide a text question or audio question in question ${index + 1
            }`,
        });
      }
      if (
        !validator.isEmpty(item.question) &&
        !validator.isEmpty(item.questionAudio)
      ) {
        errors.push({
          message: `[Speaking section error] Can't have both text question and audio question in question ${index + 1
            }`,
        });
      }
      if (!validator.isFloat(item.marks + "") || !(item.marks > 0)) {
        errors.push({
          message: `[Speaking section error] Marks in question ${index + 1
            } needs to be an integer or decimal number greater than 0`,
        });
      }
    });
  }
  //fill-in-the-blanks section validation
  if (isFillblankSection) {
    //sanitize the content
    //sanitize incorrect answers
    //sanitize the correct answer
    //sanitize audio
    if (validator.isEmpty((fillBlankQuestionsInput || {}).fillBlankContent)) {
      errors.push({
        message: `[Fill-in-the-blanks section error] There is no content`,
      });
    }
    if (
      ((fillBlankQuestionsInput || {}).fillBlankContent || "").includes(
        "-BLANK-"
      )
    ) {
      errors.push({
        message: `[Fill-in-the-blanks section error] -BLANK- is a reserved keyword and cannot be used`,
      });
    }
    if (((fillBlankQuestionsInput || {}).blanks || []).length === 0) {
      errors.push({
        message: `[Fill-in-the-blanks section error] Must create at least 1 blank`,
      });
    }
    ((fillBlankQuestionsInput || {}).blanks || []).forEach((blank, index) => {
      if (!validator.isFloat(blank.marks + "") || !(blank.marks > 0)) {
        errors.push({
          message: `[Fill-in-the-blanks section error] Marks in blank ${index + 1
            } needs to be an integer or decimal number greater than 0`,
        });
      }
      if (!validator.isBoolean(blank.selectableAnswer + "")) {
        errors.push({
          message: `[Fill-in-the-blanks section error] Selectable answer in blank ${index + 1
            } needs to be true or false`,
        });
      }
      (blank.incorrectAnswers || []).forEach((answer) => {
        if (!validator.isEmpty(answer) && !blank.selectableAnswer) {
          errors.push({
            message: `[Fill-in-the-blanks section error] Blank ${index + 1
              } is not a selectable answer therefore should not have incorrect answers to choose from`,
          });
        }
      });
      const trimmedIncorrectAnswers =
        (blank.incorrectAnswers || []).map((item) => item.trim()) || [];
      if (
        (blank.incorrectAnswers || []).length === 0 &&
        blank.selectableAnswer
      ) {
        errors.push({
          message: `[Fill-in-the-blanks section error] Blank ${index + 1
            } is a selectable answer therefore you must make at least 1 incorrect answer to choose from`,
        });
      }
      const duplicateIncorrectAnswers = checkDuplicates(
        trimmedIncorrectAnswers
      );
      if (
        (duplicateIncorrectAnswers || []).length > 0 &&
        blank.selectableAnswer
      ) {
        errors.push({
          message: `[Fill-in-the-blanks section error] Blank ${index + 1
            } has duplicate incorrect answers`,
        });
      }
      if (
        trimmedIncorrectAnswers.includes(blank.correctAnswer.trim()) &&
        blank.selectableAnswer
      ) {
        errors.push({
          message: `[Fill-in-the-blanks section error] Blank ${index + 1
            } has an incorrect answer that is the same as the correct answer`,
        });
      }
    });
  }
  return errors;
};

exports.validateTest = validateTest;
