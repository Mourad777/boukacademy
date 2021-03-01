const jwt = require('jsonwebtoken');
const Instructor = require('../models/instructor')
module.exports = async (req, res, next) => {
  const authHeader = req.get('Authorization');

  if (!authHeader) {
    console.log('noheader')
    req.studentIsAuth = false;
    req.instructorIsAuth = false;
    return next();
  }
  const token = authHeader.split(' ')[1];
  let decodedToken, userType, id, errorMessage;
  if (!token || token === "undefined") {
    console.log('no token')
    req.studentIsAuth = false;
    req.instructorIsAuth = false;
    return next();
  }
  try {
    decodedToken = jwt.verify(token, process.env.SECRET);
  } catch (err) {
    console.log('err', err)
    req.studentIsAuth = false;
    req.instructorIsAuth = false;
    return next();
  }
  if (!decodedToken) {
    req.studentIsAuth = false;
    req.instructorIsAuth = false;
    return next();
  }
  

  if (decodedToken.studentId) {
    userType = 'student'
  }
  if (decodedToken.instructorId) {
    userType = 'instructor'
  }
  try {
    if (userType === 'instructor') {
      id = decodedToken.instructorId
    }
    if (userType === 'student') {
      id = decodedToken.studentId
    }
    const user = await require(`../models/${userType}`).findById(id)
    const isAccountSuspended = user.isAccountSuspended
    const isAccountApproved = user.isAccountApproved

    const admin = await Instructor.findOne({ admin: true }).populate(
      "configuration"
    );
    const adminSettings = admin._doc.configuration;
    const isApproveStudentAccounts = adminSettings.isApproveStudentAccounts;
    const isApproveInstructorAccounts = adminSettings.isApproveInstructorAccounts;
    if (isAccountSuspended) {
      errorMessage = 'accountSuspended'
      const error = new Error("accountSuspended");
      error.code = 403;
      throw error;
    } else if (!isAccountApproved && userType === 'student' && isApproveStudentAccounts) {
      errorMessage = 'accountNotActivated'
      const error = new Error("accountNotActivated");
      error.code = 403;
      throw error;
    } else if (!isAccountApproved && userType === 'instructor' && isApproveInstructorAccounts) {
      errorMessage = 'accountNotActivated'
      const error = new Error("accountNotActivated");
      error.code = 403;
      throw error;
    }

    else {
      if (userType === 'instructor') {
        req.instructorIsAuth = true
      }
      if (userType === 'student') {
        req.studentIsAuth = true
      }
      req.userId = id
      console.log('authenticated!')
    }
  } catch (e) {
    console.log('in catch block', e)
    const error = {
      errors: [{ message: errorMessage }],
      data: {
        errors: [{ message: errorMessage }]
      }
    }
    return res.status(403).send(error);
    // return next()
  }

  next();
};
