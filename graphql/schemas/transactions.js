const { buildSchema } = require('graphql');

module.exports = buildSchema(`

    type PaymentIntent {
        success:Boolean
    }

    type Charge {
        userId:ID
        courseId:ID
        currency:String!
        amount:Float!
        address:String!
        expiration:Float!
    }

    type RootMutation {
        requestBitcoinAddress(courseId: ID!): Charge!
        intentCreditcardPayment(courseId: ID!,paymentMethodId:String,paymentIntentId:String): PaymentIntent!
    }

    type Transaction {
        userId:ID!
        paymentType:String!
        amount:Float!
        courseId:ID
        currency:String!
        isRefund:Boolean!
        isSuccess:Boolean!
        status:String
        coinbaseChargeId:String
        destinationAddress:String
        error:String
        address:String
    }

    type RootQuery {
        transactions:[Transaction]
        cryptoCharges:[Charge]
    }

    schema {
        query: RootQuery
        mutation: RootMutation
    }
`);
