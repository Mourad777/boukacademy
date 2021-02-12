const express = require("express");
const cluster = require("cluster");
const net = require("net");
const sio_redis = require("socket.io-redis");
const farmhash = require("farmhash");
const cors = require("cors");
const multer = require("multer");
const bodyParser = require("body-parser");
const port = process.env.PORT || 8080;
const num_processes = require("os").cpus().length;
const app = express();
const redis = require("redis");
const client = redis.createClient(process.env.REDIS_URL);
const path = require("path");
const Instructor = require("./models/instructor");
const { i18n } = require("./i18n.config");
const moment = require("moment");
const momentTZ = require("moment-timezone");
//24759
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
// app.use(cors())
// Here you might use middleware, attach routes, etc.
//console.log
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

const multerUpload = multer().any();

app.use(multerUpload);
app.use(bodyParser.json());

var corsOptions = {
  origin: "https://learn-f648e.web.app",
  optionsSuccessStatus: 200, // some legacy browsers (IE11, various SmartTVs) choke on 204
};

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
app.use(auth);

// const buildXMLTagSet = (tagset: Record<string, string>): string => {
//   const tags = Object.entries(tagset).reduce(
//     (acc, [key, value]) => `${acc}<Tag><Key>${key}</Key><Value>${value}</Value></Tag>`,
//     '',
//   );

//   return `<Tagging><TagSet>${tags}</TagSet></Tagging>`;
// };

app.put("/upload", async (req, res, next) => {
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
  if (!acceptedExtensions.includes(fileExtension)) {
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
    Bucket: "e-learn-bucket",
    Fields: {
      key: key,
    },
    Expires: 300, //seconds
    Conditions: [
      ["content-length-range", 0, maxFileSize], //100mb
      // ["starts-with", "$x-amz-meta-filetype", ""],
      // ["starts-with", "$x-amz-tagging", ""],
      ["starts-with", "$tagging", ""],
      // ['starts-with', '$Content-Type', 'image/'],
    ],
    // ContentType:'image'
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
      // resolve(data);
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
    Bucket: "e-learn-bucket",
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
  .then((result) => {
    console.log("connected to mongoose");
    // Don't expose our internal server to the outside.
    const expressServer = app.listen(port);
    const io = require("./socket").init(expressServer);

    // Tell Socket.IO to use the redis adapter. By default, the redis
    // server is assumed to be on localhost:6379. You don't have to
    // specify them explicitly unless you want to change them.
    // io.adapter(sio_redis( REDIS_URL));
    // Here you might use Socket.IO middleware for authorization etc.
    io.use(socketAuth);
    io.on("connection", function (socket) {
      console.log("New client connected");
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
      // socket.emit("data", "connected to worker: " + cluster.worker.id);
    });
    // Listen to messages sent from the master. Ignore everything else.
    // process.on("message", function (message, connection) {
    //   if (message !== "sticky-session:connection") {
    //     return;
    //   }
    //   // Emulate a connection event on the server by emitting the
    //   // event with the connection the master sent us.
    // });
  });
