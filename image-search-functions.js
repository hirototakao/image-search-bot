import puppeteer from "puppeteer";
import chalk from "chalk";
const url = "mongodb+srv://HirotoTakao:lJO8CjRvcFQP1X4f@cluster0.hh5ro.mongodb.net/?retryWrites=true&w=majority&appName=Cluster0";

import { MongoClient } from "mongodb";

const client = new MongoClient(url);

const browser = await puppeteer.launch();

export class search_image_bot {

  constructor() {
    this.lastUsedNumber = 0;
  }

  async searchImage(searchQuery) {
    const image = [];

    const selectors = [
      "a.iusc", // images's preview
      "img.nofocus", //image's url
      "a.ptitle.novid", //images's title
    ]

    const page = await browser.newPage();

    await page.setViewport({width: 1920, height: 1080});
    
    try {
      searchQuery = searchQuery.replaceAll(" ", "%20");
 
      const url = `https://www.pinterest.com/search/pins/?q=${searchQuery}`;   
      
      await page.goto(url, {waitUntil: "domcontentloaded"});  

      await page.screenshot({path: "screen-shot1.png"});

      const image_urls = await page.$$eval('img.hCL.kVc.L4E.MIw[loading="auto"]', el => el.map(url => url.src));

      let i = 0;
      while(i < image_urls.length) {
        const object = {
          title: "pin page",
          url: image_urls[i]
        }

        image.push(object);
        i++;
      }
            
      await browser.close();

      return image;
    } catch(error) {
      console.log(error);
      await browser.close();
      return null;
    }
  }
 
  async searchImageVisually(image_url) {
    try {
      const images = [];

    const selectors = [
      "div.mainContainer.isv > div.imgContainer > a.richImgLnk", //selectors for image URL
      "span.tit" //the images's title
    ]
  
    const page = await browser.newPage();

    await page.setViewport({width: 1920, height: 1080});

    const url = `https://www.bing.com/images/search?view=detailv2&iss=sbi&form=SBIVSP&sbisrc=UrlPaste&q=imgurl:${image_url}&idpbck=1&selectedindex=0&id=${image_url}&ccid=BAiW1cy6&simid=608044551055040555&ck=C9548F7B423DB6C2582AA775C68DAA50&thid=OIP.BAiW1cy6PwlVbebERDp8-QHaHa&mediaurl=${image_url}&exph=500&expw=500&vt=2&sim=11`;

    console.log(chalk.green("URL:", url));

    await page.goto(url, {waitUntil: "domcontentloaded", timeout: 10000});

    await page.waitForSelector(selectors[0], {timeout: 20000, visible: true});

    const something = await page.evaluate(() => {
      const selector = document.querySelector("div.mainContainer.isv > div.imgContainer > a.richImgLnk");
      selector.scrollIntoView();
    });

    await page.screenshot({path: "screen-shot2.png"});

    const searchedImage = await page.$$eval(selectors[0], el => el.map(image => image.getAttribute("data-m")));

    const image_title = await page.$$eval(selectors[1], el => el.map(title => title.textContent));
    
    let i = 0;
    while(i < searchedImage.length) {
      const object = {
        title: image_title[i],
        url: extractUrlFromJSON(searchedImage[i])
      }
      images.push(object);
      i++;
    }

    console.log(images);
    await browser.close();

    return images;
    } catch(error) {
      console.error(error);
      return null;
    }
  }

  async findResource(image_url) {
    try {
      const selectors = [
        "button.VfPpkd-LgbsSe.VfPpkd-LgbsSe-OWXEXe-INsAgc.VfPpkd-LgbsSe-OWXEXe-dgl2Hf.Rj2Mlf.OLiIxf.PDpWxe.P62QJc.LQeN7.kuwdsf.r06OKe", // search result for the image URL
        "li > a > div.ksQYvb", //search result
        "div.iJmjmd" // page title
      ];
      
      const page = await browser.newPage();
    
      await page.goto(`https://lens.google.com/uploadbyurl?url=${image_url}`, {waitUntil: "domcontentloaded", timeout: 30000});
          
      await page.screenshot({path: "screen-shot3.png"});
  
      await page.click(selectors[0]);
  
      await page.waitForSelector(selectors[1], {timeout: 20000, visible: true});
        
      await page.screenshot({path: "screen-shot4.png"});
          
      const source_url = await page.$$eval(selectors[1], el => el[0].getAttribute("data-action-url"));
  
      const source_title = await page.$$eval(selectors[2], el => el[0].textContent);
  
      await browser.close();
  
      const object = {
        url: source_url,
        title: source_title,
      }
  
      console.log(object);
  
      return object;
    } catch(error) {
      console.error(error);
      return null;
    }
  }

  async saveDataToMongoDB(data, search_query, collection_name) {
    client.connect();      
   
    try {    
      const db = client.db("image_search_bot");

      const collection = db.collection(collection_name);

      if(collection_name === "find_resource") {
        async function insertData() {
          const result = await collection.insertOne({
            title: data.title,
            url: data.url,
            query: search_query
          });

          return Promise.all(result);
        }

        await insertData();
      } else {
        async function insertData() {
          const promises = data.map(async(object) => {
            await collection.insertOne({
              title: object.title, 
              url: object.url,
              query: search_query
            });
          });

          await Promise.all(promises);
        }

        await insertData();
      }
    } catch(error) {
      console.error(error);
    } finally {
      await client.close().then(() => console.log(chalk.green("MongoDB connection closed successfully.")));
    }
  }

  async findDataFromMongoDB(search_query, collection_name) {

    await client.connect();

    try {
      const db = client.db("image_search_bot");

      const collection = db.collection(collection_name);

      const result = await collection.find({ query: search_query }).toArray();
          
      Promise.all(result).then(() => console.log(result));
      
      return result;
    } catch(err) {
      console.error(err);
      await client.close();
      return [];
    } finally {
      client.close();
    }
  }
}

function extractUrlFromJSON(string) {
  string = string.replaceAll("&quot;", "").replaceAll(/[{}"]/g, "").split(",");
  for(let i = 0; i < string.length; i++) {
    string[i] = string[i].includes("http") ? string[i].replace(string[i].substring(0, string[i].indexOf("h")), "") : string[i];
  }
  return string[0];
}

export function getRandomInt(min, max) {
  min = Math.ceil(min);
  max = Math.floor(max);
  return Math.floor(Math.random() * (max - min) + min);
}

const functions = new search_image_bot();