const { getObjectUrl } = require("../s3");

module.exports = async (req, res, next) => {
    if (!req.instructorIsAuth && !req.studentIsAuth) {
        return res.status(401).json({ message: "Not authenticated!" });
    }
    const key = req.body.key;
    const url = await getObjectUrl(key);
    res.send(url);
}