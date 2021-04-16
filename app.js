const express = require("express");
const multer = require("multer");
const port = process.env.PORT || 8080;
const app = express();
const path = require("path");
const webpush = require('web-push')
const publicVapidKey = process.env.PUBLIC_VAPID_KEY;
const privateVapidKey = process.env.PRIVATE_VAPID_KEY;
const { ToadScheduler, SimpleIntervalJob, Task } = require('toad-scheduler')
const cryptoWebhookRoute = require('./customRoutes/cryptoWebhookRoute')
const uploadRoute = require('./customRoutes/uploadRoute')
const getFileRoute = require('./customRoutes/getFileRoute')
const deleteFilesRoute = require('./customRoutes/deleteFilesRoute')
const subscriptionRoute = require('./customRoutes/subscriptionRoute')
const graphqlSchema = require("./graphql/schemas/index");
const graphqlResolver = require("./graphql/resolvers/index");
const graphqlHttp = require("express-graphql");
const auth = require("./middleware/auth");
const socketAuth = require("./middleware/socketAuth");
const { buildSchema } = require("graphql");
const schema = buildSchema(graphqlSchema);
require("dotenv").config();
require("./util/cache");
require("./util/compareArrays");
const mongoose = require("mongoose");
const { bucketCleanup } = require("./util/awsBucketCleanup");
const { clearActiveUsers } = require("./util/clearActiveUsers");
const multerUpload = multer().any();

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


app.use(multerUpload);
app.use(express.json());

app.post('/', cryptoWebhookRoute);

app.use((req, res, next) => {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader(
    "Access-Control-Allow-Methods",
    "OPTIONS, GET, POST, PUT, PATCH, DELETE"
  );
  res.setHeader("Access-Control-Allow-Headers", "Content-Type, Authorization, x-cc-webhook-signature");
  if (req.method === "OPTIONS") {
    return res.sendStatus(200);
  }
  next();
});

app.use(auth);

webpush.setVapidDetails('mailto:mourad777b@gmail.com', publicVapidKey, privateVapidKey)

app.post('/subscribe', subscriptionRoute)
app.put("/upload", uploadRoute);
app.put("/get-file", getFileRoute);
app.put("/delete-files", deleteFilesRoute);

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

//serves the front-end part of the app
//the front and back end parts of the app
//are on the same server

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
    console.log("connected to mongoose");
    const scheduler = new ToadScheduler()

    //run task every day to clear users that show they are active
    //task to run once a week to check the database for unused files

    const cleanAWSTask = new Task('clean aws files', () => {
      bucketCleanup()
      console.log('aws cleanup task')
    })
    const clearActiveUsersTask = new Task('clear active users', () => {
      clearActiveUsers()
      console.log('clear active users task')
    })
    const cleanAWSJob = new SimpleIntervalJob({ days: 7, }, cleanAWSTask)
    const clearActiveUsersJob = new SimpleIntervalJob({ hours: 24, }, clearActiveUsersTask)
    scheduler.addSimpleIntervalJob(cleanAWSJob);
    scheduler.addSimpleIntervalJob(clearActiveUsersJob);
    const expressServer = app.listen(port);
    const io = require("./socket").init(expressServer);

    io.use(socketAuth);
    io.on("connection", function (socket) {
      onNotifyOfDocUpdate(socket);
      onLoggedIn(socket); //runs when user logs in
      onActive(socket); //runs when user activity
      onIdle(socket); //runs when user inactive
      onJoin(socket); //runs when user selects chat user
      onLeave(socket); //runs when user leaves chat room
      onInitializeContacts(socket);
      onMessage(socket); //runs when user sends message to other user
      onLogout(socket); //runs when user logs out
      onDisconnect(socket);
      onReconnect(socket);
    });
  });


  // if(os.hostname().indexOf("local") === -1){
//   //if not local host
//   app.use(function(req, res, next) {
//     if ((req.get('X-Forwarded-Proto') !== 'https')) {
//       res.redirect('https://' + req.get('Host') + req.url);
//     } else
//       next();
//   });
// }

