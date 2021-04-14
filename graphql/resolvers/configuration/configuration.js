const Configuration = require("../../../models/configuration");
const Course = require("../../../models/course");
const Instructor = require("../../../models/instructor");

module.exports = async function ({ }, req) {
        let userType;
        if (req.instructorIsAuth) userType = "instructor";
        if (req.studentIsAuth) userType = "student";
        const user = await require(`../../../models/${userType}`).findById(
            req.userId
        );

        if (!user) {
            const error = new Error("No account found with the provided token");
            error.code = 401;
            throw error;
        }

        const config = await Configuration.findById(user.configuration);
        if (!config) {
            const error = new Error("No configuration found");
            error.code = 401;
            throw error;
        }
        let adjustedConfig;
        if (user.admin) {
            adjustedConfig = config;
        } else {
            //find admin config and merge the properties with user config
            const admin = await Instructor.findOne({ admin: true }).populate(
                "configuration"
            );

            const courses = await Course.find();

            // const coursesThatAllowOfficehoursAnytime = [];

            const coursesThatAllowOfficehoursAnytime = await Promise.all(
                courses
                    .map(async (c) => {
                        const instructorConfig = await Configuration.findOne({
                            user: c.courseInstructor,
                        });

                        if (instructorConfig.isChatAllowedOutsideOfficehours) {
                            return c._id;
                        }
                    })
                    .filter((i) => i)
            );

            const adminSettings = admin._doc.configuration;
            adjustedConfig = {
                ...adminSettings._doc,
                ...config._doc,
                blockedStudents: [],
                blockedInstructors: [],
                coursesIsChatAllowedOutsideOfficehours: (userType = "student"
                    ? coursesThatAllowOfficehoursAnytime
                    : null),
            };
        }
        return adjustedConfig;
    }