const validator = require("validator");
const moment = require("moment");

const validateSubmitTest = async (
  testClosed,
  submittedOn,
  lastSavedOn,
  graded,
  grade,
  gradeAdjustmentExplanation,
  gradeOverride,
  gradingInProgress,
  marking,
  latePenalty,
  sectionGrades,
  multipleChoiceAnswersInput,
  essayAnswersInput,
  speakingAnswersInput,
  fillBlankAnswersInput,
  instructorTest,
  req
) => {
  const errors = [];
  const isMcSection = instructorTest.sectionWeights.mcSection;
  const isEssaySection = instructorTest.sectionWeights.essaySection;
  const isSpeakingSection = instructorTest.sectionWeights.speakingSection;
  const isFillBlankSection = instructorTest.sectionWeights.fillBlankSection;
  //sanitize grade adjustment explanation
  if (!validator.isBoolean(testClosed + "")) {
    errors.push({ message: "Test closed must be true or false" });
  }
  if (submittedOn && !moment(parseInt(submittedOn)).isValid()) {
    errors.push({ message: "Submit date is not a valid date" });
  }
  if (lastSavedOn && !moment(parseInt(lastSavedOn)).isValid()) {
    errors.push({ message: "Save date is not a valid date" });
  }
  if (!validator.isBoolean(graded + "")) {
    errors.push({ message: "Graded must be true or false" });
  }
  if (!validator.isBoolean(gradeOverride + "")) {
    errors.push({ message: "Grade override must be true or false" });
  }
  if (!validator.isBoolean(marking + "")) {
    errors.push({ message: "Marking must be true or false" });
  }

  if (
    grade &&
    (!validator.isFloat(grade + "") || !(grade >= 0) || !(grade <= 100))
  ) {
    errors.push({ message: "Grade must be a Float between 0 and 100" });
  }
  if (
    latePenalty &&
    (!validator.isFloat(latePenalty + "") ||
      !(latePenalty > 0) ||
      !(latePenalty < 100))
  ) {
    errors.push({
      message: "Late penalty must be a Float greater than 0 and less than 100",
    });
  }
  if (!testClosed && gradingInProgress) {
    errors.push({
      message:
        "The test or assignment is not marked as closed but grading is in progress",
    });
  }
  if (!testClosed && grade) {
    errors.push({
      message: "The test or assignment is not marked as closed but has a grade",
    });
  }
  if (!testClosed && graded) {
    errors.push({
      message:
        "The test or assignment is not marked as closed but is marked as graded",
    });
  }
  if (!testClosed && gradeAdjustmentExplanation) {
    errors.push({
      message:
        "The test or assignment is not marked as closed but has a grade adjustment explanation",
    });
  }
  if (!testClosed && gradeOverride) {
    errors.push({
      message:
        "The test or assignment is not marked as closed but has a grade override",
    });
  }

  if ((sectionGrades || []).length > 0) {
    sectionGrades.forEach((grade, index) => {
      if (!isMcSection && index === 0) return;
      if (!isEssaySection && index === 1) return;
      if (!isSpeakingSection && index === 2) return;
      if (!isFillBlankSection && index === 3) return;
      let section;
      if (index === 0) section = "Multiple-choice";
      if (index === 1) section = "Essay";
      if (index === 2) section = "Speaking";
      if (index === 3) section = "Fill-in-the-blanks";
      if (!validator.isFloat(grade + "") || !(grade >= 0) || !(grade <= 100)) {
        errors.push({
          message: `${section} section grade must be a float greater than or equal to 0 and less than or equal to 100. Recieved a value of ${grade}`,
        });
      }
    });
  }

  if (marking && !req.instructorIsAuth) {
    errors.push({
      message:
        "Only an instructor is authorized to mark a test or assignment, you are not authorized",
    });
  }
  if (graded && !req.instructorIsAuth) {
    errors.push({
      message:
        "Only an instructor is authorized to set the test or assignment as graded, you are not authorized",
    });
  }
  if (grade && !req.instructorIsAuth) {
    errors.push({
      message:
        "Only an instructor is authorized to set the grade for a test or assignment, you are not authorized",
    });
  }
  if (gradeOverride && !req.instructorIsAuth) {
    errors.push({
      message:
        "Only an instructor is authorized to override the grade for a test or assignment, you are not authorized",
    });
  }
  if (latePenalty && !req.instructorIsAuth) {
    errors.push({
      message:
        "Only an instructor is authorized to set the late penalty for a test or assignment, you are not authorized",
    });
  }
  if (sectionGrades && !req.instructorIsAuth) {
    errors.push({
      message:
        "Only an instructor is authorized to set the section grades for a test or assignment, you are not authorized",
    });
  }

  if (graded) {
    if (isMcSection && !sectionGrades[0] && sectionGrades[0] !== 0) {
      errors.push({
        message:
          "The test or assignment is marked as graded and their is a multiple-choice section but that section did not recieve a grade",
      });
    }
    if (isEssaySection && !sectionGrades[1] && sectionGrades[1] !== 0) {
      errors.push({
        message:
          "The test or assignment is marked as graded and their is a essay section but that section did not recieve a grade",
      });
    }
    if (isSpeakingSection && !sectionGrades[2] && sectionGrades[2] !== 0) {
      errors.push({
        message:
          "The test or assignment is marked as graded and their is a speaking section but that section did not recieve a grade",
      });
    }
    if (isFillBlankSection && !sectionGrades[3] && sectionGrades[3] !== 0) {
      errors.push({
        message:
          "The test or assignment is marked as graded and their is a fill-in-the-blanks section but that section did not recieve a grade",
      });
    }
    if (gradingInProgress) {
      errors.push({
        message:
          "The test or assignment is marked as graded but grading in progress is true",
      });
    }
    if (!grade && grade !== 0) {
      errors.push({
        message:
          "The test or assignment is marked as graded but their is no grade",
      });
    }
  }

  //Student test taking validation
  if (isMcSection) {
    (multipleChoiceAnswersInput || []).forEach((q, index) => {
      if (q.questionNumber !== index + 1 && req.studentIsAuth) {
        errors.push({
          message: `[Multiple-choice input error] The question number at question ${
            index + 1
          } is invalid`,
        });
      }
      (q.answers || []).forEach((answer) => {
        //sanitize each answer
        const possibleOptions =
          ((instructorTest.multipleChoiceQuestions || [])[index] || {})
            .answerOptions || [];
        if ((!(possibleOptions.includes(answer)) && answer) && req.studentIsAuth) {
          errors.push({
            message: `[Multiple-choice input error] The selected answer at question number ${
              index + 1
            } is not an answer option`,
          });
        }
      });

      //Instructor grading validation
      const instructorTestQuestion =
        (instructorTest.multipleChoiceQuestions || [])[index] || {};
      if (q.additionalNotes && !req.instructorIsAuth) {
        errors.push({
          message: `[Multiple-choice input error] Only the instructor can provide additional notes at question number ${
            index + 1
          }`,
        });
      }
      if ((q.marks || q.marks === 0) && !req.instructorIsAuth) {
        errors.push({
          message: `[Multiple-choice input error] Only the instructor can provide marks at question number ${
            index + 1
          }`,
        });
      }

      if (
        (gradingInProgress || graded) &&
        (!(q.marks <= instructorTestQuestion.marks) ||
          !(q.marks >= 0) ||
          !validator.isFloat(q.marks + ""))
      ) {
        errors.push({
          message: `[Multiple-choice input error] If the test is graded or grading is in progress,
              marks is required and needs to be a float greater than or equal to 0 and less than or equal
               to the total question marks  ${index + 1}`,
        });
      }
      if (q.additionalNotes) {
        //sanitize additional notes
      }
    });
  }
  if (isEssaySection) {
    //Student test taking validation
    (essayAnswersInput || []).forEach((q, index) => {
      if (q.questionNumber !== index + 1 && req.studentIsAuth) {
        errors.push({
          message: `[Essay input error] The question number at question ${
            index + 1
          } is invalid`,
        });
      }
      //sanitize question.answer

      //Instructor grading validation
      const instructorTestQuestion =
        (instructorTest.essayQuestions || [])[index] || {};
      if (q.additionalNotes && !req.instructorIsAuth) {
        errors.push({
          message: `[Essay input error] Only the instructor can provide additional notes at question number ${
            index + 1
          }`,
        });
      }
      if ((q.marks || q.marks === 0) && !req.instructorIsAuth) {
        errors.push({
          message: `[Essay input error] Only the instructor can provide marks at question number ${
            index + 1
          }`,
        });
      }

      if (
        (gradingInProgress || graded) &&
        (!(q.marks <= instructorTestQuestion.marks) ||
          !(q.marks >= 0) ||
          !validator.isFloat(q.marks + ""))
      ) {
        errors.push({
          message: `[Essay input error] If the test is graded or grading is in progress,
                   marks is required and needs to be a float greater than or equal to 0 and less than or equal
                    to the total question marks  ${index + 1}`,
        });
      }
      if (q.additionalNotes) {
        //sanitize additional notes
      }
      if (q.instructorCorrection && !req.instructorIsAuth) {
        errors.push({
          message: `[Essay input error] Only the instructor can provide a correction at question number ${
            index + 1
          }`,
        });
      }
      //sanitize instructor correction
      if (
        (graded || gradingInProgress) &&
        !validator.isBoolean(q.allowCorrection + "")
      ) {
        errors.push({
          message: `[Essay input error] Correcting using text editor must be true or false at question number ${
            index + 1
          }`,
        });
      }
    });
  }
  if (isSpeakingSection) {
    //Student test taking validation
    (speakingAnswersInput || []).forEach((q, index) => {
      if (q.questionNumber !== index + 1 && req.studentIsAuth) {
        errors.push({
          message: `[Speaking input error] The question number at question ${
            index + 1
          } is invalid`,
        });
      }
      if (
        !validator.isEmpty(q.answer + "") &&
        !(q.answer || "").includes(".mp3") &&
        req.studentIsAuth
      ) {
        errors.push({
          message: `[Speaking input error] Question: ${
            index + 1
          } If an answer is provided, it must be a path to an mp3 file`,
        });
      }
      //sanitize question.answer

      //Instructor grading validation
      const instructorTestQuestion =
        (instructorTest.speakingQuestions || [])[index] || {};
      if (q.additionalNotes && !req.instructorIsAuth) {
        errors.push({
          message: `[Speaking input error] Only the instructor can provide additional notes at question number ${
            index + 1
          }`,
        });
      }
      if ((q.marks || q.marks === 0) && !req.instructorIsAuth) {
        errors.push({
          message: `[Speaking input error] Only the instructor can provide marks at question number ${
            index + 1
          }`,
        });
      }

      if (
        (gradingInProgress || graded) &&
        (!(q.marks <= instructorTestQuestion.marks) ||
          !(q.marks >= 0) ||
          !validator.isFloat(q.marks + ""))
      ) {
        errors.push({
          message: `[Speaking input error] If the test is graded or grading is in progress,
                   marks is required and needs to be a float greater than or equal to 0 and less than or equal
                    to the total question marks  ${index + 1}`,
        });
      }
      if (q.additionalNotes) {
        //sanitize additional notes
      }
      if (q.feedbackAudio && !req.instructorIsAuth) {
        errors.push({
          message: `[Speaking input error] Only the instructor can provide feedback audio at question number ${
            index + 1
          }`,
        });
      }
      if (q.feedbackAudio && !(q.feedbackAudio || "").includes(".mp3")) {
        errors.push({
          message: `[Speaking input error] Feedback audio must be in mp3 format ${
            index + 1
          }`,
        });
      }
      //sanitize audio path
    });
  }
  if (isFillBlankSection) {
    //Student test taking validation
    (fillBlankAnswersInput || []).forEach((q, index) => {
      if (q.questionNumber !== index + 1 && req.studentIsAuth) {
        errors.push({
          message:
            "[Fill-in-the-blanks input error] The question number is invalid",
        });
      }
      const blank =
        ((instructorTest.fillInBlanksQuestions || {}).blanks || [])[index] ||
        {};
        console.log('blank.correctAnswer',blank.correctAnswer);
        console.log('blank.incorrectAnswers',blank.incorrectAnswers);
        console.log('q.answer',q.answer)
      if (blank.selectableAnswer) {
        if (
          !(blank.incorrectAnswers || []).includes(q.answer) &&
          blank.correctAnswer !== q.answer &&
          !validator.isEmpty(q.answer + "") &&
          !(q.answer === "Select the correct answer") &&
          req.studentIsAuth
        ) {
          errors.push({
            message: `[Fill-in-the-blanks input error] The selected answer at blank number ${
              index + 1
            } is not an answer option`,
          });
        }
      } else {
        //sanitize question.answer
      }
      //Instructor grading validation
      if (q.additionalNotes && !req.instructorIsAuth) {
        errors.push({
          message: `[Fill-in-the-blanks input error] Only the instructor can provide additional notes at blank number ${
            index + 1
          }`,
        });
      }
      if ((q.marks || q.marks === 0) && !req.instructorIsAuth) {
        errors.push({
          message: `[Fill-in-the-blanks input error] Only the instructor can provide marks at blank number ${
            index + 1
          }`,
        });
      }

      if (
        (gradingInProgress || graded) &&
        (!(q.marks <= blank.marks) ||
          !(q.marks >= 0) ||
          !validator.isFloat(q.marks + ""))
      ) {
        errors.push({
          message: `[Fill-in-the-blanks input error] If the test is graded or grading is in progress,
             marks is required and needs to be a float greater than or equal to 0 and less than or equal
              to the total question marks  ${index + 1}`,
        });
      }
      if (q.additionalNotes) {
        //sanitize additional notes
      }
    });
  }

  return errors;
};

exports.validateSubmitTest = validateSubmitTest;
