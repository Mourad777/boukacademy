const mongoose = require("mongoose");
const redis = require("redis");
const util = require("util");
const client = redis.createClient(process.env.REDIS_URL);
client.hget = util.promisify(client.hget);
const exec = mongoose.Query.prototype.exec;

mongoose.Query.prototype.cache = function (options = {}) {
  //need to provide a key property which will be used
  //as the top value
  this.useCache = true;
  this.hashKey = JSON.stringify(options.key || "");
  return this; //makes cache a chainable function
};

mongoose.Query.prototype.exec = async function () {
  if (!this.useCache) {
    return exec.apply(this, arguments);
  }
  //assign safely copies properties from one object to another
  const key = JSON.stringify(
    Object.assign({}, this.getQuery, {
      collection: this.mongooseCollection.name,
    })
  );
  const cacheValue = await client.hget(this.hashKey || "", key);

  if (cacheValue) {
    console.log("from cache value");
    //ref to model that represents this query
    const doc = JSON.parse(cacheValue);
    return Array.isArray(doc)
      ? doc.map((d) => new this.model(d))
      : new this.model(doc);
  }
  console.log("from db");
  //whatever comes back from mongo will be stored
  //inside result
  const result = await exec.apply(this, arguments);
  client.hmset(this.hashKey, key, JSON.stringify(result), "EX", 10);
  return result;
};

module.exports = {
  clearHash(hashKey) {
    client.del(JSON.stringify(hashKey));
  },
  clearRedis() { //flush all keys except active users
    client.get("activeUsers", function(err,value){
      client.flushall();
      client.set("activeUsers",value)
    })
  },
};
