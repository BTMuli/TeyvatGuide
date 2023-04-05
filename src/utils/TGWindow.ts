/**
 * @file utils TGWindow.ts
 * @description 用于创建TG窗口的工具
 * @author BTMuli<bt-muli@outlook.com>
 * @since Alpha v0.1.2
 */

import { window as TauriWindow } from "@tauri-apps/api";
/**
 * @description 创建TG窗口
 * @since Alpha v0.1.2
 * @param {string} url 窗口地址
 * @param {string} label 窗口标签
 * @param {string} title 窗口标题
 * @param {number} width 窗口宽度
 * @param {number} height 窗口高度
 * @param {boolean} resizable 是否可调整大小
 * @returns {void}
 */
export function createTGWindow(
	url: string,
	label: string,
	title: string,
	width: number,
	height: number,
	resizable: boolean
): void {
	// 计算窗口位置
	const left = (window.screen.width - width) / 2;
	const top = (window.screen.height - height) / 2;
	// https://github.com/tauri-apps/tauri/issues/5380
	new TauriWindow.WebviewWindow(label, {
		height: height,
		width: width,
		x: left,
		y: top,
		resizable: resizable,
		url: url,
		title: title,
		visible: false,
	});
	new TauriWindow.WindowManager(label).close().then(() => {
		new TauriWindow.WebviewWindow(label, {
			height: height,
			width: width,
			x: left,
			y: top,
			resizable: resizable,
			url: url,
			title: title,
			visible: false,
		});
	});
}
