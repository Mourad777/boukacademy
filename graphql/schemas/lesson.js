const { buildSchema } = require('graphql');

module.exports = buildSchema(`
    type Slide {
        _id:ID!
        slideContent: String
        audio: String
        video: String
        studentsSeen:[ID!]!
    }

    type Lesson {
        _id: ID!
        course: ID!
        published: Boolean!
        lessonName: String!
        availableOnDate: String
        lessonSlides: [Slide!]!
        createdAt: String
    }

    input LessonInputData {
        _id: ID
        course: ID!
        createdAt: String
        published: Boolean!
        lessonName: String!
        availableOnDate: String
        slideContent: [String]
        slideAudio: [String]
        slideVideo: [String]
    }

    type RootQuery {
        lesson(id: ID!): Lesson!
        instructorLessons: [Lesson!]!
    }

    type RootMutation {
        createLesson(lessonInput: LessonInputData): Lesson!
        updateLesson(lessonInput: LessonInputData): Lesson!
        markSlideAsSeen(lessonId: ID!, slideNumber:Int!): Boolean
        deleteLesson(id: ID!): Boolean
    }

    schema {
        query: RootQuery
        mutation: RootMutation
    }
`);
