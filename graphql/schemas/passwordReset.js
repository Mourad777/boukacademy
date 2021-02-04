const { buildSchema } = require('graphql');

module.exports = buildSchema(`

    type ResetData {
        token: String!
    }

    input PasswordResetInitializeInputData {
        email: String!
        accountType: String!
    }
    
    input PasswordResetInputData {
        password: String!
        confirmPassword: String!
        token: String!
        accountType: String!
    }

    type RootMutation {
        passwordResetInitialize(passwordResetInitializeInput: PasswordResetInitializeInputData): ResetData!
        passwordReset(passwordResetInput: PasswordResetInputData):String!
    }

    schema {
        mutation: RootMutation
    }
`);
