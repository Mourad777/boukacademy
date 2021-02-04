const { getUrlsFromString } = require("./extractURL");
const { getObjectUrl } = require("../s3");

const updateUrls = async (string) => {
  if(!string)return
  const htmlString = string.replace(/&amp;/g, "&")
  const oldUrls = getUrlsFromString(htmlString||[]).map((item) => {
    return (item||'').replace(/&amp;/g, "&");
  });
  const newUrls = await Promise.all(
    oldUrls.map(async (oldUrl) => {
      //extract the key from from presigned url, escape question mark
      const key = oldUrl.match(
        new RegExp(process.env.AWS_BASE_URL + "(.*)" + "\\?X-Amz")
      );
      if(key) return await getObjectUrl(key[1]);
    })
  );

  const updatedString = oldUrls.reduce((prev, curr, index) => {
    if (prev.includes(curr.toString())) {
      return prev.replace(curr, newUrls[index] || 'image upload failed');
    }
    return prev;
  }, htmlString);

  return updatedString
};

exports.updateUrls = updateUrls;
