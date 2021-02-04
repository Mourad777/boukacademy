const jwt = require('jsonwebtoken');

module.exports = (req, res, next) => {
  console.log('inauthmiddleware')
  console.log('inauthmiddleware req.body: ',req.body)
  const authHeader = req.get('Authorization');
  if (!authHeader) {
    console.log('noheader')
    req.studentIsAuth = false;
    req.instructorIsAuth = false;
    req.adminIsAuth = false;
    return next();
  }
  const token = authHeader.split(' ')[1];
  let decodedToken;
  try {
    decodedToken = jwt.verify(token, process.env.SECRET);
  } catch (err) {
    req.studentIsAuth = false;
    req.instructorIsAuth = false;
    req.adminIsAuth = false;
    return next();
  }
  if (!decodedToken) {
    req.studentIsAuth = false;
    req.instructorIsAuth = false;
    req.adminIsAuth = false;
    return next();
  }

  if(decodedToken.studentId) {
    req.userId = decodedToken.studentId
    req.studentIsAuth = true
  }
  if(decodedToken.instructorId) {
    req.userId = decodedToken.instructorId
    req.instructorIsAuth = true
  }
  if(decodedToken.adminId) {
    req.userId = decodedToken.adminId
    req.adminIsAuth = true
  }
  next();
};
