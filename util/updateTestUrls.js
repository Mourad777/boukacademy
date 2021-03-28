const { updateUrls } = require("./getUpdatedUrls");
const { getObjectUrl } = require("../s3");

const updateTestUrls = async (test) => {
  let fixedMultipleChoiceQuestions;
  if (test.sectionWeights.mcSection) {
    fixedMultipleChoiceQuestions = await Promise.all(
      test.multipleChoiceQuestions.map(async (q) => {
        const fixedQuestion = await updateUrls(q.question);
        return {
          ...q._doc,
          question: fixedQuestion,
        };
      })
    );
  }
  let fixedEssayQuestions;
  if (test.sectionWeights.essaySection) {
    fixedEssayQuestions = await Promise.all(
      test.essayQuestions.map(async (q) => {
        const fixedQuestion = await updateUrls(q.question);
        return {
          ...q._doc,
          question: fixedQuestion,
        };
      })
    );
  }

  let fixedSpeakingQuestions;
  if (test.sectionWeights.speakingSection) {
    fixedSpeakingQuestions = await Promise.all(
      test.speakingQuestions.map(async (q) => {
        const fixedQuestion = await updateUrls(q.question);
        const fixedQuestionAudio = q.questionAudio ? await getObjectUrl(q.questionAudio) : q.questionAudio;
        const fixedAnswerAudio = q.audio ? await getObjectUrl(q.audio) : q.audio;
        return {
          ...q._doc,
          question: fixedQuestion,
          questionAudio: fixedQuestionAudio,
          audio: fixedAnswerAudio,
        };
      })
    );
  }

  let fixedFillBlankText;
  let fixedBlanks;
  if (test.sectionWeights.fillBlankSection) {
    fixedFillBlankText = await updateUrls(test.fillInBlanksQuestions.text);
    fixedBlanks = await Promise.all(
      test.fillInBlanksQuestions.blanks.map(async (q) => {
        const fixedAudio = q.audio ? await getObjectUrl(q.audio) : q.audio;
        return {
          ...q._doc,
          audio: fixedAudio,
        };
      })
    );
  }
  const fixedReadingMaterials = await Promise.all(test.readingMaterials.map(async (material) => {
    return {
      ...material._doc,
      content: material.fileUpload
        ? (material.content ? await getObjectUrl(material.content) : material.content)
        : await updateUrls(material.content),
    };
  }));
  const fixedAudioMaterials = await Promise.all(test.audioMaterials.map(async (material) => {
    const fixedAudio = material.audio ? await getObjectUrl(material.audio) : material.audio
    return {
      ...material._doc,
      audio: fixedAudio,
    };
  }));
  const fixedVideoMaterials = await Promise.all(test.videoMaterials.map(async (material) => {
    const fixedVideo = material.video ? await getObjectUrl(material.video) : material.video
    return {
      ...material._doc,
      video: fixedVideo,
    };
  }));
  return {
    ...test._doc,
    _id: test._id.toString(),
    multipleChoiceQuestions: fixedMultipleChoiceQuestions,
    essayQuestions: fixedEssayQuestions,
    speakingQuestions: fixedSpeakingQuestions,
    fillInBlanksQuestions: { blanks: fixedBlanks, text: fixedFillBlankText },
    readingMaterials: fixedReadingMaterials,
    audioMaterials: fixedAudioMaterials,
    videoMaterials: fixedVideoMaterials,
  };
};

exports.updateTestUrls = updateTestUrls;
