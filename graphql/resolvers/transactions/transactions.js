const Transaction = require("../../../models/transaction");

module.exports = async function ({ }, req) {
    if (!req.instructorIsAuth && !req.studentIsAuth) {
        const error = new Error("Not authenticated!");
        error.code = 403;
        throw error;
    }

    const transactions = await Transaction.find({ userId: req.userId });

    return transactions;

}