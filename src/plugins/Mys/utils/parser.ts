/**
 * @file plugins Mys utils PostParser.ts
 * @description 用于解析Mys数据的工具
 * @author BTMuli<bt-muli@outlook.com>
 * @since Alpha v0.1.1
 */
import { PostStructuredContent } from "../interface/post";

/**
 * @description 检测链接是否是米游社帖子
 * @since Alpha v0.1.1
 * @param {string} url 链接
 * @returns {boolean} 是否是米游社帖子
 */
export function IsMysPost(url: string): boolean {
	return (
		url.startsWith("https://bbs.mihoyo.com/ys/article/") ||
		url.startsWith("https://www.miyoushe.com/ys/article/")
	);
}

/**
 * @description 解析Mys数据
 * @since Alpha v0.1.1
 * @param {string} data Mys数据
 * @description 为了安全考虑，不会解析所有的属性，只会解析几个常用的属性
 * @returns {string} 解析后的HTML，可作为 v-html 使用
 */
export function PostParser(data: string): string {
	// Json 化
	let jsonData: PostStructuredContent[] = JSON.parse(data);
	// 创建 div
	const doc = document.createElement("div");
	// 遍历 Json 数据
	jsonData.forEach((item: any) => {
		// 解析
		const parsed = ParserTransfer(item);
		// 插入
		doc.appendChild(parsed);
	});
	return doc.innerHTML;
}

/**
 * @description 解析中转
 * @since Alpha v0.1.1
 * @param {PostStructuredContent} data Mys数据
 * @returns {HTMLDivElement | HTMLSpanElement} 解析后的中转
 */
function ParserTransfer(data: PostStructuredContent): HTMLDivElement | HTMLSpanElement {
	if (typeof data.insert === "string") {
		return TextParser(data);
	} else if (data.insert.image) {
		return ImageParser(data);
	} else if (data.insert.vod) {
		return VideoParser(data);
	} else if (data.insert.backup_text) {
		return BackupTextParser(data);
	} else if (data.insert.link_card) {
		return LinkCardParser(data);
	} else if (data.insert.divider) {
		return DividerParser(data);
	} else {
		console.log(data);
		throw new Error("Unknown data.insert type");
	}
}

/**
 * @description 解析文本
 * @since Alpha
 * @param {PostStructuredContent} data Mys数据
 * @returns {HTMLSpanElement} 解析后的文本
 */
function TextParser(data: PostStructuredContent): HTMLSpanElement {
	// 检查数据
	if (typeof data.insert !== "string") {
		throw new Error("data.insert is not a string");
	}
	// 创建文本
	const text = document.createElement("span");
	// 设置文本属性
	if (data.attributes) {
		if (data.attributes.bold) text.style.fontWeight = "bold";
		if (data.attributes.color) text.style.color = data.attributes.color;
		if (data.attributes.link) {
			return LinkTextParser(data);
		}
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
 * @since Alpha v0.1.1
 * @param {PostStructuredContent} data Mys数据
 * @returns {HTMLSpanElement} 解析后的链接
 */
function LinkTextParser(data: PostStructuredContent): HTMLSpanElement {
	// 检查数据
	if (typeof data.insert !== "string") {
		throw new Error("data.insert is not a string");
	}
	if (!data.attributes) {
		throw new Error("data.attributes is not defined");
	}
	if (!data.attributes.link) {
		throw new Error("data.attributes.link is not defined");
	}
	// 创建图标
	const icon = document.createElement("i");
	icon.classList.add("mdi", "mdi-link-variant");
	// 创建链接
	const link = document.createElement("a");
	const link_url = data.attributes.link;
	link.classList.add("mys-post-link");
	if (IsMysPost(link_url)) {
		link.href = "/post_detail/" + link_url.split("/").pop();
		link.target = "_self";
	} else {
		link.href = link_url;
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
 * @since Alpha v0.1.1
 * @param {PostStructuredContent} data Mys数据
 * @returns {HTMLDivElement} 解析后的分割线
 */
function DividerParser(data: PostStructuredContent): HTMLDivElement {
	// 数据检查
	if (typeof data.insert === "string") {
		throw new Error("data.insert is a string");
	}
	if (!data.insert.divider) {
		throw new Error("data.insert.divider is not defined");
	}
	// 创建分割线
	const div = document.createElement("div");
	div.classList.add("mys-post-divider");
	// 创建 img
	const img = document.createElement("img");
	if (data.insert.divider === "line_1") {
		img.src =
			"https://mihoyo-community-web.oss-cn-shanghai.aliyuncs.com/upload/2021/01/05/40eb5281cb24042bf34a9f1bcc61eaf5.png";
	} else if (data.insert.divider === "line_2") {
		img.src =
			"https://mihoyo-community-web.oss-cn-shanghai.aliyuncs.com/upload/2021/01/05/477d4c535e965bec1791203aecdfa8e6.png";
	} else if (data.insert.divider === "line_3") {
		img.src =
			"https://mihoyo-community-web.oss-cn-shanghai.aliyuncs.com/upload/2021/01/05/e7047588e912d60ff87a975e037c7606.png";
	} else if (data.insert.divider === "line_4") {
		img.src =
			"https://mihoyo-community-web.oss-cn-shanghai.aliyuncs.com/upload/2022/07/13/line_4.png";
	} else {
		console.log(data);
		throw new Error("Unknown divider type");
	}
	// 插入 img
	div.appendChild(img);
	// 返回分割线
	return div;
}

/**
 * @description 解析图片
 * @since Alpha v0.1.1
 * @param {PostStructuredContent} data Mys数据
 * @returns {HTMLDivElement} 解析后的图片
 */
function ImageParser(data: PostStructuredContent): HTMLDivElement {
	// 检查数据
	if (typeof data.insert === "string") {
		throw new Error("data.insert is a string");
	}
	if (!data.insert.image) {
		throw new Error("data.insert.image is not defined");
	}
	// if (!data.attributes) {
	// 	throw new Error("data.attributes is not defined");
	// }
	// if (!data.attributes.width) {
	// 	throw new Error("data.attributes.width is not defined");
	// }
	// if (!data.attributes.height) {
	// 	throw new Error("data.attributes.height is not defined");
	// }
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
 * @since Alpha
 * @param {PostStructuredContent} data Mys数据
 * @returns {HTMLDivElement} 解析后的视频
 */
function VideoParser(data: PostStructuredContent): HTMLDivElement {
	// 检查数据
	if (typeof data.insert === "string") {
		throw new Error("data.insert is a string");
	}
	if (!data.insert.vod) {
		throw new Error("data.insert.vod is not defined");
	}
	// 创建 div
	const div = document.createElement("div");
	// 创建视频
	const video = document.createElement("video");
	// 获取 resolutions中size最大的视频
	const resolution = data.insert.vod.resolutions.reduce((prev: any, curr: any) => {
		if (prev.size > curr.size) return prev;
		return curr;
	});
	// 设置视频属性
	video.poster = data.insert.vod.cover; // 设置封面
	video.controls = true; // 设置 controls
	// 添加 class
	video.classList.add("mys-post-vod");
	// 添加 source
	const source = document.createElement("source");
	source.src = resolution.url;
	source.type = resolution.format === ".mp4" ? "video/mp4" : "video/webm";
	// 插入 source
	video.appendChild(source);
	// 插入 video
	div.appendChild(video);
	// 添加 class
	div.classList.add("mys-post-div");
	// 返回 div
	return div;
}

/**
 * @description 解析折叠内容
 * @since Alpha v0.1.1
 * @param {PostStructuredContent} data Mys数据
 * @returns {HTMLDivElement} 解析后的折叠内容
 */
function BackupTextParser(data: PostStructuredContent): HTMLDivElement {
	// 检查数据
	if (typeof data.insert === "string") {
		throw new Error("data.insert is a string");
	}
	if (data.insert.backup_text === "[抽奖]") {
		return LotteryParser(data);
	}
	if (!data.insert.fold) {
		throw new Error("data.insert.fold is not defined");
	}
	// 转换
	const titleJson: PostStructuredContent[] = JSON.parse(data.insert.fold.title);
	const contentJson: PostStructuredContent[] = JSON.parse(data.insert.fold.content);
	// 创建 div
	const div = document.createElement("div");
	div.classList.add("mys-post-div");
	// 创建折叠内容
	const details = document.createElement("details");
	details.classList.add("mys-post-details");
	// 创建标题
	const title = document.createElement("summary");
	// 解析标题
	titleJson.forEach(item => {
		const parsed = ParserTransfer(item);
		title.appendChild(parsed);
	});
	// 创建内容
	const content = document.createElement("div");
	contentJson.forEach(item => {
		const parsed = ParserTransfer(item);
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
 * @since Alpha v0.1.1
 * @param {PostStructuredContent} data Mys数据
 * @returns {HTMLDivElement} 解析后的抽奖
 */
function LotteryParser(data: PostStructuredContent): HTMLDivElement {
	// 检查数据
	if (typeof data.insert === "string") {
		throw new Error("data.insert is a string");
	}
	if (!data.insert.backup_text) {
		throw new Error("data.insert.backup_text is not defined");
	}
	if (data.insert.backup_text !== "[抽奖]") {
		throw new Error("data.insert.backup_text is not [抽奖]");
	}
	if (!data.insert.lottery) {
		throw new Error("data.insert.lottery is not defined");
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
 * @since Alpha v0.1.1
 * @param {PostStructuredContent} data Mys数据
 * @returns {HTMLDivElement} 解析后的链接卡片
 */
function LinkCardParser(data: PostStructuredContent): HTMLDivElement {
	// 检查数据
	if (typeof data.insert === "string") {
		throw new Error("data.insert is a string");
	}
	if (!data.insert.link_card) {
		throw new Error("data.insert.link_card is not defined");
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
	const link_url = data.insert.link_card.origin_url;
	if (IsMysPost(link_url)) {
		button.href = "/post_detail/" + link_url.split("/").pop();
		button.target = "_self";
	} else {
		button.href = link_url;
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
