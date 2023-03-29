/**
 * @file plugins Mys utils PostParser.ts
 * @description 用于解析Mys数据的工具
 * @author BTMuli<bt-muli@outlook.com>
 * @since Alpha
 */
import { PostStructuredContent } from "../interface/post";

/**
 * @description 解析Mys数据
 * @param {string} data Mys数据
 * @description 为了安全考虑，不会解析所有的属性，只会解析几个常用的属性
 * @returns {string} 解析后的HTML，可作为 v-html 使用
 */
export function PostParser(data: string): string {
	// Json 化
	let jsonData: PostStructuredContent[] = JSON.parse(data);
	// 创建 div
	const doc = document.createElement("div");
	// cover flag
	let coverFlag = false;
	// 遍历 Json 数据
	jsonData.forEach((item: any) => {
		if (typeof item.insert === "string") {
			const text = TextParser(item);
			doc.appendChild(text);
		} else if (item.insert.image) {
			const img = ImageParser(item, coverFlag);
			coverFlag = img[1];
			doc.appendChild(img[0]);
		} else if (item.insert.vod) {
			// 创建 div
			const video = VideoParser(item);
			// 插入 div
			doc.appendChild(video);
		} else if (item.insert.backup_text) {
			// 创建 div
			const backup = BackupTextParser(item);
			// 插入 div
			doc.appendChild(backup);
		}
	});
	return doc.innerHTML;
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
			const a = document.createElement("a");
			a.href = data.attributes.link;
			a.target = "_blank";
			a.innerText = data.insert;
			return a;
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
 * @description 解析图片
 * @since Alpha
 * @param {PostStructuredContent} data Mys数据
 * @param {boolean} coverFlag cover 是否已经存在
 * @returns {[HTMLDivElement, boolean]} 解析后的图片.第一个是图片，第二个是 coverFlag
 */
function ImageParser(data: PostStructuredContent, coverFlag: boolean): [HTMLDivElement, boolean] {
	// 检查数据
	if (typeof data.insert === "string") {
		throw new Error("data.insert is a string");
	}
	if (!data.insert.image) {
		throw new Error("data.insert.image is not defined");
	}
	if (!data.attributes) {
		throw new Error("data.attributes is not defined");
	}
	if (!data.attributes.width) {
		throw new Error("data.attributes.width is not defined");
	}
	if (!data.attributes.height) {
		throw new Error("data.attributes.height is not defined");
	}
	const div = document.createElement("div");
	// 创建图片
	const img = document.createElement("img");
	img.src = data.insert.image;
	// 添加 class
	img.classList.add("mys-post-img");
	// 判断是否是 cover
	if (!coverFlag) {
		// 添加 class
		img.classList.add("mys-post-cover");
		// 设置 coverFlag
		coverFlag = true;
	}
	// 插入图片
	div.appendChild(img);
	// 添加 class
	div.classList.add("mys-post-div");
	// 返回 div
	return [div, coverFlag];
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
 * @since Alpha
 * @param {PostStructuredContent} data Mys数据
 * @returns {HTMLDivElement} 解析后的折叠内容
 */
function BackupTextParser(data: PostStructuredContent): HTMLDivElement {
	// 检查数据
	if (typeof data.insert === "string") {
		throw new Error("data.insert is a string");
	}
	if (!data.insert.backup_text) {
		throw new Error("data.insert.backup_text is not defined");
	}
	if (!data.insert.fold) {
		throw new Error("data.insert.fold is not defined");
	}
	if (!data.insert.fold.title) {
		throw new Error("data.insert.fold.title is not defined");
	}
	if (!data.insert.fold.content) {
		throw new Error("data.insert.fold.content is not defined");
	}
	// 转换
	const titleJson: PostStructuredContent[] = JSON.parse(data.insert.fold.title);
	const contentJson: PostStructuredContent[] = JSON.parse(data.insert.fold.content);
	// 创建 div
	const div = document.createElement("div");
	// 创建标题
	const title = document.createElement("div");
	// 解析标题
	titleJson.forEach(item => {
		// 数据检查
		if (typeof item.insert !== "string") {
			throw new Error("item.insert is not a string");
		}
		// 解析
		title.appendChild(TextParser(item));
	});
	// 创建内容
	const content = document.createElement("div");
	// 解析内容
	contentJson.forEach(item => {
		// 数据检查
		if (typeof item.insert === "string") {
			// 解析
			content.appendChild(TextParser(item));
		} else if (item.insert.image) {
			// 解析
			content.appendChild(ImageParser(item, false)[0]);
		}
	});
	// 插入标题
	div.appendChild(title);
	// 插入内容
	div.appendChild(content);
	// 添加 class
	div.classList.add("mys-post-div");
	// 返回 div
	return div;
}
