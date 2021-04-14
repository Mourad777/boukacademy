const Course = require("../../../models/course");
const Transaction = require("../../../models/transaction");
const coinbase = require('coinbase-commerce-node');
const Client = coinbase.Client;
const clientObj = Client.init(process.env.COINBASE_KEY);
clientObj.setRequestTimeout(3000);
const Stripe = require('stripe');
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);

module.exports = async function ({ courseId, paymentMethodId, paymentIntentId }, req) {
    if (!req.instructorIsAuth && !req.studentIsAuth) {
        const error = new Error("Not authenticated!");
        error.code = 403;
        throw error;
    }


    const course = await Course.findById(courseId);
    if (!course) {
        const error = new Error("No course found!");
        error.code = 403;
        throw error;
    }

    // let secret;
    // try {
    //     const paymentIntent = await stripe.paymentIntents.create({
    //         amount: course.cost * 100,
    //         currency: "usd",
    //     })
    //     secret = paymentIntent.client_secret
    // } catch (e) {
    // }

    // return secret

    const generateResponse = (intent) => {
        // Note that if your API version is before 2019-02-11, 'requires_action'
        // appears as 'requires_source_action'.
        if (
            intent.status === 'requires_action' &&
            intent.next_action.type === 'use_stripe_sdk'
        ) {
            // Tell the client to handle the action
            return {
                requires_action: true,
                payment_intent_client_secret: intent.client_secret
            };
        } else if (intent.status === 'succeeded') {
            // The payment didn’t need any additional actions and completed!
            // Handle post-payment fulfillment
            return {
                success: true
            };
        } else {
            // Invalid status
            return {
                error: 'Invalid PaymentIntent status'
            }
        }
    }

    const newTransaction = new Transaction({
        userId: req.userId,
        paymentType: 'creditCard',
        amount: course.cost * 100,
        currency: "usd",
        courseId,
        isRefund: false,

    });

    try {
        let intent;
        if (paymentMethodId) {
            // Create the PaymentIntent
            intent = await stripe.paymentIntents.create({
                payment_method: paymentMethodId,
                amount: course.cost * 100,
                currency: 'usd',
                confirmation_method: 'manual',
                confirm: true
            });

        } else if (paymentIntentId) {
            intent = await stripe.paymentIntents.confirm(paymentIntentId);
        }
        // Send the response to the client

        if (intent.status === 'succeeded') {
            newTransaction.isSuccess = true;
            newTransaction.status = 'paid'
            newTransaction.save();
        }

        return generateResponse(intent);
    } catch (e) {
        // Display error on client
        newTransaction.isSuccess = false;
        newTransaction.status = 'paymentFailed'
        newTransaction.error = e.message;
        newTransaction.save();
        return e.message;
    }




}