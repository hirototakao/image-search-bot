import puppeteer from "puppeteer";
import chalk from "chalk";
import xlsxPopulate from "xlsx-populate";

export class search_image_bot {

  constructor() {
    this.lastUsedNumber = 0;
  }

  async searchImage(searchQuery, numberOfImages) {
    const image = [];

    const selectors = [
      "a.iusc", // images's preview
      "img.nofocus", //image's url
      "a.ptitle.novid", //images's title
    ]

    const browser = await puppeteer.launch();

    const page = await browser.newPage();

    await page.setViewport({width: 1920, height: 1080});
    
    try {
      searchQuery = searchQuery.replaceAll(" ", "+");
 
      const url = `https://www.bing.com/images/search?q=${searchQuery}&form=QBIR&first=1`;   

      console.log(chalk.green("URL:", url));
      
      await page.goto(url, {waitUntil: "domcontentloaded", timeout: 20000});  

      await page.screenshot({path: "screen-shot0.png"});

      await page.waitForSelector(selectors[0], {timeout: 10000, visible: true});

      const widely_displayed_pages = await page.$$eval(selectors[0], el => el.map(pages => pages.href));

      numberOfImages = numberOfImages === undefined ? 7 : numberOfImages;
  
      numberOfImages = numberOfImages > widely_displayed_pages.length ? widely_displayed_pages.length : numberOfImages;

      for(let i = 0; i < numberOfImages; i++) {
        await page.goto(widely_displayed_pages[i], {waitUntil: "domcontentloaded", timeout: 20000});

        await page.screenshot({path: "screen-shot1.png"});

        await page.waitForSelector(selectors[2], {timeout: 20000, visible: true});

        await page.screenshot({path: "screen-shot2.png"});

        const image_url = await page.$$eval(selectors[1], el => el[0].src);

        const image_title = await page.$eval(selectors[2], el => el.textContent);

        const object = {
          url: image_url,
          title: image_title
        }

        image.push(object);
      }
      console.log(image[image.length - 1]);

      await browser.close();

      return image;
    } catch(error) {
      console.log(error);
      await browser.close();
      return null;
    }
  }
 
  async searchImageVisually(image_url, numberOfImages) {
    try {
      const images = [];

    const selectors = [
      "div.mainContainer.isv > div.imgContainer > a.richImgLnk", //selectors for image URL
      "span.tit" //the images's title
    ]
  
    const browser = await puppeteer.launch();

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

    await page.screenshot({path: "screen-shot3.png"});

    const searchedImage = await page.$$eval(selectors[0], el => el.map(image => image.getAttribute("data-m")));

    const image_title = await page.$$eval(selectors[1], el => el.map(title => title.textContent));

    numberOfImages = numberOfImages === undefined ? 7 : numberOfImages;
  
    numberOfImages = numberOfImages > searchedImage.length ? searchedImage.length : numberOfImages;
    for(let i = 0; i < numberOfImages; i++) {
      const object = {
        title: image_title[i],
        url: extractUrlFromJSON(searchedImage[i])
      }
      images.push(object);
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
        "div.ksQYvb", //search result
        "div.iJmjmd" // page title
      ];
    
      const browser = await puppeteer.launch();
  
      const page = await browser.newPage();
  
      console.log(`https://lens.google.com/uploadbyurl?url=${image_url}`);
  
      await page.goto(`https://lens.google.com/uploadbyurl?url=${image_url}`, {waitUntil: "domcontentloaded", timeout: 30000});
  
      await page.screenshot({path: "screen-shot4.png"});
      
      await page.waitForSelector(selectors[1], {timeout: 20000, visible: true});
  
      await page.screenshot({path: "screen-shot5.png"});
  
      await page.click(selectors[0]);
  
      await page.waitForSelector(selectors[1], {timeout: 20000, visible: true});
  
      selectors[1] = "li > a > " + selectors[1];
      
      await page.screenshot({path: "screen-shot6.png"});
  
      const something = await page.$$eval(selectors[1], el => el.map(image => image.getAttribute("data-action-url")));
  
      console.log(chalk.green("something:", something));
      
      const matchedUrl = await page.$$eval(selectors[1], el => el[0].getAttribute("data-action-url"));
  
      const url_title = await page.$$eval(selectors[2], el => el[0].textContent);
      await page.screenshot({path: "screen-shot7.png"});
  
      await browser.close();
  
      const object = {
        url: matchedUrl,
        title: url_title,
      }
  
      console.log(object);
  
      return object;
    } catch(error) {
      console.error(error);
      return null;
    }
  }
 
  async saveDataToExcel(image_data, query) {
    xlsxPopulate.fromFileAsync("./image-data.xlsx").then(async(workbook) => {
      console.log(chalk.green(image_data[0].title));
      const usedRange = workbook.sheet(0).usedRange().value();
      for(let i = 0; i < usedRange.length; i++) {
        if(usedRange[i][0] === undefined) {
          this.lastUsedNumber = i;
          break;
        }
      }
      console.log(chalk.green("lastUsedNumber:", this.lastUsedNumber));
      for(let i = 0; i < image_data.length; i++) {
        workbook.sheet(0).cell(`A${i + 1 + this.lastUsedNumber}`).value(image_data[i].title);
        workbook.sheet(0).cell(`B${i + 1 + this.lastUsedNumber}`).value(image_data[i].url);
        workbook.sheet(0).cell(`C${i + 1 + this.lastUsedNumber}`).value(query);
      }
      return workbook.toFileAsync("./image-data.xlsx");
    });
  }

  async findDataFromExcel(query, numberOfImages) {
      try {
        xlsxPopulate.fromFileAsync("./image-data.xlsx").then(async(workbook) => {
          let searchResultFromExcel = [];
          const data = await workbook.sheet(0).usedRange().value();
          const searchResult = await workbook.sheet(0).row(3);

          console.log(searchResult);
        });
      } catch(error) {
        console.error(error);
      }
  }
}

function extractUrlFromJSON(string) {
  string = string.replaceAll("&quot;", "").replaceAll(/[{}"]/g, "").split(",");
  for(let i = 0; i < string.length; i++) {
    string[i] = string[i].includes("h") ? string[i].replace(string[i].substring(0, string[i].indexOf("h")), "") : string[i];
  }
  return string[0];
}

export function getRandomInt(min, max) {
  min = Math.ceil(min);
  max = Math.floor(max);
  return Math.floor(Math.random() * (max - min) + min);
}

const functions = new search_image_bot();

functions.findDataFromExcel("python pandas", 4);