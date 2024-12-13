/**
 * @file plugins/Bili/index.ts
 * @description Bili插件
 * @since Beta v0.4.0
 */

import getVideoUrl from "./request/getVideoUrl.js";
import getVideoView from "./request/getVideoView.js";

const Bili = { video: { view: getVideoView, url: getVideoUrl } };

export default Bili;
