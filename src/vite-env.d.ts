/**
 * 全局类型定义文件
 * @since Beta v0.7.6
 */

/**
 * vue 文件类型声明
 */
declare module "*.vue" {
  import type { defineComponent } from "vue";
  const component: ReturnType<typeof defineComponent>;
  export default component;
}

/**
 * 扩展的 `import.meta` 对象。
 * @remarks 在运行时提供环境变量信息，通常由构建工具（如 Vite）注入。
 */
declare type ImportMeta = {
  readonly env: {
    /**
     * 当前运行模式。
     * @remarks 由构建工具注入，常见取值包括：
     * - `"development"` 开发模式
     * - `"production"` 生产模式
     * - `"test"` 测试模式
     */
    MODE: string;
    /**
     * Sentry Release
     */
    VITE_SENTRY_RELEASE: string;
  };
};

/**
 * 扩展的 Tauri 运行时环境变量。
 * @remarks 基于 NodeJS.ProcessEnv，增加了 Tauri 构建相关的环境变量。
 */
declare type TauriProcessEnv = NodeJS.ProcessEnv & {
  /** 架构信息，例如 `"x64"`、`"arm64"`。 */
  TAURI_ARCH?: string;
  /** 是否启用调试模式 */
  TAURI_DEBUG?: boolean;
  /** 系统家族，例如 `"windows"`、`"unix"`。 */
  TAURI_FAMILY?: string;
  /** Tauri 密钥的密码，用于签名。 */
  TAURI_KEY_PASSWORD?: string;
  /** 平台名称，例如 `"win32"`、`"darwin"`、`"linux"`。 */
  TAURI_PLATFORM?: string;
  /** 平台类型，例如 `"desktop"`。 */
  TAURI_PLATFORM_TYPE?: string;
};

/**
 * ProcessEnv的转换
 */
declare const proEnv: TauriProcessEnv;
