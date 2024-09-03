import chalk from "chalk";
import dotenv from "dotenv";
import bolt from "@slack/bolt";
import slack_web_api from "@slack/web-api";

import { search_image_bot } from "./image-search-functions.js";

const search_image = new search_image_bot();

dotenv.config();

const app = new bolt.App(
  { token: process.env.SLACK_BOT_TOKEN,
    appToken: process.env.SLACK_APP_TOKEN,
    socketMode: true,
    logLevel: "debug"
  });

app.message(/search image (.+?) (.+ ?)/i, async({say, message}) => {
  await say("searching...");
  let numberOfImages = message.text.match(/search image (.+?) (.+ ?)/i)[1] !== "none" ? message.text.match(/search image (.+?) (.+ ?)/i)[1] : 10; //optional
  const urlOrQuery = message.text.match(/search image (.+?) (.+ ?)/i)[2].replaceAll(/[<>]/g, "");
  console.log(chalk.green(`urlOrQuery: ${urlOrQuery}\nnumberOfImages: ${numberOfImages}`));

  const urlConfirmation = urlOrQuery.includes("https");

  try {
      const searchResultFromMongoDB = await search_image.findDataFromMongoDB(urlOrQuery, urlConfirmation ? "visual_search" : "searchImage");
      if(searchResultFromMongoDB.length === 0) {
        const search_result = urlConfirmation
             ? await search_image.searchImageVisually(urlOrQuery) 
             : await search_image.searchImage(urlOrQuery);
                
        if(search_result === null) {
          await say(urlConfirmation 
              ? `Sorry, it couldn't find any images with the *<${urlOrQuery}|URL>*.` 
              : `Sorry, it couldn't find any images with the *${urlOrQuery}*.`);
          return;
        } else {
          numberOfImages = numberOfImages > search_result.length ? search_result.length : numberOfImages;

          await say(urlConfirmation 
              ? `Here're related images of the *<${urlOrQuery}|URL>*.` 
              : `Here're related images of the query.`);
          for(let i = 0; i < numberOfImages; i++) {
            await say(`<${search_result[i].url}|${search_result[i].title}>`);
            await sleep(2000);
          }
          await search_image.saveDataToMongoDB(search_result, urlOrQuery, urlConfirmation ? "visual_search" : "searchImage");
        }
      } else {
        numberOfImages = numberOfImages > searchResultFromMongoDB.length ? searchResultFromMongoDB.length : numberOfImages;

        await say(urlConfirmation
            ? `Here're related images of the *<${urlOrQuery}|URL>*.` 
            : `Here're related images of the query.`);
        for(let i = 0; i < numberOfImages; i++) {
          await say(`<${searchResultFromMongoDB[i].url}|${searchResultFromMongoDB[i].title}>`);
          await sleep(2000);
        }
      }
  } catch(error) {
    console.log(error);
    await say("An error occurred while processing your request.");
  }
});

app.message(/find resource (.+)/i, async({say, message}) => {
  const image_url = message.text.match(/find resource (.+)/i)[1].replaceAll(/[<>]/g, "");
  try {
    const searchResultFromMongoDB = await search_image.findDataFromMongoDB(image_url, "find_resource");
    if(searchResultFromMongoDB.length === 0) {
      const search_result = await search_image.findResource(image_url);

      await say(search_result === null ? `Sorry, it couldn't find any resources with the <${image_url}|URL>.` : `Resource: This is search result of the <${image_url}|URL>.\n<${search_result.url}|${search_result.title}>`);

      await search_image.saveDataToMongoDB(search_result, image_url, "find_resource");
    } else {
      await say(`Resource: This is search result of the <${image_url}|URL>.\n<${searchResultFromMongoDB.url}|${searchResultFromMongoDB.title}>`);
    }
  } catch(e) {
    console.error(e);
    await say("An error ocurred while processing your request.");
    return;
  }
});

function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

app.start();