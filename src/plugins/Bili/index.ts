/**
 * @file plugins/Bili/index.ts
 * @description Bili插件
 * @since Beta v0.4.0
 */

import getVideoView from "./request/getVideoView";

const Bili = {
  video: {
    view: getVideoView,
  },
};

export default Bili;
