const io = require("../socket");
const Transaction = require('../models/transaction')
const Instructor = require("../models/instructor");
const Webhook = require('coinbase-commerce-node').Webhook;
const enrollRequest = require('../graphql/resolvers/course/enrollRequest')
const enrollApprove = require('../graphql/resolvers/course/enrollApprove')

module.exports = async function (req, res) {
    var event;
    try {
        event = Webhook.verifyEventBody(
            JSON.stringify(req.body),
            req.headers['x-cc-webhook-signature'],
            process.env.COIN_BASE_WEBHOOK_SECRET
        );
    } catch (error) {
        console.log('Error occured', error.message);

        return res.status(400).send('Webhook Error:' + error.message);
    }
    console.log('recieved event: ', event)
    const userId = event.data.metadata.customer_id;
    const courseId = event.data.metadata.courseId;
    const amount = event.data.pricing.bitcoin.amount
    let status, isSuccess;
    if (event.type === 'charge:created') {
        status = 'initiated'
        return;
    }
    if (event.type === 'charge:pending') {
        status = 'pending';
        isSuccess = false;
    }
    if (event.type === 'charge:confirmed' || event.type === 'charge:delayed' || event.type === 'charge:resolved') {
        status = 'paid'
        isSuccess = true;
    }

    const previousSuccessfulTransaction = await Transaction.findOne({ courseId, userId, status: 'paid' });
    if (previousSuccessfulTransaction) {
        const error = new Error("The course has already been paid for");
        error.code = 403;
        throw error;
    }

    const newTransaction = new Transaction({
        userId,
        paymentType: 'cryptocurrency',
        amount,
        currency: "bitcoin",
        courseId,
        isRefund: false,
        status,
        isSuccess,
        address: event.data.addresses.bitcoin,
        expiration: event.data.expires_at,
    })

    newTransaction.save();

    if (status === 'paid') {
        //submit enroll request or auto enroll depending on admin config

        const admin = await Instructor.findOne({ admin: true }).populate(
            "configuration"
        );
        const adminSettings = admin._doc.configuration;
        const isApproveEnrollments = adminSettings.isApproveEnrollments;

        if (isApproveEnrollments) {
            enrollRequest({ courseId, studentId: userId }, { userId })
        } else {
            enrollApprove({ courseId, studentId: userId }, { userId })
        }
    }


    io.getIO().emit("cryptoChargeEvent", {
        userId,
        event,
    });

    res.status(200).send('Signed Webhook Received: ' + event.id);
}