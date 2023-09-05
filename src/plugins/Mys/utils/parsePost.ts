/**
 * @file plugins Mys utils parsePost.ts
 * @description 用于解析Mys数据的工具
 * @author BTMuli <bt-muli@outlook.com>
 * @since Beta v0.3.0
 */

// third party
import { score } from "wcag-color";
import * as colorConvert from "color-convert";

/**
 * @description 给定两个16进制颜色值，确认两者是否相近
 * @since Beta v0.3.0
 * @param {string} colorBg 背景颜色
 * @param {string} colorFg 前景颜色
 * @returns {boolean} 是否相近
 */
function isColorSimilar(colorBg: string, colorFg: string): boolean {
  let hexBg, hexFg;
  if (colorBg.startsWith("#")) hexBg = colorBg;
  else hexBg = colorConvert.keyword.hex(colorBg);
  if (colorFg.startsWith("#")) hexFg = colorFg;
  else hexFg = colorConvert.keyword.hex(colorFg);
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
 * @description 解析用户帖子，将其转换为 StructContent
 * @since Alpha v0.1.2
 * @see PostContent
 * @param {string} content 帖子内容
 * @returns {string} 解析后的内容
 */
function parseContent(content: string): string {
  const data = JSON.parse(content);
  const result: TGApp.Plugins.Mys.Post.StructuredContent[] = [];
  // 遍历 data 属性，值
  Object.keys(data).forEach((key) => {
    switch (key) {
      case "describe":
        result.push({
          insert: data.describe,
        });
        break;
      case "imgs":
        for (const image of data.imgs) {
          result.push({
            insert: {
              image,
            },
          });
        }
        break;
      default:
        // 如果是其他属性，就直接插入
        result.push({
          insert: JSON.stringify(data[key]),
        });
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
  const jsonData: TGApp.Plugins.Mys.Post.StructuredContent[] = JSON.parse(parserData);
  const doc = document.createElement("div");
  jsonData.forEach((item: any) => {
    const parsed = transferParser(item);
    doc.appendChild(parsed);
  });
  return doc.innerHTML;
}

/**
 * @description 解析中转
 * @since Alpha v0.1.2
 * @param {TGApp.Plugins.Mys.Post.StructuredContent} data Mys数据
 * @returns {HTMLDivElement | HTMLSpanElement} 解析后的中转
 */
function transferParser(
  data: TGApp.Plugins.Mys.Post.StructuredContent,
): HTMLDivElement | HTMLSpanElement {
  if (typeof data.insert === "string") {
    return parseText(data);
  } else if (data.insert.image) {
    return parseImage(data);
  } else if (data.insert.vod != null) {
    return parseVideo(data);
  } else if (data.insert.video) {
    return parseVideo(data);
  } else if (data.insert.backup_text) {
    return parseBackup(data);
  } else if (data.insert.link_card != null) {
    return parseLinkCard(data);
  } else if (data.insert.divider) {
    return parseDivider(data);
  } else if (data.insert.mention != null) {
    return parseMention(data);
  } else {
    return parseUnknown(data);
  }
}

/**
 * @description 解析未知数据
 * @since Alpha v0.1.1
 * @param {TGApp.Plugins.Mys.Post.StructuredContent} data Mys数据
 * @returns {HTMLDivElement} 解析后的未知数据
 */
function parseUnknown(data: TGApp.Plugins.Mys.Post.StructuredContent): HTMLDivElement {
  // 创建 div
  const div = document.createElement("div");
  div.classList.add("mys-post-unknown");
  // 创建 code，将数据放入 code
  const code = document.createElement("code");
  code.innerText = JSON.stringify(data);
  // 插入 code
  div.appendChild(code);
  // 返回 div
  return div;
}

/**
 * @description 解析文本
 * @since Beta v0.3.0
 * @param {TGApp.Plugins.Mys.Post.StructuredContent} data Mys数据
 * @returns {HTMLSpanElement} 解析后的文本
 */
function parseText(data: TGApp.Plugins.Mys.Post.StructuredContent): HTMLSpanElement {
  // 检查数据
  if (typeof data.insert !== "string") {
    throw new Error(`[ParseText] data.insert is not a string: ${JSON.stringify(data)}`);
  }
  // 创建文本
  const text = document.createElement("span");
  // 设置文本属性
  if (data.attributes != null) {
    if (data.attributes.bold) text.style.fontWeight = "bold";
    if (data.attributes.color) {
      let colorGet = data.attributes.color;
      // 如果 colorGet 在 darkColorList 中，就设置为对应的颜色
      if (isColorSimilar("#1E1E1E", colorGet)) {
        colorGet = "var(--app-page-content)";
      }
      text.style.color = colorGet;
    }
    if (data.attributes.link) {
      return LinkTextParser(data);
    }
  }
  if (data.insert.startsWith("_")) {
    return emojiParser(data);
  }
  // 添加 class
  text.classList.add("mys-post-span");
  // 设置 span 内容
  text.innerText = data.insert;
  // 返回文本
  return text;
}

/**
 * @description 解析链接
 * @since Beta v0.3.0
 * @param {TGApp.Plugins.Mys.Post.StructuredContent} data Mys数据
 * @returns {HTMLSpanElement} 解析后的链接
 */
function LinkTextParser(data: TGApp.Plugins.Mys.Post.StructuredContent): HTMLSpanElement {
  // 检查数据
  if (typeof data.insert !== "string") {
    throw new Error(`[LinkTextParser] data.insert is not a string: ${JSON.stringify(data)}`);
  }
  if (data.attributes == null) {
    throw new Error(`[LinkTextParser] data.attributes is not defined`);
  }
  if (!data.attributes.link) {
    throw new Error(`[LinkTextParser] data.attributes.link is not defined`);
  }
  // 创建图标
  const icon = document.createElement("i");
  icon.classList.add("mdi", "mdi-link-variant");
  // 创建链接
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
  // 插入图标作为链接前缀
  link.prepend(icon);
  // 返回链接
  return link;
}

/**
 * @description 解析分割线
 * @since Beta v0.3.0
 * @param {TGApp.Plugins.Mys.Post.StructuredContent} data Mys数据
 * @returns {HTMLDivElement} 解析后的分割线
 */
function parseDivider(data: TGApp.Plugins.Mys.Post.StructuredContent): HTMLDivElement {
  // 数据检查
  if (typeof data.insert === "string") {
    throw new Error(`[ParseDivider] data.insert is a string: ${data.insert}`);
  }
  if (!data.insert.divider) {
    throw new Error(`[ParseDivider] data.insert.divider is not defined`);
  }
  // 创建分割线
  const div = document.createElement("div");
  div.classList.add("mys-post-divider");
  // 创建 img
  const img = document.createElement("img");
  if (data.insert.divider === "line_1") {
    img.src = "/source/post/divider_line_1.webp";
  } else if (data.insert.divider === "line_2") {
    img.src = "/source/post/divider_line_2.webp";
  } else if (data.insert.divider === "line_3") {
    img.src = "/source/post/divider_line_3.webp";
  } else if (data.insert.divider === "line_4") {
    img.src = "/source/post/divider_line_4.webp";
  } else {
    console.error("Unknown divider type", data);
    return parseUnknown(data);
  }
  // 插入 img
  div.appendChild(img);
  // 返回分割线
  return div;
}

/**
 * @description 解析图片
 * @since Beta v0.3.0
 * @param {TGApp.Plugins.Mys.Post.StructuredContent} data Mys数据
 * @returns {HTMLDivElement} 解析后的图片
 */
function parseImage(data: TGApp.Plugins.Mys.Post.StructuredContent): HTMLDivElement {
  // 检查数据
  if (typeof data.insert === "string") {
    throw new Error(`[ParseImage] data.insert is a string: ${data.insert}`);
  }
  if (!data.insert.image) {
    throw new Error(`[ParseImage] data.insert.image is not defined`);
  }
  const div = document.createElement("div");
  // 创建图片
  const img = document.createElement("img");
  img.src = data.insert.image;
  // 添加 class
  img.classList.add("mys-post-img");
  // 插入图片
  div.appendChild(img);
  // 添加 class
  div.classList.add("mys-post-div");
  // 返回 div
  return div;
}

/**
 * @description 解析视频
 * @since Beta v0.3.0
 * @param {TGApp.Plugins.Mys.Post.StructuredContent} data Mys数据
 * @returns {HTMLDivElement} 解析后的视频
 */
function parseVideo(data: TGApp.Plugins.Mys.Post.StructuredContent): HTMLDivElement {
  // 检查数据
  if (typeof data.insert === "string") {
    throw new Error(`[ParseVideo] data.insert is a string: ${data.insert}`);
  }
  if (data.insert.vod == null && !data.insert.video) {
    throw new Error(`[ParseVideo] data.insert.vod and data.insert.video is not defined`);
  }
  // 创建 div
  const div = document.createElement("div");
  div.classList.add("mys-post-div");
  if (data.insert.vod != null) {
    // 创建视频
    const video = document.createElement("video");
    video.classList.add("mys-post-vod");
    // 获取 resolutions中size最大的视频
    const resolution = data.insert.vod.resolutions.reduce((prev: any, curr: any) => {
      if (prev.size > curr.size) return prev;
      return curr;
    });
    video.poster = data.insert.vod.cover; // 设置封面
    video.controls = true; // 设置 controls
    // 添加 source
    const source = document.createElement("source");
    source.src = resolution.url;
    source.type = resolution.format === ".mp4" ? "video/mp4" : "video/webm";
    // 插入 source
    video.appendChild(source);
    // 插入 video
    div.appendChild(video);
  } else if (data.insert.video) {
    // 创建 iframe
    const video = document.createElement("iframe");
    video.classList.add("mys-post-iframe");
    // 设置 iframe 属性
    video.src = data.insert.video;
    video.allowFullscreen = true;
    video.sandbox.add("allow-top-navigation", "allow-same-origin", "allow-forms", "allow-scripts");
    // 插入 video
    div.appendChild(video);
  }
  return div;
}

/**
 * @description 解析折叠内容
 * @since Beta v0.3.0
 * @param {TGApp.Plugins.Mys.Post.StructuredContent} data Mys数据
 * @returns {HTMLDivElement} 解析后的折叠内容
 */
function parseBackup(data: TGApp.Plugins.Mys.Post.StructuredContent): HTMLDivElement {
  // 检查数据
  if (typeof data.insert === "string") {
    throw new Error(`[ParseBackup] data.insert is a string: ${data.insert}`);
  }
  if (data.insert.backup_text === "[抽奖]") {
    return LotteryParser(data);
  }
  if (data.insert.fold == null) {
    throw new Error(`[ParseBackup] data.insert.fold is not defined`);
  }
  // 转换
  const titleJson: TGApp.Plugins.Mys.Post.StructuredContent[] = JSON.parse(data.insert.fold.title);
  const contentJson: TGApp.Plugins.Mys.Post.StructuredContent[] = JSON.parse(
    data.insert.fold.content,
  );
  // 创建 div
  const div = document.createElement("div");
  div.classList.add("mys-post-div");
  // 创建折叠内容
  const details = document.createElement("details");
  details.classList.add("mys-post-details");
  // 创建标题
  const title = document.createElement("summary");
  // 解析标题
  titleJson.forEach((item) => {
    const parsed = transferParser(item);
    title.appendChild(parsed);
  });
  // 创建内容
  const content = document.createElement("div");
  contentJson.forEach((item) => {
    const parsed = transferParser(item);
    content.appendChild(parsed);
  });
  details.appendChild(title);
  details.appendChild(content);
  div.appendChild(details);
  // 返回 div
  return div;
}

/**
 * @description 解析抽奖
 * @since Beta v0.3.0
 * @param {TGApp.Plugins.Mys.Post.StructuredContent} data Mys数据
 * @returns {HTMLDivElement} 解析后的抽奖
 */
function LotteryParser(data: TGApp.Plugins.Mys.Post.StructuredContent): HTMLDivElement {
  // 检查数据
  if (typeof data.insert === "string") {
    throw new Error(`[LotteryParser] data.insert is a string: ${data.insert}`);
  }
  if (!data.insert.backup_text) {
    throw new Error(`[LotteryParser] data.insert.backup_text is not defined`);
  }
  if (data.insert.backup_text !== "[抽奖]") {
    throw new Error(`[LotteryParser] data.insert.backup_text is not [抽奖]`);
  }
  if (data.insert.lottery == null) {
    throw new Error(`[LotteryParser] data.insert.lottery is not defined`);
  }
  // 创建 div
  const div = document.createElement("div");
  // 创建图标
  const icon = document.createElement("i");
  icon.classList.add("mdi", "mdi-gift");
  // 创建标题
  const title = document.createElement("a");
  title.classList.add("mys-post-link");
  title.href = `/lottery/${data.insert.lottery.id}`;
  title.innerText = data.insert.lottery.toast;
  // 插入图标
  title.prepend(icon);
  // 插入标题
  div.appendChild(title);
  // 返回 div
  return div;
}

/**
 * @description 解析链接卡片
 * @since Beta v0.3.0
 * @param {TGApp.Plugins.Mys.Post.StructuredContent} data Mys数据
 * @returns {HTMLDivElement} 解析后的链接卡片
 */
function parseLinkCard(data: TGApp.Plugins.Mys.Post.StructuredContent): HTMLDivElement {
  // 检查数据
  if (typeof data.insert === "string") {
    throw new Error(`[ParseLinkCard] data.insert is a string: ${data.insert}`);
  }
  if (data.insert.link_card == null) {
    throw new Error(`[ParseLinkCard] data.insert.link_card is not defined`);
  }
  // 创建 div
  const div = document.createElement("div");
  // 创建 cover
  const cover = document.createElement("div");
  cover.classList.add("mys-post-link-card-cover");
  // 创建 img
  const img = document.createElement("img");
  img.src = data.insert.link_card.cover;
  // 插入 img
  cover.appendChild(img);
  // 插入 cover
  div.appendChild(cover);
  // 创建 content
  const content = document.createElement("div");
  content.classList.add("mys-post-link-card-content");
  // 创建标题
  const title = document.createElement("div");
  title.classList.add("mys-post-link-card-title");
  title.innerHTML = data.insert.link_card.title;
  // 插入 title
  content.appendChild(title);
  if (data.insert.link_card.price) {
    const price = document.createElement("div");
    price.classList.add("mys-post-link-card-price");
    price.innerHTML = data.insert.link_card.price;
    content.appendChild(price);
  }
  // 创建 button
  const button = document.createElement("a");
  button.classList.add("mys-post-link-card-btn");
  button.innerHTML = (data.insert.link_card.button_text || "详情") + " >";
  const linkUrl = data.insert.link_card.origin_url;
  if (isMysPost(linkUrl)) {
    const postId = getPostId(linkUrl);
    button.href = `/post_detail/${postId}`;
    button.target = "_self";
  } else {
    button.href = linkUrl;
    button.target = "view_window";
  }
  // 插入 button
  content.appendChild(button);
  // 插入 content
  div.appendChild(content);
  // 添加 class
  div.classList.add("mys-post-link-card");
  return div;
}

/**
 * @description 解析 Mention
 * @since Beta v0.3.0
 * @param {TGApp.Plugins.Mys.Post.StructuredContent} data Mys数据
 * @returns {HTMLAnchorElement} 解析后的 Mention
 */
function parseMention(data: TGApp.Plugins.Mys.Post.StructuredContent): HTMLAnchorElement {
  // 检查数据
  if (typeof data.insert === "string") {
    throw new Error(`[ParseMention] data.insert is a string: ${data.insert}`);
  }
  if (data.insert.mention == null) {
    throw new Error(`[ParseMention] data.insert.mention is not defined`);
  }
  // 创建图标
  const icon = document.createElement("i");
  icon.classList.add("mdi", "mdi-account-circle-outline");
  // 创建链接
  const link = document.createElement("a");
  link.classList.add("mys-post-link");
  link.href = `https://www.miyoushe.com/ys/accountCenter/postList?id=${data.insert.mention.uid}`;
  link.target = "_blank";
  link.innerText = data.insert.mention.nickname;
  // 插入图标
  link.prepend(icon);
  return link;
}

/**
 * @description 解析 Emoji
 * @since Beta v0.3.0
 * @param {TGApp.Plugins.Mys.Post.StructuredContent} data Mys数据
 * @returns {HTMLSpanElement} 解析后的 Emoji
 */
function emojiParser(data: TGApp.Plugins.Mys.Post.StructuredContent): HTMLImageElement {
  // 检查数据
  if (typeof data.insert !== "string") {
    throw new Error(`[EmojiParser] data.insert is not a string: ${JSON.stringify(data)}`);
  }
  const emojis = localStorage.getItem("emojis");
  if (!emojis) {
    throw new Error(`[EmojiParser] emojis is not defined`);
  }
  const emojiList: Record<string, string> = JSON.parse(emojis);
  const emojiName = data.insert.slice(2, -1);
  const emoji = emojiList[emojiName];
  if (!emoji) {
    throw new Error(`[EmojiParser] emoji is not defined: ${emojiName}`);
  }
  // 创建图片
  const img = document.createElement("img");
  img.classList.add("mys-post-emoji");
  img.src = emoji;
  // 获取图片地址
  return img;
}

export default parsePost;
