<!-- 悬浮窗面板壳：header / content / footer / share（不含遮罩） -->
<template>
  <article
    ref="panel"
    :aria-labelledby="titleIdAttr"
    aria-modal="true"
    class="tolp-panel"
    role="dialog"
    :style="panelStyle"
  >
    <header class="tolp-header">
      <div class="tolp-heading">
        <slot name="header" />
      </div>
      <div class="tolp-actions" data-html2canvas-ignore="true">
        <slot name="actions">
          <v-btn
            v-if="props.showShare"
            :loading="shareLoading"
            :aria-label="props.shareAriaLabel"
            density="comfortable"
            icon="mdi-share-variant"
            :title="props.shareAriaLabel"
            variant="text"
            @click="handleShare"
          />
          <v-btn
            :aria-label="props.closeAriaLabel"
            :disabled="props.closeDisabled"
            density="comfortable"
            icon="mdi-close"
            :title="props.closeAriaLabel"
            variant="text"
            @click="closePanel"
          />
        </slot>
      </div>
    </header>

    <main ref="content" class="tolp-content" :style="contentStyle">
      <slot />
    </main>

    <div v-if="hasToolbar" class="tolp-toolbar" data-html2canvas-ignore="true">
      <slot name="toolbar" />
    </div>

    <footer v-if="hasFooter" class="tolp-footer" data-html2canvas-ignore="true">
      <slot name="footer" />
    </footer>

    <div v-if="hasShare" class="tolp-share">
      <slot name="share">
        <span>{{ props.shareCaption }}</span>
        <span> · TeyvatGuide v{{ version }}</span>
      </slot>
    </div>
  </article>
</template>

<script lang="ts" setup>
import showLoading from "@comp/func/loading.js";
import showSnackbar from "@comp/func/snackbar.js";
import { getVersion } from "@tauri-apps/api/app";
import { generateShareImg } from "@utils/share/TGShare.js";
import TGLogger from "@utils/system/TGLogger.js";
import { computed, onBeforeUnmount, onMounted, ref, useSlots, useTemplateRef } from "vue";

type TolpProps = {
  /** 关闭按钮 aria-label */
  closeAriaLabel?: string;
  /** 操作期间禁止关闭 */
  closeDisabled?: boolean;
  /**
   * 内容区最大高度
   * @remarks 传空字符串或 `none` 时不写 max-height，由面板高度 + flex 约束滚动
   */
  contentMaxHeight?: string;
  /** 面板固定高度 */
  panelHeight?: string;
  /** 面板最大高度 */
  panelMaxHeight?: string;
  /** 面板宽度 */
  panelWidth?: string;
  /** 分享按钮 aria-label */
  shareAriaLabel?: string;
  /** 默认署名文案（不含版本后缀）；非空时显示 share 区 */
  shareCaption?: string;
  /** 内置分享文件名；有值时点击分享直接截图面板 */
  shareTitle?: string;
  /** 分享图缩放 */
  shareScale?: number;
  /** 是否显示默认分享按钮 */
  showShare?: boolean;
  /** 与标题元素 id 对齐，供 aria-labelledby */
  titleId?: string;
};

type TolpEmits = {
  close: [];
  share: [];
};

const props = withDefaults(defineProps<TolpProps>(), {
  closeAriaLabel: "关闭",
  contentMaxHeight: "480px",
  panelWidth: "800px",
  shareAriaLabel: "保存分享图",
  shareCaption: "",
  shareScale: 1.5,
  showShare: true,
});

const emits = defineEmits<TolpEmits>();
const slots = useSlots();
const panel = useTemplateRef<HTMLElement>("panel");
const content = useTemplateRef<HTMLElement>("content");
const shareLoading = ref<boolean>(false);
const version = ref<string>("...");

const hasToolbar = computed<boolean>(() => slots.toolbar !== undefined);
const hasFooter = computed<boolean>(() => slots.footer !== undefined);
const hasShare = computed<boolean>(() => {
  if (slots.share !== undefined) return true;
  return props.shareCaption.trim().length > 0;
});

const titleIdAttr = computed<string | undefined>(() => {
  const id = props.titleId?.trim();
  return id && id.length > 0 ? id : undefined;
});

const panelStyle = computed<Record<string, string>>(() => {
  const style: Record<string, string> = { width: props.panelWidth };
  const height = props.panelHeight?.trim();
  if (height) style.height = height;
  const maxHeight = props.panelMaxHeight?.trim();
  if (maxHeight) style.maxHeight = maxHeight;
  return style;
});

const contentStyle = computed<Record<string, string>>(() => {
  const style: Record<string, string> = {};
  const maxHeight = (props.contentMaxHeight ?? "").trim();
  if (maxHeight.length > 0 && maxHeight !== "none") style.maxHeight = maxHeight;
  return style;
});

/**
 * 关闭面板（向外抛 close）
 * @since Beta v0.11.4
 */
function closePanel(): void {
  if (props.closeDisabled) return;
  emits("close");
}

/**
 * 分享：有 shareTitle 时截图面板，否则仅向外抛出 share
 * @since Beta v0.11.4
 */
async function handleShare(): Promise<void> {
  emits("share");
  const title = props.shareTitle?.trim();
  if (!title) return;
  const target = panel.value;
  if (!target) {
    showSnackbar.warn("分享内容不存在");
    return;
  }
  shareLoading.value = true;
  try {
    await showLoading.start("正在生成分享图片", title);
    await TGLogger.Info(`[TOverlayPanel][handleShare] 开始生成分享图片：${title}`);
    await generateShareImg(title, target, props.shareScale, true);
    await TGLogger.Info(`[TOverlayPanel][handleShare] 生成分享图片完成：${title}`);
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    showSnackbar.error(`生成分享图片失败：${message}`);
    await TGLogger.Error(`[TOverlayPanel][handleShare] ${message}`);
  } finally {
    await showLoading.end();
    shareLoading.value = false;
  }
}

/**
 * 判断当前面板是否位于同类面板栈顶部。
 * @since Beta v0.13.1
 * @returns 是否为最上层面板
 */
function isTopPanel(): boolean {
  const panels = document.querySelectorAll<HTMLElement>(".tolp-panel");
  return panels.length > 0 && panels[panels.length - 1] === panel.value;
}

/**
 * 判断焦点是否在 Vuetify 浮层（菜单或对话框）内。
 * @since Beta v0.13.1
 * @returns 焦点是否位于 Vuetify 浮层容器
 */
function isFocusInVuetifyOverlay(): boolean {
  const active = document.activeElement;
  return active instanceof Element && active.closest(".v-overlay-container") !== null;
}

/**
 * 判断是否存在层级高于当前面板的 Vuetify 浮层。
 * @since Beta v0.13.1
 * @returns 是否存在更高层的 Vuetify 浮层
 */
function isVuetifyOverlayAbovePanel(): boolean {
  const overlays = Array.from(
    document.querySelectorAll<HTMLElement>(".v-overlay-container .v-overlay--active"),
  );
  if (overlays.length === 0) return false;
  const box = panel.value?.closest<HTMLElement>(".tolo-box");
  const panelZIndex =
    box === null || box === undefined ? 0 : Number.parseInt(getComputedStyle(box).zIndex, 10);
  return overlays.some((overlay) => {
    const interactive =
      overlay.matches('[role="menu"], [role="dialog"], [role="listbox"], .v-menu, .v-dialog') ||
      overlay.querySelector(
        '[role="menu"], [role="dialog"], [role="listbox"], .v-menu, .v-dialog',
      ) !== null;
    if (!interactive) return false;
    const overlayZIndex = Number.parseInt(getComputedStyle(overlay).zIndex, 10);
    return (
      Number.isFinite(overlayZIndex) &&
      overlayZIndex >= (Number.isFinite(panelZIndex) ? panelZIndex : 0)
    );
  });
}

/**
 * 处理最上层面板的 Esc 关闭，确认框显示时让出键盘事件。
 * @since Beta v0.13.1
 * @param event - 键盘事件
 */
function handlePanelEscape(event: KeyboardEvent): void {
  if (event.key !== "Escape") return;
  const dialog = document.querySelector<HTMLElement>("#tg-func-dialog .dialog-overlay");
  if (dialog && dialog.getClientRects().length > 0) return;
  if (!isTopPanel() || isFocusInVuetifyOverlay() || isVuetifyOverlayAbovePanel()) return;
  event.preventDefault();
  event.stopPropagation();
  if (props.closeDisabled) return;
  emits("close");
}

onMounted(async () => {
  document.addEventListener("keydown", handlePanelEscape, true);
  version.value = await getVersion();
});

onBeforeUnmount(() => {
  document.removeEventListener("keydown", handlePanelEscape, true);
});

defineExpose({
  closePanel,
  content,
  handleShare,
  panel,
});

defineSlots<{
  actions?: () => unknown;
  default?: () => unknown;
  footer?: () => unknown;
  header?: () => unknown;
  share?: () => unknown;
  toolbar?: () => unknown;
}>();
</script>

<style lang="scss" scoped>
.tolp-panel {
  position: relative;
  display: flex;
  overflow: hidden;
  max-width: calc(100vw - 160px);
  flex-direction: column;
  border: 1px solid var(--common-shadow-2);
  border-radius: 12px;
  background: var(--app-page-bg);
  box-shadow: 0 8px 24px var(--common-shadow-t-4);
}

.tolp-header {
  display: flex;
  align-items: center;
  padding: 16px;
  border-bottom: 1px solid var(--common-shadow-1);
  background: var(--dialog-header-bg);
  gap: 12px;
}

.tolp-heading {
  display: flex;
  min-width: 0;
  flex: 1;
  align-items: center;
  gap: 12px;
}

.tolp-actions {
  display: flex;
  flex-shrink: 0;
  align-items: center;
  color: var(--box-text-2);
  gap: 4px;
}

.tolp-content {
  display: flex;
  min-height: 0;
  flex: 1 1 auto;
  flex-direction: column;
  padding: 16px;
  gap: 12px;
  overflow-y: auto;
}

.tolp-toolbar {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  justify-content: flex-end;
  padding: 12px 16px;
  border-top: 1px solid var(--common-shadow-1);
  gap: 8px;
}

.tolp-footer {
  display: flex;
  flex-shrink: 0;
  align-items: center;
  justify-content: space-between;
  padding: 12px 16px;
  border-top: 1px solid var(--common-shadow-1);
  background: var(--dialog-footer-bg);
  gap: 16px;
}

.tolp-share {
  flex-shrink: 0;
  padding: 8px 16px;
  border-top: 1px solid var(--common-shadow-1);
  background: var(--dialog-footer-bg);
  color: var(--box-text-4);
  font-size: 10px;
  line-height: 14px;
  text-align: center;
}

@media (width <= 720px) {
  .tolp-panel {
    max-width: calc(100vw - 24px);
  }
}
</style>
