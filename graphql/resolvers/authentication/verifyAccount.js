const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
require("dotenv").config();
const { createToken } = require("./util");

module.exports = async function ({ token, password }) {
    const decodedToken = jwt.verify(token, process.env.VERIFICATION_SECRET);
    let accountType;
    if (decodedToken.studentId) {
        accountType = 'student'
    }
    if (decodedToken.instructorId) {
        accountType = 'instructor'
    }
    const userFromId = await require(`../../../models/${accountType}`).findById(
        decodedToken[accountType + "Id"]
    );

    if (userFromId.accountVerified) {
        const error = new Error("alreadyVerified");
        error.code = 403;
        throw error;
    }

    const user = await require(`../../../models/${accountType}`).findOne({
        accountVerificationToken: token,
        accountVerificationTokenExpiration: { $gt: Date.now() },
    });


    const isEqual = await bcrypt.compare(password || "", user.password);
    if (!isEqual) {
        const error = new Error("wrongPassword");
        error.code = 403;
        throw error;
    }

    user.accountVerificationToken = null;
    user.accountVerificationTokenExpiration = null;
    user.accountVerified = true;
    user.lastLogin = new Date();
    await user.save();

    const expirationTime = process.env.LONG_SESSION_REFRESH_TIME_LIMIT;
    const loginInToken = createToken(accountType, user._id, user.email, expirationTime);

    return {
        token: loginInToken,
        userId: user._id.toString(),
        expiresIn: process.env.LONG_SESSION_REFRESH_TIME_LIMIT,
        firstName: user.firstName,
        lastName: user.lastName,
        language: user.language,
        refreshTokenExpiration:
            Date.now() + parseInt(process.env.LONG_SESSION_REFRESH_TIME_LIMIT) * 1000,
        lastLogin: user.lastLogin,
    };
}