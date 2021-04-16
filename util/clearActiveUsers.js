const redis = require("redis");
const client = redis.createClient(process.env.REDIS_URL);
const io = require("../socket");
const clearActiveUsers = () => {
    client.set(
        "activeUsers",
        JSON.stringify([]),
        (err, value) => {
          //update active users
          client.get("activeUsers", function (err, data) {
            const parsedActiveUsers = JSON.parse(data) || [];
            io.getIO().emit("activeUsers", parsedActiveUsers);
          });
        }
      );
}

exports.clearActiveUsers = clearActiveUsers;