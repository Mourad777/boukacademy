const { clearHash } = require("../util/cache");
const Message = require("../models/message");
const Notification = require("../models/notification");
const Course = require("../models/course");
const Student = require("../models/student");
const Instructor = require("../models/instructor");
const Configuration = require("../models/configuration");
const { validateOfficehour } = require("./validate-officehour");
const redis = require("redis");
const { getObjectUrl } = require("../s3");
const client = redis.createClient(process.env.REDIS_URL);
const io = require("../socket");

//important notes 
//the whole point of storing the user id with the socket id
//is to have a private channel for 2 users to communicate
//with eachother

const onNotifyOfDocUpdate = (socket) => {
  socket.on("notifyOfDocUpdate", async (data) => {
    io.getIO().emit(data.notificationType, {
      userType: data.userType,
      userId: data.userId,
      testId: data.testId,
      courseId: data.course,
      action: data.action,
      message: data.message,
    });
  });
};

const onLoggedIn = (socket) => {
  socket.on("loggedIn", async (data) => {
    client.get(`user[${data.user}]`, async (err, socketId) => {
      client.set(`user[${data.user}]`, socketId ? socketId : socket.id);
    });
    const previousRoom = Object.keys(socket.rooms)[1];
    socket.leave(previousRoom);
    socket.join(socket.id);
    //update active user ui
    client.get("activeUsers", function (err, value) {
      const parsedActiveUsers = JSON.parse(value) || [];
      //check to see if user is not already in array
      if (!parsedActiveUsers.includes(data.user)) {
        const updatedActiveUsers = [...parsedActiveUsers, data.user];
        client.set("activeUsers", JSON.stringify(updatedActiveUsers));
        // socket.emit("activeUsers", parsedActiveUsers); //emit to contacts and chat component
        io.getIO().emit("activeUsers", updatedActiveUsers);
      }
    });
  });
};

//called when user moves mouse or types on screen (any activity)
const onActive = (socket) => {
  socket.on("active", async (data) => {
    let userType;
    if (socket.instructorIsAuth) userType = "instructor";
    if (socket.studentIsAuth) userType = "student";
    //this function has a timeout that will automatically remove
    //the user from redis unless loggedIn is called before the
    //timer expires
    // const idleTimeout = .5 * 1000 * 60 // 30 sec
    const user = await require(`../models/${userType}`).findById(
      socket.userId.toString().trim()
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

    if (config.isHideActiveStatus) {
      return;
    }

    client.get("activeUsers", function (err, value) {
      const parsedActiveUsers = JSON.parse(value) || [];
      //check to see if user is not already in array
      if (!parsedActiveUsers.includes(data.user)) {
        const updatedActiveUsers = [...parsedActiveUsers, data.user];
        client.set("activeUsers", JSON.stringify(updatedActiveUsers));
        // socket.emit("activeUsers", parsedActiveUsers); //emit to contacts and chat component
        io.getIO().emit("activeUsers", updatedActiveUsers);
      }
    });
  });
};

//called when a user is idle
const onIdle = (socket) => {
  socket.on("idle", async (data) => {
    client.get("activeUsers", function (err, value) {
      const user = socket.userId;
      const parsedActiveUsers = JSON.parse(value) || [];
      const index = parsedActiveUsers.indexOf(user);
      if (index > -1) {
        //removing active user
        parsedActiveUsers.splice(index, 1);
        client.set(
          "activeUsers",
          JSON.stringify(parsedActiveUsers),
          (err, value) => {
            client.get("activeUsers", function (err, data) {
              const parsedActiveUsers = JSON.parse(data) || [];
              io.getIO().emit("activeUsers", parsedActiveUsers);
            });
          }
        );
      }
    });
  });
};

const onJoin = (socket) => {
  socket.on("join", async (data) => {
    const recipient = data.recipient;
    const dmRoom = [recipient._id, socket.userId].sort().join("");

    //leave previous room
    const previousRoom = Object.keys(socket.rooms)[1];
    socket.leave(previousRoom);
    //join new room
    socket.join(dmRoom);

    //get timestamp for when office hour finishes
    //set a timeout to leave the room

    const retrievedMessages = await Message.find({
      $or: [
        { type: "chat", sender: recipient._id, recipient: socket.userId },
        { type: "chat", sender: socket.userId, recipient: recipient._id },
      ],
    })
      .sort({ createdAt: -1 })
      .limit(10);
    // .cache({ key: dmRoom });

    if (retrievedMessages) {
      const fixedMessages = await Promise.all(
        retrievedMessages.map(async (msg) => {
          return {
            sender: msg.sender,
            content: msg.content,
            file: msg.file ? await getObjectUrl(msg.file) : "",
          };
        })
      );

      // Send the last messages to the user.

      // Send info on who is online
      client.get("activeUsers", function (err, value) {
        const parsedActiveUsers = JSON.parse(value) || [];
        //check to see if user is not already in array
        socket.emit("init", {
          messages: fixedMessages,
          activeUsers: parsedActiveUsers,
        }); //emit to chat component
      });
    }
    // Listen to connected users for a new message.
  });
};

const onInitializeContacts = (socket) => {
  socket.on("initializeContacts", async (data) => {
    client.get("activeUsers", function (err, value) {
      const parsedActiveUsers = JSON.parse(value) || [];
      //check to see if user is not already in array
      io.getIO().emit("activeUsers", parsedActiveUsers);
    });
  });
};

//leaving chat room
const onLeave = (socket) => {
  socket.on("leave", async (data) => {
    const recipient = data.recipient;
    const dmRoom = [recipient._id, socket.userId].sort().join("");
    socket.leave(dmRoom);
  });
};

const onMessage = (socket) => {
  socket.on("message", async (msg) => {
    const userType = require(`../models/${msg.userType}`);
    if(!msg.content && !msg.file){
      return
    }
    const user = await userType.findById(socket.userId);
    if (!user) {
      const error = new Error("No user found");
      error.code = 401;
      throw error;
    }

    const course = await Course.findById(msg.course);
    if (!course) {
      const error = new Error("No course found!");
      error.code = 404;
      throw error;
    }
    //block notification if student not enrolled
    const studentRecipient = await Student.findById(msg.recipient._id);
    if (
      studentRecipient &&
      !(studentRecipient || {}).coursesEnrolled.includes(msg.course.toString())
    ) {
      const error = new Error("Student not enrolled in course!");
      error.code = 404;
      throw error;
    }

    //check if communication is between student and instructor
    const studentIsSender = socket.studentIsAuth;
    const instructorIsSender = socket.instructorIsAuth;
    let commStudentInstructor;
    let instructor;
    let student;
    if (studentIsSender) {
      instructor = await Instructor.findById(msg.recipient._id);
      student = await Student.findById(socket.userId);
      if (instructor) commStudentInstructor = true;
    }
    if (instructorIsSender) {
      student = await Student.findById(msg.recipient._id);
      instructor = await Instructor.findById(socket.userId);
      if (student) commStudentInstructor = true;
    }

    const config = await Configuration.findOne({
      user: course.courseInstructor,
    });
    if (!config) {
      const error = new Error("No configuration found!");
      error.code = 404;
      throw error;
    }
    const chatAlwaysAllowed = config.isChatAllowedOutsideOfficehours;
    if (commStudentInstructor) {
      const isValid = chatAlwaysAllowed
        ? true
        : validateOfficehour(course, instructor, student);
      if (!isValid) return;
    }
    const dmRoom = [socket.userId, msg.recipient._id].sort().join("");
    // Create a message with the content and the name of the user.
    const message = new Message({
      content: msg.content,
      sender: socket.userId,
      type: "chat",
      // group:mongoose.Types.ObjectId(),
      recipient: msg.recipient,
      course: msg.course,
      file:msg.file ? msg.file : '',
    });

    // Save the message to the database.
    const newMessage = await message.save();

    clearHash(dmRoom); //need to clear or else cache will not have updated messages
    //do not want to to have more than 1 chat notification between 2 specific users
    const foundNotificationsByToRemove = await Notification.findOneAndRemove(
      {
        fromUser: socket.userId,
        toSpecificUser: msg.recipient._id,
        documentType: "chat",
      },
      null,
      async () => {
        const notification = new Notification({
          toUserType: "unique",
          fromUser: socket.userId,
          toSpecificUser: msg.recipient._id,
          avatar: user.profilePicture,
          senderFirstName: user.firstName,
          senderLastName: user.lastName,
          content: [(msg.content || "").slice(0, 20) + "..."],
          documentType: "chat",
          documentId: newMessage._id,
          course: msg.course,
        });

        const newNotification = await notification.save();
        //check if user is in chat room before pushing message
        // Notify specific user about a new message inside the chatroom.
        socket.to(dmRoom).emit("push", { ...msg, file:msg.file ? await getObjectUrl(msg.file) : '', sender: socket.userId });
        // Notify specific user about a new message if not in the chatroom but selected a course.

        //check to see if recipient accepts chat notifications
        const recipientConfig = await Configuration.findOne({
          user: msg.recipient._id,
        });
        if (!recipientConfig) {
          const error = new Error("No chat recipient config found");
          error.code = 401;
          throw error;
        }
        if (!recipientConfig.isChatNotifications) return;
        client.get(`user[${msg.recipient._id}]`, async (err, userData) => {
          if (userData) {
            //check if already in chat room, if thats the case do not emit
            const sender = {
              _id: socket.userId,
              firstName: user.firstName,
              lastName: user.lastName,
              avatar: await getObjectUrl(user.profilePicture),
              type: msg.userType,
            };
            const socketId = userData;
            socket.to(socketId).emit("alert", {
              ...msg,
              _id: newNotification._id,
              sender: sender,
              type: "chat",
              course: course.courseName,
              courseId: msg.course,
              file:msg.file,
            });
          }
        });
      }
    );
  });
};

const onLogout = (socket) => {
  socket.on("loggedOut", function () {
    //Each socket also fires a special disconnect event:
    //get user from token
    const user = socket.userId;

    client.get("activeUsers", function (err, value) {
      const parsedActiveUsers = JSON.parse(value) || [];
      //check to see if user is in array
      // const updatedActiveUsers = [...parsedActiveUsers, user];      del

      const index = parsedActiveUsers.indexOf(user);
      if (index > -1) {
        parsedActiveUsers.splice(index, 1);
        client.set(
          "activeUsers",
          JSON.stringify(parsedActiveUsers),
          (err, value) => {
            //update active users
            client.get("activeUsers", function (err, data) {
              const parsedActiveUsers = JSON.parse(data) || [];
              //check to see if user is not already in array
              // socket.emit("updateActiveUsers", parsedActiveUsers);
              // socket.emit("activeUsers", parsedActiveUsers); //emit to contacts and chat component
              io.getIO().emit("activeUsers", parsedActiveUsers);
            });
          }
        );
      }
    });

    //remove user from redis
    try {
      if (user) client.del(`user[${user}]`);
    } catch (e) {
      console.log("error removing user from redis upon logging out");
    }
    socket.leave(socket.handshake.query.token);
  });
};

const onReconnect = (socket) => {
  const user = socket.userId;
  // client.set(`user[${user}]`, socket.id);
  socket.on("reconnect", function () {
    //Each socket also fires a special disconnect event:
    console.log("reconnecting", socket.id);
  });
};

const onDisconnect = (socket) => {
  const user = socket.userId;
  socket.on("disconnect", function () {
    console.log("disconnecting", socket.id);
    try {
      // if (user) client.del(`user[${user}]`);
    } catch (e) {
      console.log("error removing user from redis upon disconnect");
    }
    //remove user from redis
  });
};

exports.onNotifyOfDocUpdate = onNotifyOfDocUpdate;
exports.onLoggedIn = onLoggedIn;
exports.onMessage = onMessage;
exports.onJoin = onJoin;
exports.onActive = onActive;
exports.onIdle = onIdle;
exports.onInitializeContacts = onInitializeContacts;
exports.onLeave = onLeave;
exports.onLogout = onLogout;
exports.onDisconnect = onDisconnect;
exports.onReconnect = onReconnect;
