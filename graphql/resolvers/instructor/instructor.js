const Instructor = require("../../../models/instructor");
require("dotenv").config();

module.exports = {
  instructors: async function ({},req) {
    if (!req.instructorIsAuth) {
      const error = new Error("Not authorized!");
      error.code = 403;
      throw error;
    }
    const instructors = await Instructor.find().populate("coursesTeaching");
    const fixedDocs = instructors.map((item) => {
      return { ...item._doc, _id: item._id.toString() };
    });

    return fixedDocs;
  },
};