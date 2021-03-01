const { buildSchema } = require('graphql');

module.exports = buildSchema(`
    type RootMutation {
        activateAccount(userId: ID!): String!
        suspendAccount(userId: ID!,reason:String): String!
    }

    schema {
        mutation: RootMutation
    }
`);
