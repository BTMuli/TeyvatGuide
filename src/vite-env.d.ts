/**
 * @file vite-env.d.ts
 * @description vite-env.d.ts
 * @author BTMuli<bt-muli@outlook.com>
 * @since Alpha v0.1.3
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
 * @todo 仅声明了用到的属性
 */
declare module "vue-json-viewer" {
  import type { DefineComponent } from "vue";
  const component: DefineComponent<{
    value: any
    copyable: boolean
    boxed: boolean
  }>;
  export default component;
}
