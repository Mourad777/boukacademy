const { buildSchema } = require('graphql');

module.exports = buildSchema(`
    type Notification {
        _id:ID!
        content: [String!]!
        usersSeen:[ID!]!
        seen:Boolean!
        toUserType: String!
        toSpecificUser: ID
        avatar: String
        fromUser:ID!
        senderFirstName:String
        senderLastName:String
        documentType: String
        message:String
        documentId: ID
        course:ID
    }

    type RootQuery {
        notifications: [Notification!]!
    }

    type RootMutation {
        markAsSeen(notificationId: ID!):Boolean!
    }

    schema {
        query: RootQuery
        mutation: RootMutation
    }
`);
