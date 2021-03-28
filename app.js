const express = require("express");
const multer = require("multer");
const bodyParser = require("body-parser");
const port = process.env.PORT || 8080;
const app = express();
// const redis = require("redis");
// const client = redis.createClient(process.env.REDIS_URL);
const path = require("path");
const Instructor = require("./models/instructor");
const Student = require("./models/student");
const webpush = require('web-push')
const publicVapidKey = process.env.PUBLIC_VAPID_KEY
const privateVapidKey = process.env.PRIVATE_VAPID_KEY

const Configuration = require('./models/configuration')

const {
  onNotifyOfDocUpdate,
  onLoggedIn,
  onMessage,
  onJoin,
  onLeave,
  onInitializeContacts,
  onActive,
  onIdle,
  onLogout,
  onDisconnect,
  onReconnect,
} = require("./sockets/listeners");

const graphqlSchema = require("./graphql/schemas/index");
const graphqlResolver = require("./graphql/resolvers/index");
const graphqlHttp = require("express-graphql");
const auth = require("./middleware/auth");
const socketAuth = require("./middleware/socketAuth");
const { buildSchema } = require("graphql");
const schema = buildSchema(graphqlSchema);
require("dotenv").config();
// app.use(cors());
const { s3, getObjectUrl } = require("./s3");
require("./util/cache");
require("./util/compareArrays");
const mongoose = require("mongoose");
const student = require("./models/student");

const multerUpload = multer().any();

app.use(multerUpload);
app.use(bodyParser.json());


app.use((req, res, next) => {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader(
    "Access-Control-Allow-Methods",
    "OPTIONS, GET, POST, PUT, PATCH, DELETE"
  );
  res.setHeader("Access-Control-Allow-Headers", "Content-Type, Authorization");
  if (req.method === "OPTIONS") {
    return res.sendStatus(200);
  }
  next();
});
// //fixes mime type service worker issue in firefox and edge
// app.get("/custom-service-worker.js", (req, res) => {
//   res.sendFile(path.resolve(__dirname, "public", "custom-service-worker.js"));
// });
// app.get("*", function response(req, res) {
//   res.sendFile(path.join(__dirname, "public", "index.html"));
// });
app.use(auth);

webpush.setVapidDetails('mailto:mourad777b@gmail.com', publicVapidKey, privateVapidKey)

app.post('/subscribe', async (req, res) => {
  const subscription = req.body
  console.log('push recieved')
  // console.log('subscription', subscription)
  // console.log('req.userId', req.userId)
  let userType;
  if (req.instructorIsAuth) {
    userType = 'instructor'
  }
  if (req.studentIsAuth) {
    userType = 'student'
  }
  if (req.userId) {
    const user = await require(`./models/${userType}`).findById(req.userId)
    user.notificationSubscription = subscription
    await user.save()
  }
  res.status(201).json({})
})

app.put("/upload", async (req, res, next) => {
  console.log('!req.instructorIsAuth && !req.studentIsAuth',!req.instructorIsAuth && !req.studentIsAuth)
  if (!req.instructorIsAuth && !req.studentIsAuth) {
    return res.status(401).json({ message: "Not authenticated!" });
  }
  const key = req.body.key;
  const fileType = req.body.fileType;
  const fileExtension =
    key.substring(key.lastIndexOf(".") + 1, key.length) || key;

  const acceptedExtensions = [
    "jpeg",
    "jfif",
    "jpg",
    "mp3",
    "wav",
    "wma",
    "pdf",
    "doc",
    "docx",
    "mp4",
    "avi",
    "mov",
    "flv",
    "mkv",
    "webm",
  ];

  const capitializedExtenstions = acceptedExtensions.map(ext=>ext.toUpperCase());

  const allExtensions = [...acceptedExtensions,...capitializedExtenstions];
  console.log('allExtensions',allExtensions)
  if (!allExtensions.includes(fileExtension)) {
    return res.status(401).json({ message: "File type not allowed" });
  }

  const admin = await Instructor.findOne({ admin: true }).populate(
    "configuration"
  );

  const adminSettings = admin._doc.configuration;
  const studentMaxFileSize = adminSettings.studentFileSizeLimit;
  const instructorMaxFileSize = adminSettings.instructorFileSizeLimit;
  let maxFileSize;
  if (req.instructorIsAuth) maxFileSize = instructorMaxFileSize * 1000000; // 100mb
  if (req.studentIsAuth) maxFileSize = studentMaxFileSize * 1000000; // 25mb
  const params = {
    Bucket: process.env.AWS_BUCKET,
    Fields: {
      key: key,
    },
    Expires: 300, //seconds
    Conditions: [
      ["content-length-range", 0, maxFileSize], //100mb
      ["starts-with", "$tagging", ""],
    ],
  };
  const tagKey = 'fileType';
  const tagValue = fileType;
  s3.createPresignedPost(params, (err, data) => {
    res.send({
      uploaded: 1,
      presignedUrl: {
        ...data,
        fields: {
          ...data.fields,
          tagging: `<Tagging><TagSet><Tag><Key>${tagKey}</Key><Value>${tagValue}</Value></Tag></TagSet></Tagging>`,
        },
      },
    });
  });
});

app.put("/get-file", async (req, res, next) => {
  if (!req.instructorIsAuth && !req.studentIsAuth) {
    return res.status(401).json({ message: "Not authenticated!" });
  }
  const key = req.body.key;
  const url = await getObjectUrl(key);
  res.send(url);
});

app.put("/delete-files", (req, res, next) => {
  let object;
  if (Array.isArray(req.body.url)) {
    object = req.body.url.map((url) => {
      return {
        Key: url,
      };
    });
  } else {
    object = [
      {
        Key: req.body.url,
      },
    ];
  }
  const params = {
    Bucket: process.env.AWS_BUCKET,
    Delete: {
      Objects: object,
    },
  };
  s3.deleteObjects(params, function (err, data) {
    if (err) {
      console.log("error deleting objects", err, err.stack);
      res.status(400).send(err);
    } else {
      console.log("successfully deleted objects data: ", data);
      res.status(200).send(data);
    }
  });
});

app.use(express.static(path.join("public")));

app.use(
  "/graphql",
  graphqlHttp({
    schema: schema,
    rootValue: graphqlResolver,
    graphiql: true,
    customFormatErrorFn(err) {
      if (!err.originalError) {
        return err;
      }
      const data = err.originalError.data;
      const message = err.message || "An error occurred.";
      const code = err.originalError.code || 500;
      return { message: message, status: code, data: data };
    },
  })
);

app.use((req, res, next) => {
  res.sendFile(path.resolve(__dirname, "public", "index.html"));
});

mongoose
  .connect(
    `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASSWORD}@cluster0-lfeej.mongodb.net/${process.env.DB_NAME}`,
    {
      useNewUrlParser: true,
      useUnifiedTopology: true,
      useFindAndModify: false,
      useCreateIndex: true,
    }
  )
  .then(async (result) => {

    // await Configuration.updateMany({},{isChatPushNotifications:true},{multi:true})




    // const admin = await Instructor.findOne({ admin: true });
    // const instructors = await Instructor.find({ admin: false });
    // const students = await Student.find()

    // const adminId = admin._id;
    // const instructorIds = instructors.map(ins => ins._id);
    // const studentIds = students.map(stu => stu._id);
    // console.log('adminId: ', adminId._id);
    // console.log('instructorIds :', instructorIds);
    // console.log('studentIds', studentIds)




    // await Configuration.updateMany({ user: adminId }, {
    //   isChatPushNotifications: true,

    //   isAssignmentPushNotifications: true,
    //   isTestPushNotifications: true,

    //   isEnrollPushNotifications: true,
    //   isDropCoursePushNotifications: true,

    //   isNewInstructorAccountPushNotifications:true,
    //   isNewStudentAccountPushNotifications:true,

    //   isSendTestPushNotifications: true,
    //   isSendLessonPushNotifications: true,
    //   isSendAssignmentPushNotifications: true,
    //   isSendCoursePushNotifications: true,
    //   isStayLoggedIn:true,

    // }, { multi: true });

    // await Promise.all(
    //   instructorIds.map(async instId => {
    //     await Configuration.updateMany({ user: instId }, {

    //       isSendTestPushNotifications: true,
    //       isSendLessonPushNotifications: true,
    //       isSendAssignmentPushNotifications: true,
    //       isSendCoursePushNotifications: true,

    //       isAssignmentPushNotifications: true,
    //       isTestPushNotifications: true,
    //       isChatPushNotifications: true,

    //       isEnrollPushNotifications: true,
    //       isDropCoursePushNotifications: true,

    //       isStayLoggedIn:true,
    //     }, { multi: true })
    //   })
    // )

    // await Promise.all(
    //   studentIds.map(async stuId => {
    //     await Configuration.updateMany({ user: stuId }, {

    //       isCoursePushNotifications: true,
    //       isLessonPushNotifications: true,
    //       isAssignmentPushNotifications: true,
    //       isTestPushNotifications: true,
    //       isChatPushNotifications: true,

    //       isStayLoggedIn:true,

    //     }, { multi: true })
    //   })
    // )

    // isCoursePushNotifications
    // isLessonPushNotifications
    // isAssignmentPushNotifications
    // isTestPushNotifications
    // isChatPushNotifications

    // isEnrollPushNotifications
    // isDropCoursePushNotifications

    // isNewInstructorAccountPushNotifications
    // isNewStudentAccountPushNotifications


    // isSendTestPushNotifications
    // isSendLessonPushNotifications
    // isSendAssignmentPushNotifications
    // isSendCoursePushNotifications
    console.log("connected to mongoose");

    const expressServer = app.listen(port);
    const io = require("./socket").init(expressServer);

    io.use(socketAuth);
    io.on("connection", function (socket) {
      // console.log("New client connected");
      onNotifyOfDocUpdate(socket);
      onLoggedIn(socket); //fired when user logs in
      onActive(socket); //fired when user activity
      onIdle(socket); //fired when user inactive
      onJoin(socket); //fired when user selects chat user
      onLeave(socket); //fired when user leaves chat room
      onInitializeContacts(socket);
      onMessage(socket); //fired when user sends message to other user
      onLogout(socket); //fired when user logs out
      onDisconnect(socket);
      onReconnect(socket);
    });
  });
