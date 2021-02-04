const { buildSchema } = require('graphql');

module.exports = buildSchema(`

    type Question {
        _id: ID!
        course: ID!
        language:String
        tags:[String]
        difficulty:String
        type:String
        essayQuestion: EssayQuestion
        mcQuestion: McQuestion
        speakingQuestion: SpeakingQuestion
        fillBlankQuestions: FillBlanksSection
    }

    type FillBlanksSection {
        question: String
        blanks: [Blanks]
    }

    type Blanks {
        _id: ID
        correctAnswer: String
        selectableAnswer: Boolean
        incorrectAnswers: [String]
        audio: String
        answerOptions: [String]
    }

    type McQuestion {
        _id: ID
        question: String
        solution: String
        correctAnswers: [String]
        answers: [String]
    }

    type EssayQuestion {
        _id: ID
        question: String
        solution: String
    }

    type SpeakingQuestion {
        _id: ID
        question: String
        audioQuestion: String
        audio: String
    }

    input QuestionInputData {
        id:ID!
        course: ID!
        language:String
        tags:[String]
        difficulty:String
        type:String
    }

    input McQuestionInput {
        question: String
        answerOptions:[String]
        correctAnswers:[String]
        solution: String
    }

    input EssayQuestionInput {
        question: String
        solution: String
    }

    input SpeakingQuestionInput {
        question: String
        questionAudio: String
        audio: String
    }

    input FillBlankQuestionAnswersInput {
        _id: ID
        incorrectAnswers:[String]
        correctAnswer:String
        selectableAnswer: Boolean
        audio: String
    }

    input FillBlankQuestionInput {
        fillBlankContent: String
        blanks: [FillBlankQuestionAnswersInput]
    }

    type RootMutation {
        createQuestion(
            questionInput: QuestionInputData,
            multipleChoiceQuestionInput: McQuestionInput,
            essayQuestionInput: EssayQuestionInput,
            speakingQuestionInput: SpeakingQuestionInput,
            fillBlankQuestionInput: FillBlankQuestionInput
            ):Question
        updateQuestion(
            questionInput: QuestionInputData,
            multipleChoiceQuestionInput: McQuestionInput,
            essayQuestionInput: EssayQuestionInput,
            speakingQuestionInput: SpeakingQuestionInput,
            fillBlankQuestionInput: FillBlankQuestionInput
            ): Question
        deleteQuestion(id:ID!):Boolean!
    }

    type RootQuery {
        question(id: ID!): Question!
        questions(courseId: ID!): [Question]
    }

    schema {
        query: RootQuery
        mutation: RootMutation
    }
`);
