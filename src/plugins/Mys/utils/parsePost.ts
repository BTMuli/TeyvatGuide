/**
 * @file plugins Mys utils parsePost.ts
 * @description 用于解析Mys数据的工具
 * @since Beta v0.3.5
 */

import * as colorConvert from "color-convert";
import type { KEYWORD } from "color-convert/conversions";
import { score } from "wcag-color";

/**
 * @description 给定两个16进制颜色值，确认两者是否相近
 * @since Beta v0.3.4
 * @param {string} colorBg 背景颜色
 * @param {string} colorFg 前景颜色
 * @returns {boolean} 是否相近
 */
function isColorSimilar(colorBg: string, colorFg: string): boolean {
  let hexBg, hexFg;
  if (colorBg.startsWith("#")) hexBg = colorBg;
  else hexBg = colorConvert.keyword.hex(<KEYWORD>colorBg);
  if (colorFg.startsWith("#")) hexFg = colorFg;
  else hexFg = colorConvert.keyword.hex(<KEYWORD>colorFg);
  const contrast = score(hexFg, hexBg);
  return contrast === "Fail";
}

/**
 * @description 检测链接是否是米游社帖子
 * @since Alpha v0.1.2
 * @param {string} url 链接
 * @returns {boolean} 是否是米游社帖子
 */
function isMysPost(url: string): boolean {
  const regBBS = /^https:\/\/bbs\.mihoyo\.com\/\w+\/article\/\d+$/;
  const regMys = /^https:\/\/www\.miyoushe\.com\/\w+\/article\/\d+$/;
  return regBBS.test(url) || regMys.test(url);
}

/**
 * @description 根据 url 获取帖子 id
 * @since Beta v0.3.0
 * @param {string} url 链接
 * @returns {string} 帖子 id
 */
function getPostId(url: string): string {
  const postId: string | undefined = url.split("/").pop();
  if (postId === undefined) {
    throw new Error(`Can't get postId from ${url}`);
  }
  return postId;
}

/**
 * @description 获取视频时长
 * @since Beta v0.3.3
 * @param {number} duration 视频时长
 * @returns {string} 视频时长
 */
function getVodTime(duration: number): string {
  const secTotal = Math.floor(duration / 1000);
  const seconds = secTotal % 60;
  const minutes = Math.floor(secTotal / 60) % 60;
  const hours = Math.floor(secTotal / 3600);
  let result = "";
  if (hours > 0) {
    result += `${hours.toString().padStart(2, "0")}:`;
  }
  result += `${minutes.toString().padStart(2, "0")}:`;
  result += `${seconds.toString().padStart(2, "0")}`;
  return result;
}

/**
 * @description 解析用户帖子，将其转换为 StructContent
 * @since Beta v0.3.4
 * @see PostContent
 * @param {string} content 帖子内容
 * @returns {string} 解析后的内容
 */
function parseContent(content: string): string {
  const data: TGApp.Plugins.Mys.SctPost.Other = JSON.parse(content);
  const result: TGApp.Plugins.Mys.SctPost.Common[] = [];
  const keys = Object.keys(data);
  keys.forEach((key) => {
    switch (key) {
      case "describe":
        result.push({
          insert: data.describe,
        });
        break;
      case "imgs":
        data.imgs.forEach((item) => {
          result.push({
            insert: {
              image: item,
            },
          });
        });
        break;
      default:
        console.warn(`[MysPostParser] Unknown key: ${key}`);
        result.push({
          insert: JSON.stringify(data[key]),
        });
        break;
    }
  });
  return JSON.stringify(result);
}

/**
 * @description 解析Mys数据
 * @since Alpha v0.1.2
 * @param {TGApp.Plugins.Mys.Post.FullData} post Mys数据
 * @description 为了安全考虑，不会解析所有的属性，只会解析几个常用的属性
 * @returns {string} 解析后的HTML，可作为 v-html 使用
 */
function parsePost(post: TGApp.Plugins.Mys.Post.FullData): string {
  const postContent = post.post.content;
  let parserData;
  if (postContent.startsWith("<")) {
    parserData = post.post.structured_content;
  } else {
    try {
      parserData = parseContent(post.post.content);
    } catch (error) {
      parserData = post.post.structured_content;
    }
  }
  const jsonData: TGApp.Plugins.Mys.SctPost.Common[] = JSON.parse(parserData);
  const doc = document.createElement("div");
  jsonData.forEach((item: any) => {
    const parsed = transferParser(item);
    doc.appendChild(parsed);
  });
  return doc.innerHTML;
}

/**
 * @description 解析中转
 * @since Beta v0.3.3
 * @param {TGApp.Plugins.Mys.SctPost.Common} data Mys数据
 * @returns {HTMLDivElement | HTMLSpanElement} 解析后的中转
 */
function transferParser(data: TGApp.Plugins.Mys.SctPost.Common): HTMLDivElement | HTMLSpanElement {
  if (typeof data.insert === "string") {
    return parseText(<TGApp.Plugins.Mys.SctPost.Text | TGApp.Plugins.Mys.SctPost.Link>data);
  } else if ("image" in data.insert) {
    return parseImage(<TGApp.Plugins.Mys.SctPost.Image>data);
  } else if ("vod" in data.insert) {
    return parseVideo(<TGApp.Plugins.Mys.SctPost.Vod>data);
  } else if ("video" in data.insert) {
    return parseVideo(<TGApp.Plugins.Mys.SctPost.Video>data);
  } else if ("backup_text" in data.insert) {
    return parseBackup(<TGApp.Plugins.Mys.SctPost.Backup>data);
  } else if ("link_card" in data.insert) {
    return parseLinkCard(<TGApp.Plugins.Mys.SctPost.LinkCard>data);
  } else if ("divider" in data.insert) {
    return parseDivider(<TGApp.Plugins.Mys.SctPost.Divider>data);
  } else if ("mention" in data.insert) {
    return parseMention(<TGApp.Plugins.Mys.SctPost.Mention>data);
  } else if ("villa_card" in data.insert) {
    return parseVillaCard(<TGApp.Plugins.Mys.SctPost.VillaCard>data);
  }
  return parseUnknown(<TGApp.Plugins.Mys.SctPost.Base>data);
}

/**
 * @description 解析未知数据
 * @since Beta v0.3.4
 * @param {TGApp.Plugins.Mys.SctPost.Base} data Mys数据
 * @returns {HTMLDivElement} 解析后的未知数据
 */
function parseUnknown(data: TGApp.Plugins.Mys.SctPost.Base): HTMLDivElement {
  const div = document.createElement("div");
  div.classList.add("mys-post-unknown");
  const code = document.createElement("code");
  code.innerText = JSON.stringify(data, null, 2);
  code.classList.add("mys-post-unknown-code");
  div.appendChild(code);
  return div;
}

/**
 * @description 解析文本
 * @since Beta v0.3.5
 * @param {TGApp.Plugins.Mys.SctPost.Text |TGApp.Plugins.Mys.SctPost.Link} data Mys数据
 * @returns {HTMLSpanElement} 解析后的文本
 */
function parseText(
  data: TGApp.Plugins.Mys.SctPost.Text | TGApp.Plugins.Mys.SctPost.Link,
): HTMLSpanElement {
  if (data.attributes && "link" in data.attributes) {
    return LinkTextParser(<TGApp.Plugins.Mys.SctPost.Link>data);
  }
  const text = document.createElement("span");
  if (data.attributes) {
    if (data.attributes.bold) text.style.fontWeight = "bold";
    if (data.attributes.color) {
      let colorGet = data.attributes.color;
      if (isColorSimilar("#000000", colorGet)) {
        colorGet = "var(--app-page-content)";
      }
      text.style.color = colorGet;
    }
  }
  if (data.insert.startsWith("_(") && data.insert.endsWith(")")) {
    return emojiParser(<TGApp.Plugins.Mys.SctPost.Text>data);
  }
  text.classList.add("mys-post-span");
  text.innerText = data.insert;
  return text;
}

/**
 * @description 解析链接
 * @since Beta v0.3.4
 * @param {TGApp.Plugins.Mys.SctPost.Link} data Mys数据
 * @returns {HTMLSpanElement} 解析后的链接
 */
function LinkTextParser(data: TGApp.Plugins.Mys.SctPost.Link): HTMLSpanElement {
  const icon = document.createElement("i");
  icon.classList.add("mdi", "mdi-link-variant");
  const link = document.createElement("a");
  const linkUrl = data.attributes.link;
  link.classList.add("mys-post-link");
  if (isMysPost(linkUrl)) {
    const postId = getPostId(linkUrl);
    link.href = `/post_detail/${postId}`;
    link.target = "_self";
  } else {
    link.href = linkUrl;
    link.target = "view_window";
  }
  link.innerText = data.insert;
  link.prepend(icon);
  return link;
}

/**
 * @description 解析分割线
 * @since Beta v0.3.4
 * @param {TGApp.Plugins.Mys.SctPost.Divider} data Mys数据
 * @returns {HTMLDivElement} 解析后的分割线
 */
function parseDivider(data: TGApp.Plugins.Mys.SctPost.Divider): HTMLDivElement {
  const div = document.createElement("div");
  div.classList.add("mys-post-divider");
  const img = document.createElement("img");
  const dividerList = ["line_1", "line_2", "line_3", "line_4"];
  if (!dividerList.includes(data.insert.divider)) {
    console.error("Unknown divider type", data);
    return parseUnknown(<TGApp.Plugins.Mys.SctPost.Base>data);
  }
  img.src = `/source/post/divider_${data.insert.divider}.webp`;
  div.appendChild(img);
  return div;
}

/**
 * @description 解析图片
 * @since Beta v0.3.4
 * @param {TGApp.Plugins.Mys.SctPost.Image} data Mys数据
 * @returns {HTMLDivElement} 解析后的图片
 */
function parseImage(data: TGApp.Plugins.Mys.SctPost.Image): HTMLDivElement {
  const div = document.createElement("div");
  const img = document.createElement("img");
  img.src = data.insert.image;
  img.classList.add("mys-post-img");
  div.appendChild(img);
  div.classList.add("mys-post-div");
  return div;
}

/**
 * @description 解析视频
 * @since Beta v0.3.3
 * @todo 分开解析 Vod 和 Video
 * @param {TGApp.Plugins.Mys.SctPost.Vod|TGApp.Plugins.Mys.SctPost.Video} data Mys数据
 * @returns {HTMLDivElement} 解析后的视频
 */
function parseVideo(
  data: TGApp.Plugins.Mys.SctPost.Vod | TGApp.Plugins.Mys.SctPost.Video,
): HTMLDivElement {
  const div = document.createElement("div");
  div.classList.add("mys-post-div");
  if ("vod" in data.insert) {
    const video = document.createElement("video");
    video.classList.add("mys-post-vod");
    const resolution = data.insert.vod.resolutions.reduce((prev: any, curr: any) => {
      if (prev.size > curr.size) return prev;
      return curr;
    });
    video.poster = data.insert.vod.cover;
    video.controls = true;
    const source = document.createElement("source");
    source.src = resolution.url;
    source.type = resolution.format === ".mp4" ? "video/mp4" : "video/webm";
    video.appendChild(source);
    div.appendChild(video);
    const coverDiv = document.createElement("div");
    const cover = document.createElement("img");
    cover.classList.add("mys-post-vod-cover");
    cover.src = video.poster;
    coverDiv.appendChild(cover);
    const playIcon = document.createElement("img");
    playIcon.classList.add("mys-post-vod-icon");
    playIcon.src = "/source/UI/video_play.svg";
    coverDiv.appendChild(playIcon);
    const playTime = document.createElement("div");
    playTime.classList.add("mys-post-vod-time");
    playTime.innerText = getVodTime(data.insert.vod.duration);
    coverDiv.appendChild(playTime);
    coverDiv.classList.add("mys-post-vod-cover-div");
    div.appendChild(coverDiv);
  } else {
    const video = document.createElement("iframe");
    video.classList.add("mys-post-iframe");
    video.src = data.insert.video;
    video.allowFullscreen = true;
    video.sandbox.add("allow-top-navigation", "allow-same-origin", "allow-forms", "allow-scripts");
    div.appendChild(video);
  }
  return div;
}

/**
 * @description 解析折叠内容
 * @since Beta v0.3.4
 * @param {TGApp.Plugins.Mys.SctPost.Backup} data Mys数据
 * @returns {HTMLDivElement} 解析后的折叠内容
 */
function parseBackup(
  data: TGApp.Plugins.Mys.SctPost.Backup | TGApp.Plugins.Mys.SctPost.Lottery,
): HTMLDivElement {
  if ("lottery" in data.insert) {
    return LotteryParser(<TGApp.Plugins.Mys.SctPost.Lottery>data);
  }
  const titleJson: TGApp.Plugins.Mys.SctPost.Base[] = JSON.parse(data.insert.fold.title);
  const contentJson: TGApp.Plugins.Mys.SctPost.Base[] = JSON.parse(data.insert.fold.content);
  const div = document.createElement("div");
  div.classList.add("mys-post-div");
  const details = document.createElement("details");
  details.classList.add("mys-post-details");
  const title = document.createElement("summary");
  titleJson.forEach((item) => {
    const parsed = transferParser(item);
    title.appendChild(parsed);
  });
  const content = document.createElement("div");
  contentJson.forEach((item) => {
    const parsed = transferParser(item);
    content.appendChild(parsed);
  });
  details.appendChild(title);
  details.appendChild(content);
  div.appendChild(details);
  return div;
}

/**
 * @description 解析抽奖
 * @since Beta v0.3.4
 * @param {TGApp.Plugins.Mys.SctPost.Lottery} data Mys数据
 * @returns {HTMLDivElement} 解析后的抽奖
 */
function LotteryParser(data: TGApp.Plugins.Mys.SctPost.Lottery): HTMLDivElement {
  const div = document.createElement("div");
  const icon = document.createElement("i");
  icon.classList.add("mdi", "mdi-gift");
  const title = document.createElement("a");
  title.classList.add("mys-post-link");
  title.href = `/lottery/${data.insert.lottery.id}`;
  title.innerText = data.insert.lottery.toast;
  title.prepend(icon);
  div.appendChild(title);
  return div;
}

/**
 * @description 解析链接卡片
 * @since Beta v0.3.4
 * @param {TGApp.Plugins.Mys.SctPost.LinkCard} data Mys数据
 * @returns {HTMLDivElement} 解析后的链接卡片
 */
function parseLinkCard(data: TGApp.Plugins.Mys.SctPost.LinkCard): HTMLDivElement {
  const div = document.createElement("div");
  const cover = document.createElement("div");
  cover.classList.add("mys-post-link-card-cover");
  const img = document.createElement("img");
  img.src = data.insert.link_card.cover;
  cover.appendChild(img);
  div.appendChild(cover);
  const content = document.createElement("div");
  content.classList.add("mys-post-link-card-content");
  const title = document.createElement("div");
  title.classList.add("mys-post-link-card-title");
  title.innerHTML = data.insert.link_card.title;
  content.appendChild(title);
  if (data.insert.link_card.price) {
    const price = document.createElement("div");
    price.classList.add("mys-post-link-card-price");
    price.innerHTML = data.insert.link_card.price;
    content.appendChild(price);
  }
  const button = document.createElement("a");
  button.classList.add("mys-post-link-card-btn");
  button.innerHTML = (data.insert.link_card.button_text ?? "详情") + " >";
  const linkUrl = data.insert.link_card.origin_url;
  if (isMysPost(linkUrl)) {
    const postId = getPostId(linkUrl);
    button.href = `/post_detail/${postId}`;
    button.target = "_self";
  } else {
    button.href = linkUrl;
    button.target = "view_window";
  }
  content.appendChild(button);
  div.appendChild(content);
  div.classList.add("mys-post-link-card");
  return div;
}

/**
 * @description 解析 Mention
 * @since Beta v0.3.4
 * @param {TGApp.Plugins.Mys.SctPost.Mention} data Mys数据
 * @returns {HTMLAnchorElement} 解析后的 Mention
 */
function parseMention(data: TGApp.Plugins.Mys.SctPost.Mention): HTMLAnchorElement {
  const icon = document.createElement("i");
  icon.classList.add("mdi", "mdi-account-circle-outline");
  const link = document.createElement("a");
  link.classList.add("mys-post-link");
  link.href = `https://www.miyoushe.com/ys/accountCenter/postList?id=${data.insert.mention.uid}`;
  link.target = "_blank";
  link.innerText = data.insert.mention.nickname;
  link.prepend(icon);
  return link;
}

/**
 * @description 解析 Emoji
 * @since Beta v0.3.4
 * @param {TGApp.Plugins.Mys.SctPost.Text} data Mys数据
 * @returns {HTMLSpanElement} 解析后的 Emoji
 */
function emojiParser(data: TGApp.Plugins.Mys.SctPost.Text): HTMLImageElement {
  const emojis = localStorage.getItem("emojis");
  if (!emojis) {
    throw new Error("[EmojiParser] emojis is not defined");
  }
  const emojiList: Record<string, string> = JSON.parse(emojis);
  const emojiName = data.insert.slice(2, -1);
  const emoji = emojiList[emojiName];
  if (!emoji) {
    throw new Error(`[EmojiParser] emoji is not defined: ${emojiName}`);
  }
  const img = document.createElement("img");
  img.classList.add("mys-post-emoji");
  img.src = emoji;
  img.alt = emojiName;
  img.title = emojiName;
  return img;
}

/**
 * @description 解析大别野房间的卡片
 * @since Beta v0.3.4
 * @param {TGApp.Plugins.Mys.SctPost.VillaCard} data Mys数据
 * @returns {HTMLDivElement} 解析后的大别野房间的卡片
 */
function parseVillaCard(data: TGApp.Plugins.Mys.SctPost.VillaCard): HTMLDivElement {
  const div = document.createElement("div");
  div.classList.add("mys-post-div");
  const villaCard = document.createElement("div");
  villaCard.classList.add("mys-post-villa-card");
  const bgImg = document.createElement("img");
  bgImg.classList.add("mys-post-villa-card-bg");
  bgImg.src = data.insert.villa_card.villa_cover;
  villaCard.appendChild(bgImg);
  const bgBefore = document.createElement("div");
  bgBefore.classList.add("mys-post-villa-card-bg-before");
  villaCard.appendChild(bgBefore);
  const flexDiv = document.createElement("div");
  flexDiv.classList.add("mys-post-villa-card-flex");
  const topDiv = document.createElement("div");
  topDiv.classList.add("mys-post-villa-card-top");
  const topIcon = document.createElement("img");
  topIcon.classList.add("mys-post-villa-card-icon");
  topIcon.src = data.insert.villa_card.villa_avatar_url;
  const topContent = document.createElement("div");
  topContent.classList.add("mys-post-villa-card-content");
  const topTitle = document.createElement("div");
  topTitle.classList.add("mys-post-villa-card-title");
  topTitle.innerText = data.insert.villa_card.villa_name;
  topContent.appendChild(topTitle);
  const topDesc = document.createElement("div");
  topDesc.classList.add("mys-post-villa-card-desc");
  const topDescIcon = document.createElement("img");
  topDescIcon.src = data.insert.villa_card.owner_avatar_url;
  topDescIcon.classList.add("mys-post-villa-card-desc-icon");
  const topDescText = document.createElement("span");
  topDescText.classList.add("mys-post-villa-card-desc-text");
  topDescText.innerText = `${data.insert.villa_card.owner_nickname} 创建`;
  topDesc.appendChild(topDescIcon);
  topDesc.appendChild(topDescText);
  topContent.appendChild(topDesc);
  topDiv.appendChild(topIcon);
  topDiv.appendChild(topContent);
  flexDiv.appendChild(topDiv);
  const midDiv = document.createElement("div");
  midDiv.classList.add("mys-post-villa-card-mid");
  const numberDiv = document.createElement("div");
  numberDiv.classList.add("mys-post-villa-card-tag");
  numberDiv.innerText = `${data.insert.villa_card.villa_member_num}人在聊`;
  midDiv.appendChild(numberDiv);
  data.insert.villa_card.tag_list.forEach((tag) => {
    const tagDiv = document.createElement("div");
    tagDiv.classList.add("mys-post-villa-card-tag");
    tagDiv.innerText = tag;
    midDiv.appendChild(tagDiv);
  });
  flexDiv.appendChild(midDiv);
  const bottomDiv = document.createElement("div");
  bottomDiv.classList.add("mys-post-villa-card-bottom");
  bottomDiv.innerText = data.insert.villa_card.villa_introduce;
  flexDiv.appendChild(bottomDiv);
  villaCard.appendChild(flexDiv);
  div.appendChild(villaCard);
  return div;
}

export default parsePost;
