const momentTZ = require("moment-timezone");

const getReadableDate = (date, language) => {
    const readableDate = date
      ? momentTZ(date).locale(language).format("MMMM DD YYYY HH:mm z")
      : "";
    return readableDate;
  };

  exports.getReadableDate = getReadableDate;
