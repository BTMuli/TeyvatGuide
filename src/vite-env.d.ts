/**
 * @file vite-env.d.ts
 * @description vite-env.d.ts
 * @author BTMuli<bt-muli@outlook.com>
 * @since Beta v0.3.3
 */

declare module "*.vue" {
  import type { DefineComponent } from "vue";
  const component: DefineComponent<object, object, any>;
  export default component;
}

/**
 * @description vue-json-viewer
 * @package vue-json-viewer
 * @version 3.0.4
 */
declare module "vue-json-viewer" {
  import type { DefineComponent } from "vue";
  const component: DefineComponent<{
    value: any;
    copyable: boolean;
    boxed: boolean;
  }>;
  export default component;
}

/**
 * @description import.meta.env
 * @package vite
 * @description 只写了用到的属性
 */
interface ImportMetaEnv {
  TAURI_ARCH: string;
  TAURI_DEBUG: boolean;
  TAURI_FAMILY: string;
  TAURI_KEY_PASSWORD: string;
  TAURI_PLATFORM: string;
  TAURI_PLATFORM_TYPE: string;
  BASE_URL: string;
  MODE: string;
  DEV: boolean;
  PROD: boolean;
  SSR: boolean;
}

declare interface ImportMeta {
  readonly env: ImportMetaEnv;
}
