const { updateUrls } = require("./getUpdatedUrls");
const { getObjectUrl } = require("../s3");

const updateResultUrls = async (result) => {
  const fixedEssaySectionAnswers = await Promise.all((result.essaySection.answers||[]).map( async ans=>{
    return {
        ...ans._doc,
        answer: await updateUrls(ans.answer),
        instructorCorrection: await updateUrls(ans.instructorCorrection),
    }
  }));
  const fixedSpeakingSectionAnswers = await Promise.all((result.speakingSection.answers||[]).map( async ans=>{
      return {
          ...ans._doc,
          answer: ans.answer ? await getObjectUrl(ans.answer) : ans.answer,
          feedbackAudio:ans.feedbackAudio ?  await getObjectUrl(ans.feedbackAudio) : ans.feedbackAudio,
      }
  }));
  return {
    ...result._doc,
    _id: result._id.toString(),
    essaySection: {...result.essaySection, answers:fixedEssaySectionAnswers},
    speakingSection: {...result.speakingSection,answers:fixedSpeakingSectionAnswers},
  };
};

exports.updateResultUrls = updateResultUrls;
