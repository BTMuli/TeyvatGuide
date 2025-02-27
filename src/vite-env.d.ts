/**
 * @file vite-env.d.ts
 * @description 全局类型定义文件
 * @since Beta v0.5.1
 */

/**
 * @description vue 文件类型声明
 */
declare module "*.vue" {
  import type { DefineComponent } from "vue";
  const component: DefineComponent<object, object, any>;
  export default component;
}

declare type ImportMeta = { readonly env: { MODE: string } };

declare interface TauriProcessEnv extends NodeJS.ProcessEnv {
  TAURI_ARCH?: string;
  TAURI_DEBUG?: boolean;
  TAURI_FAMILY?: string;
  TAURI_KEY_PASSWORD?: string;
  TAURI_PLATFORM?: string;
  TAURI_PLATFORM_TYPE?: string;
}
