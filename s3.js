const AWS = require("aws-sdk");
require('dotenv');

const s3 = new AWS.S3({
  accessKeyId: process.env.AWS_ACCESS_KEY_ID,
  secretAccessKey: process.env.AWS_SECRET_KEY,
  signatureVersion: "v4",
  region: "ca-central-1",
});

const listAllObjects = async () => {

  const params = {
    Bucket: process.env.AWS_BUCKET,
  };

  const objectKeys = await new Promise((resolve, reject) => {
    s3.listObjectsV2(params, function (err, data) {

      const keys = []
      const list = data.Contents;
      list.forEach(obj => {
        if (obj.Key) {
          keys.push(obj.Key)
        }
      });

      if (err) {
        reject(err);
      }
      resolve(keys);

    });
  });

  return objectKeys;
}

const getObjectUrl = async (key) => {
  //   console.log('process.env.AWS_ACCESS_KEY_ID: ',process.env.AWS_ACCESS_KEY_ID)
  // console.log('process.env.AWS_SECRET_KEY',process.env.AWS_SECRET_KEY)
  if (!key) return;
  try {
    const params = {
      Bucket: process.env.AWS_BUCKET,
      Key: key,
      Expires: 3600,
    };

    const url = await new Promise((resolve, reject) => {
      s3.getSignedUrl("getObject", params, function (err, url) {
        if (err) {
          reject(err);
        }
        resolve(url);
      });
    });
    return url;
  } catch (err) {
    console.log("err", err);
  }
};

const emptyS3Directory = async (dir, exceptions = []) => {
  const bucket = process.env.AWS_BUCKET;
  const listParams = {
    Bucket: bucket,
    Prefix: dir,
  };

  const listedObjects = await s3.listObjectsV2(listParams).promise();

  if (listedObjects.Contents.length === 0) return;

  const deleteParams = {
    Bucket: bucket,
    Delete: { Objects: [] },
  };

  listedObjects.Contents.forEach(({ Key }) => {
    if (!exceptions.includes(Key)) {
      deleteParams.Delete.Objects.push({ Key });
    }
  });

  await s3.deleteObjects(deleteParams).promise();

  if (listedObjects.IsTruncated) await emptyS3Directory(dir, exceptions);
};

const deleteFiles = async (files = []) => {
  const bucket = process.env.AWS_BUCKET;
  if (files.length === 0) return;
  const deleteParams = {
    Bucket: bucket,
    Delete: { Objects: [] },
  };

  files.forEach((Key) => {
    deleteParams.Delete.Objects.push({ Key });
  });
  await s3.deleteObjects(deleteParams).promise();
};

exports.s3 = s3;
exports.listAllObjects = listAllObjects;
exports.getObjectUrl = getObjectUrl;
exports.emptyS3Directory = emptyS3Directory;
exports.deleteFiles = deleteFiles;
