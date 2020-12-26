const request = require('request');
const cheerio = require('cheerio');
const fs = require('fs');
// 全部壁纸
const ALL_URL = `https://www.dpm.org.cn/lights/royal.html?${+new Date()}`;
// 检索条件 p-页码
const category_id = 173; // 视觉创意
const wallpaper_type = 990678;
const title = '';
const FILTER_URL = `https://www.dpm.org.cn/searchs/royal.html?${+new Date()}&category_id=${category_id}&wallpaper_type=${wallpaper_type}&title=${title}`;
// 总页码数
let TOTAL_PAGES = 0;
// 图片下载地址
const IMG_URL = `https://www.dpm.org.cn/download/lights_image/id/__id__/img_size/__size__.html`;
// 0：横版  1：竖版  2：方形
const IMG_TYPE = 0;
// 分辨率
const PX_SIZE = {
  1: '1024 x 768',
  2: '1280 x 800',
  3: '1680 x 1050',
  4: '1920 x 1080',
  5: '750 x 1334',
  6: '1080 x 1920',
  7: '1125 x 2436',
  8: '2732 x 2732',
  9: '2048 x 2048'
};

const requestAction = url => {
  return new Promise((resolve, reject) => {
    request(url, (error, response, body) => {
      if (error) reject(error);
      if (response && response.statusCode === 200) {
        resolve(body);
      } else {
        reject('request failed');
      }
    });
  });
};
/**
 * @description 总页码数
 * @param {*} url
 */
const getTotalPage = async url => {
  const res = await requestAction(url);
  const $ = cheerio.load(res);
  const pages = $('.wallpager .pages a');
  TOTAL_PAGES = $(pages[pages.length - 2]).text();
};
/**
 * @description 每页壁纸
 * @param {*} pageUrl 页面地址
 * @param {*} pageNum 页码
 */
const getWallpaperInEachPage = async (pageUrl, pageNum) => {
  console.log('=====>>>total page:', TOTAL_PAGES);
  console.log('=====>>>current page:', pageNum);
  console.log('=====>>>current page url:', pageUrl);
  const url = `${pageUrl}&p=${pageNum}`;
  const res = await requestAction(url);
  const $ = cheerio.load(res);
  let wallpagers = [];
  // 壁纸id
  const primaryidDom = $('.wallpager .item .mask .a3');
  // 壁纸名称
  const nameDom = $('.wallpager .item h3');
  // 壁纸下载尺寸
  primaryidDom.each(async (index, ele) => {
    const attrs = $(ele).attr();
    // 图片资源id
    const primaryid = attrs.primaryid;
    // 支持下载的尺寸
    const sizeArr = Object.keys(attrs)
      .filter(key => key.startsWith('litpic') && attrs[key])
      .map(v => {
        const num = +v.replace('litpic', '');
        return num || 1;
      });
    // 图片名称
    const name = $(nameDom[index]).text().trim();
    let maxPx, typeSize, px, downloadUrl;
    switch (IMG_TYPE) {
      case 0:
        typeSize = sizeArr.filter(v => v <= 4);
        break;
      case 1:
        typeSize = sizeArr.filter(v => v <= 7 && v > 4);
        break;
      default:
        typeSize = sizeArr.filter(v => v <= 9 && v > 7);
        break;
    }
    wallpagers[index] = {
      primaryid,
      name
    };
    if (typeSize.length) {
      // 下载同类型最大尺寸
      maxPx = typeSize[typeSize.length - 1];
      downloadUrl = IMG_URL.replace('__id__', primaryid).replace(
        '__size__',
        maxPx
      );
      px = PX_SIZE[maxPx];
      wallpagers[index] = {
        ...wallpagers[index],
        px,
        size: maxPx,
        downloadUrl
      };
      await downloadWallpaper({
        url: downloadUrl,
        name,
        px,
        index,
        pageNum
      }).then(() => {
        console.log('=====>>>:', `${pageNum}_${index}_${name}_${px}.png`);
      });
    }
  });
};
/**
 * @description 下载壁纸
 * @param {*} { url, name, px, index, pageNum }
 * @returns
 */
const downloadWallpaper = async ({ url, name, px, pageNum, index }) => {
  return request(url, (error, response, body) => {
    if (error) console.log(error);
  }).pipe(
    fs.createWriteStream(`./wallpaper/${pageNum}_${index}_${name}_${px}.png`)
  );
};

const start = async () => {
  await getTotalPage(FILTER_URL);
  for (let pageNum = 1; pageNum <= TOTAL_PAGES; pageNum++) {
    await getWallpaperInEachPage(FILTER_URL, pageNum);
  }
};

start();
