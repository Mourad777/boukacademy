const { s3 } = require("../s3");

module.exports = (req, res, next) => {
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
}