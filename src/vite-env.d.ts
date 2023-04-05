/**
 * @file vite-env.d.ts
 * @description vite-env.d.ts
 * @author BTMuli<bt-muli@outlook.com>
 * @since Alpha v0.1.2
 */

declare module "*.vue" {
  import type { DefineComponent } from "vue";
  const component: DefineComponent<object, object, any>;
  export default component;
}

declare module "vue-json-viewer" {
  import type { DefineComponent } from "vue";
  const component: DefineComponent<object, object, any>;
  export default component;
}
