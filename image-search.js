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

app.message(/search image (.+ ?) (.+)/i, async({say, message}) => {
  await say("searching...");
  const urlOrQuery = message.text.match(/search image (.+) (.+)/i)[1].replaceAll(/[<>]/g, "");
  const numberOfImages = message.text.match(/search image (.+) (.+)/i)[2]; //optional
  console.log(chalk.green(`urlOrQuery: ${urlOrQuery}\nnumberOfImages: ${numberOfImages}`));

  try {
      const searchResultFromExcel = await search_image.findDataFromExcel(urlOrQuery, parseInt(numberOfImages));
      if(searchResultFromExcel.length === 0) {
        const search_result = urlOrQuery.includes("https") 
             ? await search_image.searchImageVisually(urlOrQuery, parseInt(numberOfImages)) 
             : await search_image.searchImage(urlOrQuery, parseInt(numberOfImages));
        
        if(search_result === null) {
          await say(urlOrQuery.includes("https") 
              ? `Sorry, it couldn't find any images with the *<${urlOrQuery}|URL>*.` 
              : `Sorry, it couldn't find any images with the *${urlOrQuery}*.`);
          return;
        } else {
          await say(urlOrQuery.includes("https") 
              ? `Here're related images of the *<${urlOrQuery}|URL>*.` 
              : `Here're related images of the query.`);
          for(let image of search_result) {
            await say(`<${image.url}|${image.title}>`);
            await sleep(2000);
          }
          await search_image.saveDataToExcel(search_result, urlOrQuery);
        }
      } else {
        console.log(chalk.green("tank"));
        await say(urlOrQuery.includes("https") 
            ? `Here're related images of the *<${urlOrQuery}|URL>*.` 
            : `Here're related images of the query.`);
        for(let image of searchResultFromExcel) {
          await say(`<${image.url}|${image.title}>`);
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
  const search_result = await search_image.findResource(image_url);
  await say(search_result === null ? `Sorry, it couldn't find any resources with the <${image_url}|URL>.` : `Resource: This is search result of the <${image_url}|URL>.\n<${search_result.url}|${search_result.title}>`);
});

function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

app.start();