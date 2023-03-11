/**
 * @file utils MysParse.ts
 * @description 用于解析Mys数据的工具
 * @author BTMuli<bt-muli@outlook.com>
 * @since Alpha
 */

/**
 * @description 解析Mys数据
 * @param {string} data Mys数据
 * @description 为了安全考虑，不会解析所有的属性，只会解析几个常用的属性
 * @returns {Document} 解析后的 HTML 文档
 */
export function parseMys(data: string): Document {
	// Json 化
	let jsonData = JSON.parse(data);
	while (typeof jsonData === "string") jsonData = JSON.parse(jsonData);
	// 创建 HTML 文档
	const doc = document.implementation.createHTMLDocument();
	// 遍历 Json 数据
	jsonData.forEach((item: any) => {
		if (item.insert.image) {
			// 创建 div
			const div = document.createElement("div");
			// 创建图片
			const img = document.createElement("img");
			img.src = item.insert.image;
			// 设置图片属性
			img.height = item.attributes.height; // 设置高度
			img.width = item.attributes.width; // 设置宽度
			// 如果宽度超过 800，将其设置为 800，图片自适应
			if (img.width > 800) img.width = 800;
			// 高度自适应
			img.style.height = "auto";
			// 插入图片
			div.appendChild(img);
			// 设置 div 属性
			div.style.display = "center"; // 居中
			div.style.margin = "20px auto"; // 设置 margin
			// 插入 div
			doc.body.appendChild(div);
		} else if (item.insert.vod) {
			// 创建 div
			const div = document.createElement("div");
			// 创建视频
			const video = document.createElement("video");
			// 设置一些属性
			video.poster = item.insert.vod.cover; // 设置封面
			video.height = item.insert.vod.resolutions[0].height; // 设置高度
			video.width = item.insert.vod.resolutions[0].width; // 设置宽度
			video.controls = true; // 设置 controls
			// 获取 resolutions，将其作为 source
			const resolutions = item.insert.vod.resolutions;
			// 添加 source
			const source = document.createElement("source");
			source.src = resolutions[0].url;
			source.type = resolutions[0].format === ".mp4" ? "video/mp4" : "video/webm";
			video.appendChild(source);
			// 添加 controls
			video.controls = true;
			// 插入 video
			div.appendChild(video);
			// 设置 div 属性
			div.style.display = "center"; // 居中
			div.style.margin = "20px auto"; // 设置 margin
			// 插入 div
			doc.body.appendChild(div);
		} else if (typeof item.insert === "string") {
			// 创建文本
			const text = document.createElement("span");
			// 设置文本属性
			// 创建 style string
			if (item.attributes) {
				let styleString = "";
				if (item.attributes.color) styleString += `color: ${item.attributes.color};`;
				// 设置 style
				text.style.cssText = styleString;
			}
			text.innerText = item.insert; // 设置文本
			// 插入文本
			doc.body.appendChild(text);
		}
	});
	// doc 宽度设为 800,居中
	doc.body.style.width = "800px";
	doc.body.style.margin = "20px auto";
	return doc;
}
