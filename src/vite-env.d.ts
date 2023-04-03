/// <reference types="vite/client" />

declare module "*.vue" {
	import type { DefineComponent } from "vue";
	const component: DefineComponent<{}, {}, any>;
	export default component;
}

declare module 'vue-json-viewer' {
	import { Plugin } from 'vue';
	const plugin: Plugin;
	export default plugin;
}