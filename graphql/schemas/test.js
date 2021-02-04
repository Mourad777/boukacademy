const { buildSchema } = require("graphql");

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
        testName: String!
        published: Boolean!
        testType: String
        weight: Float!
        timer: Int
        passingGrade:Float
        passingRequired:Boolean
        gradeReleaseDate: String
        dueDate: String
        availableOnDate: String
        allowLateSubmission: Boolean
        lateDaysAllowed: Int
        latePenalty: Float
        sectionWeights:SectionWeight
        essayQuestions: [EssayQuestion]
        multipleChoiceQuestions: [McQuestion]
        speakingQuestions: [SpeakingQuestion]
        fillInBlanksQuestions: FillBlanksSection
        blockedNotes: Boolean!
        notes:String
        assignment: Boolean!
        readingMaterials : [ReadingMaterial]
        audioMaterials : [AudioMaterial]
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

    input ReadingMaterialInput {
        content: String
        section: String
        fileUpload: Boolean
    }

    input AudioMaterialInput {
        audio: String
        section: String
        fileUpload: Boolean
    }

    input TestInputData {
        testName: String!
        published: Boolean!
        createdAt: String
        course: ID!
        instructor:ID!
        testType: String
        testWeight: Float!
        timer: Int
        passingGrade: Float
        passingRequired: Boolean
        availableOnDate: String
        dueDate: String
        gradeReleaseDate: String
        allowLateSubmission: Boolean
        lateDaysAllowed: Int
        latePenalty: Float
        sectionWeights: [Float]!
        testSections: [String!]!
        testId: ID!
        assignment: Boolean!
        blockedNotes: Boolean!
        notes:String
        readingMaterials: [ReadingMaterialInput]
        audioMaterials: [AudioMaterialInput]
    }

    input McQuestionInput {
        question: String
        marks: Float
        answerOptions:[String]
        correctAnswers:[String]
        solution: String
    }

    input EssayQuestionInput {
        question: String
        marks: Float
        solution: String
    }

    input SpeakingQuestionInput {
        question: String
        marks: Float
        questionAudio: String
        audio: String
    }

    input FillBlankQuestionAnswersInput {
        _id: ID
        incorrectAnswers:[String]
        correctAnswer:String
        marks: Float
        selectableAnswer: Boolean
        audio: String
    }

    input FillBlankQuestionInput {
        fillBlankContent: String
        blanks: [FillBlankQuestionAnswersInput]
    }

    type RootMutation {
        createTest(
            testInput: TestInputData,
            multipleChoiceQuestionsInput: [McQuestionInput],
            essayQuestionsInput: [EssayQuestionInput],
            speakingQuestionsInput: [SpeakingQuestionInput],
            fillBlankQuestionsInput: FillBlankQuestionInput
            ):Test
        updateTest(
            testInput: TestInputData,
            multipleChoiceQuestionsInput: [McQuestionInput],
            essayQuestionsInput: [EssayQuestionInput],
            speakingQuestionsInput: [SpeakingQuestionInput],
            fillBlankQuestionsInput: FillBlankQuestionInput
            ): Test
        deleteTest(id:ID!):Boolean!
        resetTest(testId:ID!,studentId:ID,message:String):Boolean!
    }

    type RootQuery {
        courseTests: [Test!]!
    }

    schema {
        query: RootQuery
        mutation: RootMutation
    }
`);