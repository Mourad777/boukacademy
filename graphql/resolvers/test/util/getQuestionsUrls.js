const { getKeysFromString } = require("../../../../util/extractURL");

const getQuestionsUrls = (questions) => {
    const filesToNotDelete = []
    const imageStrings = questions.map((item) => {
        if (!!item.question) {
          return item.question;
        }
      });
      const imageUrls = getKeysFromString(imageStrings);
      imageUrls.forEach((item) => {
        filesToNotDelete.push(item);
      });
      //push audio files to the list of files to not delete
      questions.forEach((item) => {
        if (!!item.questionAudio) {
          filesToNotDelete.push(item.questionAudio);
        }
        if (!!item.audio) {
          filesToNotDelete.push(item.audio);
        }
        if (item.blanks) {
          item.blanks.forEach((item) => {
            if (item.audio && item.audio !== "") {
              filesToNotDelete.push(item.audio);
            }
          });
        }
      });
    return filesToNotDelete;
}

exports.getQuestionsUrls = getQuestionsUrls;