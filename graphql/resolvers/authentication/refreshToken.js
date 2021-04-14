require("dotenv").config();
const Configuration = require("../../../models/configuration");
const { createToken } = require("./util");

module.exports = async function ({ }, req) {
    let userType;
    if (req.instructorIsAuth) userType = "instructor";
    if (req.studentIsAuth) userType = "student";

    if (!userType) {
        const error = new Error("Session expired must login again");
        error.code = 401;
        throw error;
    }

    const user = await require(`../../../models/${userType}`).findById(
        req.userId
    );
    if (!user) {
        const error = new Error("No user found");
        error.code = 401;
        throw error;
    }

    //check user last login and compare it to the time limit for refresh tokens
    const refreshTokenLimit = process.env.SESSION_REFRESH_TIME_LIMIT * 1000;
    const lastTimeUserLoggedin = new Date(user.lastLogin).getTime();

    if (Date.now() > lastTimeUserLoggedin + refreshTokenLimit) {
        return {
            token: "expired",
            expiresIn: "same",
        };
    }
    const config = await Configuration.findOne({
        user: user._id,
    });
    //if the user decides to stay logged in than refresh time limit will be set to a long time, such as a week
    
    const expirationTime = config.isStayLoggedIn ? process.env.LONG_SESSION_REFRESH_TIME_LIMIT : process.env.SESSION_EXPIRATION_TIME
    const token = createToken(userType, user._id, user.email, expirationTime);

    return {
        token: token,
        expiresIn: expirationTime,
    };
}