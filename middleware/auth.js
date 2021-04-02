const jwt = require('jsonwebtoken');
const Instructor = require('../models/instructor')

const { OAuth2Client } = require('google-auth-library')
const client = new OAuth2Client(process.env.GOOGLE_CLIENT_ID)

module.exports = async (req, res, next) => {
  const authHeader = req.get('Authorization');
  console.log('authHeader',authHeader)
  if (!authHeader) {
    console.log('noheader')
    req.studentIsAuth = false;
    req.instructorIsAuth = false;
    console.log('next')
    next();
    
  }





  const token = (authHeader||"").split(' ')[1];
  let userType, id, errorMessage;
  if (!token || token === "undefined") {
    console.log('no token')
    req.studentIsAuth = false;
    req.instructorIsAuth = false;
    console.log('no token so next')
    next();
  }


  let decodedToken;
  try {
    decodedToken = jwt.verify(token, process.env.SECRET);
  } catch (err) {
    // console.log('err', err)
    // return res.status(403).send(error);

  }


  if (decodedToken) {
    if (!decodedToken) {
      req.studentIsAuth = false;
      req.instructorIsAuth = false;
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
      if(!user){
        next()
      }
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
        // console.log('authenticated!')
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
    }
    console.log('next')
    next();

  } else {

    let ticket;
    console.log('process.env.GOOGLE_CLIENT_ID',process.env.GOOGLE_CLIENT_ID);
    console.log('token',token)
    try {
      console.log('trying to get ticket')
      ticket = await client.verifyIdToken({
        idToken: token,
        audience: process.env.GOOGLE_CLIENT_ID,
      });
      console.log('ticket...: ',ticket)
    } catch (e) {
      console.log('failed to get google ticket')
    }
    if (ticket) {
      try {
        const payload = ticket.getPayload()
        req.googleUser = payload
        req.isGoogleAuth = true
        console.log('payload: ',payload)
        console.log('next')
        next();
        
      } catch (e) {
        console.log('e', e)
      }
    }
    // else {
    //   return next()
    // }
    console.log('isticket',!!ticket)
    console.log('no token nor ticket')
    // console.log('next')
    // next();
    

  }
};
