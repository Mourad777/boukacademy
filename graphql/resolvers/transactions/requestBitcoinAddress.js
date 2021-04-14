const Student = require("../../../models/student");
const Course = require("../../../models/course");
const Transaction = require("../../../models/transaction");
const coinbase = require('coinbase-commerce-node');
const Client = coinbase.Client;
const clientObj = Client.init(process.env.COINBASE_KEY);
clientObj.setRequestTimeout(3000);
const Charge = coinbase.resources.Charge;

module.exports = async function ({ courseId }, req) {
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
            "courseId": course._id,
        },

    }
    const charge = await Charge.create(chargeData);
    const bitcoinAddress = charge.addresses.bitcoin;

    await Transaction.findOneAndDelete({
        userId: req.userId,
        courseId: courseId,
        status: "pending",
    });

    const newTransaction = new Transaction({
        userId: req.userId,
        courseId: courseId,
        paymentType: 'cryptocurrency',
        amount: charge.pricing.bitcoin.amount,
        currency: 'bitcoin',
        isSuccess: false,
        isRefund: false,
        status: 'pending',
        coinbaseChargeId: charge.id,
        address: bitcoinAddress,
        expiration: charge.expires_at,
    });

    await newTransaction.save()
    const expiration = new Date(charge.expires_at).getTime();
    return {
        currency: 'bitcoin',
        amount: charge.pricing.bitcoin.amount,
        address: bitcoinAddress,
        expiration: expiration,
    };

}