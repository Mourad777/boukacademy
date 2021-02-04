const jsdom = require("jsdom");
const { JSDOM } = jsdom;
require("dotenv").config();
// const dom = new jsdom.JSDOM(`<!DOCTYPE html><p>Hello world</p>`);
// dom.window.document.querySelector("p").textContent;

const getUrlsFromString = (string = "") => {
  const urls = Array.from(
    new JSDOM(string).window.document.querySelectorAll("img")
  ).map((img) => {
    if (!img) return "";
    return img.getAttribute("src") || "";
  });
  return urls;
};

const getKeysFromString = (string) => {
  if (!string) return;
  let urls = [];
  const addToDeleteList = (str) => {
    Array.from(new JSDOM(str).window.document.querySelectorAll("img")).forEach(
      (img) => {
        const key = (img.getAttribute("src") || "").match(
          new RegExp(process.env.AWS_BASE_URL + "(.*)" + "\\?X-Amz")
        );
        if (key) urls.push(key[1]);
      }
    );
  };

  if (Array.isArray(string)) {
    string.forEach((item) => {
      if (!item) return;
      if (item.includes(process.env.AWS_BASE_URL)) addToDeleteList(item);
    });
  } else {
    if (string.includes(process.env.AWS_BASE_URL)) addToDeleteList(string);
  }
  return urls;
};

exports.getUrlsFromString = getUrlsFromString;
exports.getKeysFromString = getKeysFromString;
