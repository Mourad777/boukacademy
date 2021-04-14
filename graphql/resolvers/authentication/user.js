const { getObjectUrl } = require("../../../s3");
require("dotenv").config();

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
  const documents = await Promise.all(
    (user.documents || []).map(async (d) => {
      return {
        documentType: d.documentType,
        document: await getObjectUrl(d.document),
      };
    })
  );

  return {
    ...user._doc,
    _id: user._id.toString(),
    profilePicture: await getObjectUrl(user.profilePicture),
    documents,
    isPassword: !!user.password
  };
}