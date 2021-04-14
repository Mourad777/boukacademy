const Instructor = require("../../../models/instructor");
const { getObjectUrl } = require("../../../s3");
require("dotenv").config();

module.exports = {
  instructors: async function ({ }, req) {
    if (!req.instructorIsAuth) {
      const error = new Error("Not authorized!");
      error.code = 403;
      throw error;
    }
    const instructors = await Instructor.find().populate("coursesTeaching");
    const isAdmin = instructors.findIndex(inst=>inst._id.toString() === req.userId.toString() && inst.admin) > -1

    const fixedDocs = await Promise.all(instructors.map(async(inst) => {
      const documents = await Promise.all(
        inst.documents.map(async (d) => {
          return {
            documentType: d.documentType,
            document: await getObjectUrl(d.document),
          };
        })
      );
      return { 
        ...inst._doc, 
        _id: inst._id.toString(), 
        profilePicture:await getObjectUrl(inst.profilePicture),
        dob:isAdmin ? inst.dob : "",
        lastLogin:isAdmin ? inst.lastLogin : "",
        documents:isAdmin ? documents : [],
      };
    }));

    return fixedDocs;
  },
};