const Instructor = require("../models/instructor");
const { s3 } = require("../s3");

module.exports = async (req, res, next) => {
    if (!req.instructorIsAuth && !req.studentIsAuth) {
      return res.status(401).json({ message: "Not authenticated!" });
    }
    const key = req.body.key;
    const fileType = req.body.fileType;
    const fileExtension =
      (key.substring(key.lastIndexOf(".") + 1, key.length) || key || "").toLowerCase();
  
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
  }