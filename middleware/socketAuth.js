const jwt = require("jsonwebtoken");
const redis = require("redis");
const client = redis.createClient(process.env.REDIS_URL);

module.exports = (socket, next) => {
  if (socket.handshake.query.token !== 'null') {
    let userId;
    if (socket.handshake.query && socket.handshake.query.token) {
      let decodedToken;
      try {
        decodedToken = jwt.verify(
          socket.handshake.query.token,
          process.env.SECRET
        );
        if (decodedToken.studentId) {
          userId = decodedToken.studentId;
          socket.studentIsAuth = true;
          socket.adminIsAuth = false;
          socket.instructorIsAuth = false;
        }
        if (decodedToken.instructorId) {
          userId = decodedToken.instructorId;
          socket.instructorIsAuth = true;
          socket.studentIsAuth = false;
          socket.adminIsAuth = false;
        }
        if (decodedToken.adminId) {
          userId = decodedToken.adminId;
          socket.adminIsAuth = true;
          socket.studentIsAuth = false;
          socket.instructorIsAuth = false;
        }
      } catch (err) {
        console.log("socket auth err");
        socket.adminIsAuth = false;
        socket.studentIsAuth = false;
        socket.instructorIsAuth = false;
        next();
      }
      if (!decodedToken) {
        socket.adminIsAuth = false;
        socket.studentIsAuth = false;
        socket.instructorIsAuth = false;
      }
      socket.userId = userId;

    } else {
      next(new Error("Authentication error"));
    }
  }
  next();
};
