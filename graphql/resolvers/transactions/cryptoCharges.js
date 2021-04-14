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

    const charges = await Charge.all({});

    const fixedCharges = charges.map(ch => {
        if (req.userId !== ch.metadata.customer_id) return null;
        return {
            address: ch.addresses.bitcoin,
            currency: 'bitcoin',
            amount: ch.pricing.bitcoin.amount,
            userId: ch.metadata.customer_id,
            courseId: ch.metadata.courseId,
            expiration: new Date(ch.expires_at).getTime()
        }
    });
    return fixedCharges.filter(item => item);

}