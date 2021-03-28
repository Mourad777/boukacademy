const { buildSchema } = require("graphql");

module.exports = buildSchema(`
    type Doc {
        document: String!
        documentType: String!
    }

    type RefreshTokenData {
        token: String!
        expiresIn: String!
    }

    type ConfigData {
        dropCourseGrade: Float
        isDropCoursePenalty: Boolean!
        isEnrollAllowedAfterDropCourse: Boolean!
        instructorCoursesLimit: Int
        isApproveInstructorAccounts: Boolean!
        studentFileSizeLimit: Float!
        instructorFileSizeLimit: Float!
        coursePassGrade: Float!
        blockedStudents: [ID]
        blockedInstructors: [ID]
    }

    type User {
        _id:ID!
        firstName: String!
        lastName: String!
        profilePicture:String
        lastLogin:String
        language:String!
        dob:String
        email:String!
        documents:[Doc]
        admin:Boolean
        configuration:ConfigData
        isPassword:Boolean!
    }

    type UserData {
        token: String!
        userId: String!
        expiresIn: Int!
        firstName: String!
        lastName: String!
        language:String!
        profilePicture:String
        lastLogin:String
        refreshTokenExpiration:Float!
        admin:Boolean
        configuration:ConfigData
    }

    input Document {
        document:String!
        documentType:String!
    }

    input Key {
        auth:String
        p256dh:String
    }

    input Sub {
        expirationTime:Float
        endpoint:String
        keys:Key
    }

    input AccountInputData {
        id:ID
        firstName: String!
        lastName: String!
        email: String!
        dob: String
        password:String
        currentPassword: String
        newPassword: String
        language:String!
        profilePicture:String
        accountType:String!
        documents: [Document]
        notificationSubscription: Sub
    }

    type RootQuery {
        user: User!
    }

    type RootMutation {
        userLogin(email: String!, password: String, userType: String!,notificationSubscription: Sub): UserData!
        createAccount(accountInput: AccountInputData): User!
        updateAccount(accountInput: AccountInputData): String
        verifyAccount(token:String!, password:String!): UserData!
        resendVerificationEmail(email:String!, accountType:String!): String!
        refreshToken: RefreshTokenData!
    }

    schema {
        query: RootQuery
        mutation: RootMutation
    }
`);
