import chalk from "chalk";
import puppeteer from "puppeteer";
import dotenv from "dotenv";

const browser = await puppeteer.launch();

export const page = await browser.newPage();

export class search_image_bot {

  constructor() {
    this.lastUsedNumber = 0;
  }

  async searchImage(searchQuery, page) {
    const image = [];

    const today = new Date();

    const year = today.getFullYear();

    const month = today.getMonth() + 1;

    const date = today.getDate();

    const selectors = [
      "a.iusc", // images's preview
      "img.nofocus", //image's url
      "a.ptitle.novid", //images's title
    ]

    await page.setViewport({width: 1920, height: 1080});
    
    try {
      searchQuery = searchQuery.replaceAll(" ", "%20");
 
      const url = `https://www.pinterest.com/search/pins/?q=${searchQuery}`;   
      
      await page.goto(url, {waitUntil: "domcontentloaded", timeout: 40000});  

      await page.screenshot({path: "screen-shot0.png"});

      const image_urls = await page.$$eval('img.hCL.kVc.L4E.MIw[loading="auto"]', el => el.map(url => url.src));

      await page.screenshot({path: "screen-shot1.png"});
      
      let i = 0;
      while(i < image_urls.length) {
        const object = {
          title: "pin page",
          url: image_urls[i],
          query: searchQuery,
          created_At:`${date}/${month}/${year}`
        }

        image.push(object);
        i++;
      }

      return image;
    } catch(error) {
      console.log(error);
      return null;
    }
  }
 
  async searchImageVisually(image_url, page) {
    try {
      const images = [];
 
      
      const today = new Date();
  
      const year = today.getFullYear();
  
      const month = today.getMonth() + 1;
  
      const date = today.getDate();

      const selectors = [
        "div.mainContainer.isv > div.imgContainer > a.richImgLnk", //selectors for image URL
        "span.tit" //the images's title
      ]

      await page.setViewport({width: 1920, height: 1080});
  
      const url = `https://www.bing.com/images/search?view=detailv2&iss=sbi&form=SBIVSP&sbisrc=UrlPaste&q=imgurl:${image_url}&idpbck=1&selectedindex=0&id=${image_url}&ccid=BAiW1cy6&simid=608044551055040555&ck=C9548F7B423DB6C2582AA775C68DAA50&thid=OIP.BAiW1cy6PwlVbebERDp8-QHaHa&mediaurl=${image_url}&exph=500&expw=500&vt=2&sim=11`;
  
      console.log(chalk.bgYellow.black("URL:", url));
  
      await page.goto(url, {waitUntil: "domcontentloaded", timeout: 50000});
  
      await page.waitForSelector(selectors[0], {timeout: 40000, visible: true});
  
      const something = await page.evaluate(() => {
        const selector = document.querySelector("div.mainContainer.isv > div.imgContainer > a.richImgLnk");
        selector.scrollIntoView();
      });
  
      await page.screenshot({path: "screen-shot2.png"});
  
      const searchedImage = await page.$$eval(selectors[0], el => el.map(image => image.getAttribute("data-m")));
  
      const image_title = await page.$$eval(selectors[1], el => el.map(title => title.textContent));

      Promise.all([searchedImage, image_title]);
      
      let i = 0;
      while(i < searchedImage.length) {
        const object = {
          title: image_title[i],
          url: extractUrlFromJSON(searchedImage[i]),
          query: image_url,
          created_At: `${date}/${month}/${year}`
        }
        images.push(object);
        i++;
      }
  
      console.log(images);

      return images;
    } catch(error) {
      console.error(error);
      return null;
    }
  }

  async findResource(image_url, page) {
    try {
      const selectors = [
        "div.Vd9M6", //source url
        "div.UAiK1e" // source title
      ];

      
      const today = new Date();
  
      const year = today.getFullYear();
  
      const month = today.getMonth() + 1;
  
      const date = today.getDate();

      await page.setViewport({width: 1920, height: 1080});
          
      await page.goto(`https://lens.google.com/uploadbyurl?url=${image_url}`, {waitUntil: "domcontentloaded", timeout: 70000});
      
      console.log(`https://lens.google.com/uploadbyurl?url=${image_url}`);
      
      await page.waitForSelector(selectors[0], {waitUntil: 40000, visible: true});
      
      await page.screenshot({path: "screen-shot3.png"});
    
      const source_url = await page.$eval(selectors[0], el => el.getAttribute("data-action-url"));
  
      const source_title = await page.$eval(selectors[1], el => el.textContent);

      Promise.all([source_url, source_title]);
    
      const object = {
        title: source_title,
        url: source_url,
        query: image_url,
        created_At: `${date}/${month}/${year}`
      }

      console.log(object);

      return object;
    } catch(error) {
      console.error(error);
      return null;
    }
  }

  async findDataFromMongoDB(search_query, collection) {
    try {
      const result = await collection.find({ query: search_query }).toArray();
        
      Promise.all(result).then(() => console.log(result));
      
      return result;
    } catch(err) {
      console.error(err);
      return [];
    }a
  }

  async addDataToMongoDB(search_result, collection) {
    try {
      const result = await collection.insertMany(search_result);
        
      Promise.all([result]);      
    } catch(err) {
      console.error(err);
      return;
    }
  }

  async add_latest_data(search_result, collection) {
    try {
      search_result.map(async(data) => {
        const isDataExisted = await collection.find({url: data.url, title: data.title, query: data.query}).toArray();
      
        Promise.all(isDataExisted).then((result) => {
          if(result === 0) {
            return Promise.all(collection.insertOne(data));
          } else {
            return;
          }
        });
      });
    } catch(err) {
      console.error(err);
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