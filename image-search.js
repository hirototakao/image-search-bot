import chalk from "chalk";
import dotenv from "dotenv";
import bolt from "@slack/bolt";
import slack_web_api from "@slack/web-api";
import { MongoClient } from "mongodb";
import puppeteer from "puppeteer";
import { search_image_bot } from "./image-search-functions.js";

const search_image = new search_image_bot();

dotenv.config();

const mongo_url = process.env.MONGODB_CONNECTION_STRING;

const client = new MongoClient(mongo_url, {
  connectTimeoutMS: 100000,
});

client.connect();

const browser = await puppeteer.launch();

export const page = await browser.newPage();

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
  const db = client.db("image_search_bot");
  const collection = db.collection(urlConfirmation ? "visual_search" : "searchImage");

  try {
      const searchResultFromMongoDB = await search_image.findDataFromMongoDB(urlOrQuery, collection);
      Promise.all(searchResultFromMongoDB).then(async(result) => {
        console.log(result);
        if(result.length === 0) {
          const search_result = urlConfirmation
               ? await search_image.searchImageVisually(urlOrQuery, page) 
               : await search_image.searchImage(urlOrQuery, page);
                  
          if(search_result === null) {
            await say(urlConfirmation 
                ? `Sorry, it couldn't find any images with the *<${urlOrQuery}|URL>*. Please try again.` 
                : `Sorry, it couldn't find any images with the *${urlOrQuery}*. Please try again.`);
          } else {
            const promise1 = await collection.insertMany(search_result).then(() => console.log(chalk.green("Data successfully inserted!")));

            const promise2 = sendMessage(numberOfImages, search_result, urlOrQuery, say);

            Promise.all([promise1, promise2]).then(() => console.log(chalk.green("Process ended!")));           
          }
        } else {
          await sendMessage(numberOfImages, result, urlOrQuery, say);
        }
      });
  } catch(error) {
    console.error(error);
    await say("An error occurred while processing your request.");
  }
});

app.message(/find resource (.+)/i, async({say, message}) => {
  await say("searching....");
  const image_url = message.text.match(/find resource (.+)/i)[1].replaceAll(/[<>]/g, "");
  const urlConfirmation = image_url.includes("https");
  const db = client.db("image_search_bot");
  const collection = db.collection("find_resource");
  try {
    const searchResultFromMongoDB = await search_image.findDataFromMongoDB(image_url, collection);
    Promise.all(searchResultFromMongoDB).then(async(result) => {
      if(result.length === 0) {
        const search_result = await search_image.findResource(image_url, page);
  
        if(search_result === null) {
          await say(urlConfirmation ? `Sorry, it couldn't find any resources with the <${image_url}|URL>.` : `Sorry, it couldn't find any resources with the *${image_url}*.`);
        } else {
          const promise1 = await say(`Resource: This is search result of the <${image_url}|URL>.\n<${search_result.url}|${search_result.title}>`);
  
          const promise2 = await collection.insertOne(search_result).then(() => console.log(chalk.green("Data successfully inserted!")));
         
          Promise.all([promise1, promise2]).then(() => console.log(chalk.green("Process ended!")));
        }
      } else {        
        await say(`Resource: This is search result of the <${image_url}|URL>.\n<${result[0].url}|${result[0].title}>`);
      }
    });
  } catch(error) {
    console.error(error);
    await say("An error ocurred while processing your request.");
    return;
  }
});

app.message(/latest update image (.+?) (.+ ?)/i, async({say, message}) => {
  await say("searching...");
  let numberOfImages = message.text.match(/latest update image (.+?) (.+ ?)/i)[1] !== "none" ? message.text.match(/latest update image (.+?) (.+ ?)/i)[1] : 10; //optional
  const urlOrQuery = message.text.match(/latest update image (.+?) (.+ ?)/i)[2].replaceAll(/[<>]/g, "");
  console.log(chalk.blue(`urlOrQuery: ${urlOrQuery}\nnumberOfImages: ${numberOfImages}`));
  const urlConfirmation = urlOrQuery.includes("https");
  const db = client.db("image_search_bot");
  const collection = db.collection(urlConfirmation ? "visual_search" : "searchImage");
  
  try {
    const searchResultFromMongoDB = await search_image.findDataFromMongoDB(urlOrQuery, collection);
    Promise.all(searchResultFromMongoDB).then(async(result) => {
      if(result.length === 0) {
        const search_result = urlConfirmation
             ? await search_image.searchImageVisually(urlOrQuery, page) 
             : await search_image.searchImage(urlOrQuery, page);
                
        if(search_result === null) {
          await say(urlConfirmation 
              ? `Sorry, it couldn't find any images with the *<${urlOrQuery}|URL>*. Please try again.` 
              : `Sorry, it couldn't find any images with the *${urlOrQuery}*. Please try again.`);
          return;
        } else {
          const promise1 = sendMessage(numberOfImages, search_result, urlOrQuery, say);
  
          const promise2 = await collection.insertMany(search_result).then(() => console.log(chalk.blue("Data insertion successfully completed!"))); 
          
          Promise.all([promise1, promise2]).then(() => console.log(chalk.blue("Process ended!")));
        }
      } else {
        const promise1 = collection.deleteMany({query: urlOrQuery});

        const search_result = urlConfirmation
             ? await search_image.searchImageVisually(urlOrQuery, page) 
             : await search_image.searchImage(urlOrQuery, page);
        
        
        const promise2 = sendMessage(numberOfImages, search_result, urlOrQuery, say);

        const promise3 = await collection.insertMany(search_result).then(() => console.log(chalk.blue("Data insertion successfully completed!")));

        Promise.all([promise1, search_result]);
        Promise.all([promise2, promise3]).then(() => console.log(chalk.blue("Process ended!")));
      }
    });
  } catch(error) {
    console.error(error);
    await say("An error occurred while processing your request.");
  }
});

app.message(/latest update resource (.+)/i, async({say, message}) => {
  await say("searching...");

  const image_url = message.text.match(/latest update resource (.+)/i)[1].replaceAll(/[<>]/g, "");

  const urlConfirmation = image_url.includes("https");

  const db = client.db("image_search_bot");

  const collection = db.collection("find_resource");
  
  try {
    const searchResultFromMongoDB = await search_image.findDataFromMongoDB(image_url, collection);

    Promise.all(searchResultFromMongoDB).then(async(result) => {
      if(result.length === 0) {
        const search_result = await search_image.findResource(image_url, page);
  
        if(search_result === null) {
          await say(urlConfirmation ? `Sorry, it couldn't find any resources with the <${image_url}|URL>.` : `Sorry, it couldn't find any resources with the *${image_url}*.`);
          
          return;
        } else {
          const promise1 = await say(`Resource: This is search result of the <${image_url}|URL>.\n<${search_result.url}|${search_result.title}>`);
  
          const promise2 = collection.insertOne(search_result).then(() => console.log(chalk.blue("Data successfully inserted!")));
         
          Promise.all([promise1, promise2]).then(() => console.log(chalk.blue("Process ended!")));
        }
      } else {   
        const search_result = await search_image.findResource(image_url, page);

        const promise1 = collection.deleteOne({query: image_url});
        
        const promise2 = await say(`Resource: This is search result of the <${image_url}|URL>.\n<${search_result.url}|${search_result.title}>`);
        
        const promise3 = collection.insertOne(search_result);

        Promise.all([search_result, promise1]);
        Promise.all([promise2, promise3]).then(() => console.log(chalk.blue("Process ended!")));
      }
    });
  } catch(error) {
    console.error(error);
    await say("An error ocurred while processing your request.");
  }
});

function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

app.start();

async function sendMessage(numberOfImages, search_result, urlOrQuery, say) {
  return new Promise(async(resolve, reject) => {
    numberOfImages = numberOfImages > search_result.length ? search_result.length : numberOfImages;

    await say(urlOrQuery.includes("https")
        ? `Here're related images of the *<${urlOrQuery}|URL>*.` 
        : `Here're related images of the query.`);

    for(let i = 0; i < numberOfImages; i++) {
      await say(`<${search_result[i].url}|${search_result[i].title}>`);
      await sleep(2000);
    }

    resolve("Completed!");
  });
}