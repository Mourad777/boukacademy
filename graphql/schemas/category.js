const { buildSchema } = require("graphql");

module.exports = buildSchema(`
    type Topic {
        _id:ID
        topicName: String
        tests: [ID]
        assignments: [ID]
        lessons: [ID]
    }

    type Subject {
        _id:ID
        subjectName: String
        topics: [Topic]
        tests: [ID]
        assignments: [ID]
        lessons: [ID]
    }

    type Module {
        _id:ID
        moduleName: String
        subjects: [Subject]
        tests: [ID]
        assignments: [ID]
        lessons: [ID]
    }

    type Category {
        modules:[Module]
        _id:ID
    }

    input TopicInputData {
        _id:ID
        topicName: String
        tests: [ID]
        assignments: [ID]
        lessons: [ID]
    }

    input SubjectInputData {
        _id:ID
        subjectName: String
        topics: [TopicInputData] 
        tests: [ID]
        assignments: [ID]
        lessons: [ID]
    }

    input ModuleInputData {
        _id:ID
        moduleName: String
        subjects:[SubjectInputData]
        tests: [ID]
        assignments: [ID]
        lessons: [ID]
    }

    type RootQuery {
        category(courseId: ID!): Category
    }

    type RootMutation {
        createCategory(categoryInput: [ModuleInputData],courseId:ID!): String
        updateCategory(categoryInput: [ModuleInputData],courseId:ID!): String
    }

    schema {
        query: RootQuery
        mutation: RootMutation
    }
`);
