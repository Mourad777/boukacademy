const { getKeysFromString } = require("../../../../util/extractURL");

const getTestUrls = (tests) => {
    const filesToNotDelete = [];
    const addItemsToNotDeleteList = (keys) => {
        if (!keys || keys.length === 0) return;
        keys.forEach((key) => {
            if (key) filesToNotDelete.push(key);
        });
    };

    tests.forEach((test) => {
        if (test.sectionWeights.mcSection) {
            const imagesStrings = test.multipleChoiceQuestions.map(
                (item) => item.question
            );
            const imageUrls = getKeysFromString(imagesStrings);
            addItemsToNotDeleteList(imageUrls);
        }
        if (test.sectionWeights.essaySection) {
            const imagesStrings = test.essayQuestions.map((item) => item.question);
            const imageUrls = getKeysFromString(imagesStrings);
            addItemsToNotDeleteList(imageUrls);
        }
        if (test.sectionWeights.speakingSection) {
            const imagesStrings = test.speakingQuestions.map(
                (item) => item.question
            );
            const imageUrls = getKeysFromString(imagesStrings);

            addItemsToNotDeleteList(imageUrls);
            const audioQuestions = test.speakingQuestions.map(
                (item) => item.questionAudio
            );
            addItemsToNotDeleteList(audioQuestions);
            const audioAnswers = test.speakingQuestions.map((item) => item.audio);
            addItemsToNotDeleteList(audioAnswers);
        }
        if (test.sectionWeights.fillBlankSection) {
            const imagesString = test.fillInBlanksQuestions.text;
            const imageUrls = getKeysFromString(imagesString);
            addItemsToNotDeleteList(imageUrls);
            const audio = test.fillInBlanksQuestions.blanks.map(
                (item) => item.audio
            );
            addItemsToNotDeleteList(audio);
        }
    });
    return filesToNotDelete;
}

exports.getTestUrls = getTestUrls;