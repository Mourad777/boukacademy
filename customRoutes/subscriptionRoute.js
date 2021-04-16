//attach a subscription object to user to enable the
//reception of notifications
module.exports = async (req, res) => {
    const subscription = req.body;
    let userType;
    if (req.instructorIsAuth) {
        userType = 'instructor'
    }
    if (req.studentIsAuth) {
        userType = 'student'
    }
    if (req.userId) {
        const user = await require(`./models/${userType}`).findById(req.userId)
        user.notificationSubscription = subscription
        await user.save()
    }
    res.status(201).json({})
}