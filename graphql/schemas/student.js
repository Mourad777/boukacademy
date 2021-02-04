const { buildSchema } = require('graphql');

module.exports = buildSchema(`
    type SectionWeight {
        mcSection: Float
        essaySection: Float
        speakingSection: Float
        fillBlankSection: Float
    }

    type Test {
        _id: ID!
        course: ID!
        published: Boolean!
        testName: String!
        testType: String
        weight: Float!
        timer: Int
        notes: String
        availableOnDate: String
        dueDate: String
        gradeReleaseDate: String
        allowLateSubmission: Boolean
        lateDaysAllowed: Int
        latePenalty: Float
        sectionWeights:SectionWeight
        essayQuestions: [EssayQuestion]
        multipleChoiceQuestions: [McQuestion]
        speakingQuestions: [SpeakingQuestion]
        fillInBlanksQuestions: FillBlanksSection
        assignment: Boolean!
        startTime: String
        endTime: String
        readingMaterials: [ReadingMaterial]
        audioMaterials: [AudioMaterial]
        createdAt: String
    }

    type ReadingMaterial {
        content: String
        section: String
        fileUpload: Boolean
    }

    type AudioMaterial {
        audio: String
        section: String
        fileUpload: Boolean
    }

    type FillBlanksSection {
        text: String
        blanks: [Blanks]
    }

    type Blanks {
        _id: ID
        correctAnswer: String
        marks: Float
        selectableAnswer: Boolean
        incorrectAnswers: [String]
        audio: String
        answerOptions: [String]
    }

    type McQuestion {
        _id: ID
        question: String
        marks: Float
        solution: String
        correctAnswers: [String]
        answerOptions: [String]
    }

    type EssayQuestion {
        _id: ID
        question: String
        marks: Float
        solution: String
    }

    type SpeakingQuestion {
        _id: ID
        question: String
        marks: Float
        questionAudio: String
        audio: String
    }

    type Doc {
        documentType: String!
        document: String!
    }

    type Student {
        _id: ID!
        firstName: String!
        lastName: String!
        email: String
        password: String
        dob: String
        language:String!
        profilePicture:String
        blockedContacts:[String]
        lastLogin:String
        coursesEnrolled: [ID]
        testResults: [TestResult]
        testInSession: TestInSession
        completedCourses: [ID]
        documents:[Doc]
    }

    type MultipleChoiceAnswer {
        questionNumber: Int
        answers: [String]
        marks: Float
        additionalNotes: String
    }

    type Answer {
        questionNumber: Int
        answer: String
        marks: Float
        feedbackAudio: String
        additionalNotes: String
        instructorCorrection: String
        allowCorrection: Boolean
    }

    type MultiplechoiceSectionData {
        grade: Float
        answers: [MultipleChoiceAnswer]
    }

    type EssaySectionData {
        grade: Float
        answers: [Answer]
    }

    type SpeakingSectionData {
        grade: Float
        answers: [Answer]
    }

    type FillInBlanksSectionData {
        grade: Float
        answers: [Answer]
    }

    input McAnswersInput {
        questionNumber: Int
        answers:[String]
        marks: Float
        additionalNotes: String
    }

    input EssayAnswersInput {
        questionNumber: Int
        answer: String
        marks: Float
        additionalNotes: String
        instructorCorrection: String
        allowCorrection: Boolean
    }

    input SpeakingAnswersInput {
        questionNumber: Int
        answer: String
        marks: Float
        additionalNotes: String
        feedbackAudio: String
    }

    input FillBlankAnswersInput {
        questionNumber: Int
        answer: String
        marks: Float
        additionalNotes: String
    }

    type TestInSession {
        test: ID
        startTime: String
        endTime: String
    }

    type TestResult {
        _id:ID!
        test: ID!
        student:ID!
        course: ID!
        closed: Boolean!
        latePenalty: Float
        grade: Float
        gradeOverride: Boolean!
        gradeAdjustmentExplanation: String
        graded: Boolean!
        gradingInProgress: Boolean!
        lastSavedOn: String
        submittedOn: String
        multiplechoiceSection: MultiplechoiceSectionData
        essaySection: EssaySectionData
        speakingSection: SpeakingSectionData
        fillInBlanksSection: FillInBlanksSectionData
    }

    type AssignmentInSession {
        assignment: ID
        startTime: String
    }

    type testData {
        testResults:[TestResult!]!
        testInSession: TestInSession!
        assignmentsInSession: [AssignmentInSession!]
    }

    type ResultsAndInstructorTest {
        test: Test!
        result: TestResult
    }

    type RootQuery {
        testResults: testData!
        testResult:TestResult!
        student: Student!
        students(courseId:ID!): [Student]!
    }

    type RootMutation {
        fetchTest(testId: ID!,password:String):ResultsAndInstructorTest!
        submitTest(
            testId: ID!
            studentId: ID!
            testClosed: Boolean!
            grade: Float
            gradeOverride: Boolean
            gradeAdjustmentExplanation: String
            graded: Boolean!
            gradingInProgress: Boolean!
            marking: Boolean!
            latePenalty: Float
            lastSavedOn: String
            submittedOn: String
            sectionGrades: [Float]
            multipleChoiceAnswersInput: [McAnswersInput]
            essayAnswersInput: [EssayAnswersInput]
            speakingAnswersInput: [SpeakingAnswersInput]
            fillBlankAnswersInput: [FillBlankAnswersInput]
            ):String
        closeTest(test:ID!,student:ID!):TestResult
    }
    
    schema {
        query: RootQuery
        mutation: RootMutation
    }
`);
