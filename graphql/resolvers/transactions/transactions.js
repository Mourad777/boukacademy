const Notification = require("../../../models/notification");
const Student = require("../../../models/student");
const Instructor = require("../../../models/instructor");
const Course = require("../../../models/course");
const Configuration = require("../../../models/configuration");

const Transaction = require("../../../models/transaction");

// const bitcore = require('bitcore-lib');
const coinbase = require('coinbase-commerce-node');
const Client = coinbase.Client;

console.log('process.env.COINBASE_KEY', process.env.COINBASE_KEY)
const clientObj = Client.init(process.env.COINBASE_KEY);
clientObj.setRequestTimeout(3000);

const Charge = coinbase.resources.Charge;

const Stripe = require('stripe');
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY_TEST)



module.exports = {
    cryptoCharges: async function ({ courseId }, req) {
        console.log('getting crypto charges')
        if (!req.instructorIsAuth && !req.studentIsAuth) {
            const error = new Error("Not authenticated!");
            error.code = 403;
            throw error;
        }

        const charges = await Charge.all({});

        console.log('charges: ', charges);
        const fixedCharges = charges.map(ch=>{
            return {
                address:ch.addresses.bitcoin,
                currency:'bitcoin',
                amount:ch.pricing.bitcoin.amount,
                userId:ch.metadata.customer_id,
                courseId:ch.metadata.courseId,
                expiration:new Date(ch.expires_at).getTime()
            }
        })
        return fixedCharges;

    },

    requestBitcoinAddress: async function ({ courseId }, req) {
        console.log('check 1')
        if (!req.instructorIsAuth && !req.studentIsAuth) {
            const error = new Error("Not authenticated!");
            error.code = 403;
            throw error;
        }

        const course = await Course.findById(courseId);
        if (!course) {
            const error = new Error("No course found");
            error.code = 403;
            throw error;
        }

        if (!course.cost) {
            const error = new Error("There is no cost to this course");
            error.code = 403;
            throw error;
        }

        const user = await Student.findById(req.userId)
        if (!user) {
            const error = new Error("No user found");
            error.code = 403;
            throw error;
        }

        var chargeData = {
            'name': course.courseName,
            'description': 'Learn a new skill',
            'local_price': {
                'amount': course.cost,
                'currency': 'USD'
            },
            'pricing_type': 'fixed_price',
            "metadata": {
                "customer_id": req.userId,
                "customer_name": user.firstName + " " + user.lastName,
                "courseId":course._id,
            },

        }
        const charge = await Charge.create(chargeData);
        console.log('charge: ', charge)
        const bitcoinAddress = charge.addresses.bitcoin;

        const newTransaction = new Transaction({
            userId: req.userId,
            courseId: courseId,
            paymentType: 'cryptocurrency',
            amount: charge.pricing.bitcoin.amount,
            currency: 'bitcoin',
            isSuccess: false,
            isRefund: false,
            status: 'pending',
            coinbaseChargeId:charge.id,
        });
        console.log('bitcoinAddress: ', bitcoinAddress);
        const expiration = new Date(charge.expires_at).getTime();
        console.log('expiration',expiration)
        return {
           currency:'bitcoin',
           amount:charge.pricing.bitcoin.amount,
           address:bitcoinAddress,
           expiration:expiration, 
        };

    },

    intentCreditcardPayment: async function ({ courseId, paymentMethodId, paymentIntentId }, req) {
        console.log('credit card payment courseId', courseId)
        console.log('credit card payment paymentMethodId', paymentMethodId)
        console.log('credit card payment paymentIntentId', paymentIntentId)
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
        console.log('course.cost', course.cost)

        // let secret;
        // try {
        //     const paymentIntent = await stripe.paymentIntents.create({
        //         amount: course.cost * 100,
        //         currency: "usd",
        //     })
        //     secret = paymentIntent.client_secret
        //     console.log('client_secret', paymentIntent.client_secret)
        // } catch (e) {
        //     console.log('intent error', e)
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
            console.log('generateResponse(intent.error)', generateResponse(intent))

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




    },


    transactions: async function ({ }, req) {
        if (!req.instructorIsAuth && !req.studentIsAuth) {
            const error = new Error("Not authenticated!");
            error.code = 403;
            throw error;
        }

        const transactions = await Transaction.find({ userId: req.userId, isSuccess: true });

        return transactions;

    },
};

