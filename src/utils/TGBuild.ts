/**
 * @file utils TGBuild.ts
 * @description 用于获取 vite 打包时间
 * @see https://gitee.com/lihanspace/vite-plugin-build-time
 * @author BTMuli<bt-muli@outlook.com>
 * @since Alpha v0.1.4
 */

import { type Plugin } from "vite";

const buildTimeKey = "buildTime";

const buildTimePlugin = (modes: string[] = []): Plugin => {
  let _mode = "";
  return {
    name: "build-time",
    config(uc, { mode }) {
      _mode = mode;
    },
    transformIndexHtml() {
      if (_mode !== "production" && !modes.includes(_mode)) return;
      return [
        {
          tag: "script",
          children: `window.${buildTimeKey} = '${Math.floor(Date.now() / 1000)}'`,
        },
      ];
    },
  };
};

export const getBuildTime = (): string => {
  if (typeof window === "undefined") {
    console.warn("getBuildTime() should only be called in the browser");
    return "dev";
  }
  const windowEnv = <typeof window & { [buildTimeKey]?: string }>window;
  if (!windowEnv[buildTimeKey]) {
    console.info("当前环境为开发环境");
    return `dev.${Math.floor(Date.now() / 1000)}`;
  }
  return windowEnv[buildTimeKey];
};

export default buildTimePlugin;
