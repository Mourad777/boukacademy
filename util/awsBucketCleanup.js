const { listAllObjects, deleteFiles } = require('../s3');
const {getAllKeys} = require('./getAllKeys')

const bucketCleanup =async () => {
    const mongoDBKeys = await getAllKeys();
    const awsBucketKeys = await listAllObjects();
    // console.log('mongoDBKeys',mongoDBKeys);
    // console.log('awsBucketKeys',awsBucketKeys);

    console.log('mongoDBKeys.length',mongoDBKeys.length);
    console.log('awsBucketKeys.length',awsBucketKeys.length)


    //get keys of files that are not being used

    const filesToDelete = awsBucketKeys
    .filter((item) => {
        //check urls in question documents to make sure the files arn't used elsewhere
        if (!mongoDBKeys.includes(item)) return item;
        return null;
    })
    .filter((i) => i);

    console.log('filesToDelete',filesToDelete)
    deleteFiles(filesToDelete);

}

exports.bucketCleanup = bucketCleanup;