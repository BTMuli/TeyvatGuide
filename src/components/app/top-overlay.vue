<!-- 带遮罩的悬浮窗：TOverlay + 面板壳 -->
<template>
  <TOverlay
    v-model="visible"
    :blurVal="props.blurVal"
    :outerClose="props.outerClose"
    :topOffset="props.topOffset"
    :zIndex="props.zIndex"
  >
    <div class="topo-container">
      <slot name="left" />
      <TOverlayPanel
        ref="panelRef"
        :closeAriaLabel="props.closeAriaLabel"
        :contentMaxHeight="props.contentMaxHeight"
        :panelMaxHeight="props.panelMaxHeight"
        :panelWidth="props.panelWidth"
        :shareAriaLabel="props.shareAriaLabel"
        :shareCaption="props.shareCaption"
        :shareScale="props.shareScale"
        :shareTitle="props.shareTitle"
        :showShare="props.showShare"
        :titleId="props.titleId"
        @close="closeOverlay"
        @share="emits('share')"
      >
        <template v-if="slots.header" #header>
          <slot name="header" />
        </template>
        <template v-if="slots.actions" #actions>
          <slot name="actions" />
        </template>
        <slot />
        <template v-if="slots.toolbar" #toolbar>
          <slot name="toolbar" />
        </template>
        <template v-if="slots.footer" #footer>
          <slot name="footer" />
        </template>
        <template v-if="slots.share" #share>
          <slot name="share" />
        </template>
      </TOverlayPanel>
      <slot name="right" />
    </div>
  </TOverlay>
</template>

<script lang="ts" setup>
import TOverlayPanel from "@comp/app/t-overlay-panel.vue";
import TOverlay from "@comp/app/t-overlay.vue";
import { useSlots, useTemplateRef } from "vue";

type TopOverlayProps = {
  /** 背景 blur，透传 TOverlay */
  blurVal?: string;
  /** 关闭按钮 aria-label */
  closeAriaLabel?: string;
  /**
   * 内容区最大高度
   * @remarks 传空字符串或 `none` 时不写 max-height，由面板高度 + flex 约束滚动
   */
  contentMaxHeight?: string;
  /** 点击外部关闭，透传 TOverlay */
  outerClose?: boolean;
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
  /** 浮窗顶部偏移，透传 TOverlay */
  topOffset?: string;
  /** zIndex，透传 TOverlay */
  zIndex?: number;
};

type TopOverlayEmits = {
  close: [];
  share: [];
};

const props = withDefaults(defineProps<TopOverlayProps>(), {
  blurVal: "20px",
  closeAriaLabel: "关闭",
  contentMaxHeight: "480px",
  outerClose: true,
  panelWidth: "800px",
  shareAriaLabel: "保存分享图",
  shareCaption: "",
  shareScale: 1.5,
  showShare: true,
  topOffset: "0px",
  zIndex: 100,
});

const emits = defineEmits<TopOverlayEmits>();
const visible = defineModel<boolean>({ default: false });
const slots = useSlots();
const panelRef = useTemplateRef<InstanceType<typeof TOverlayPanel>>("panelRef");

/**
 * 关闭遮罩浮窗
 * @since Beta v0.11.4
 */
function closeOverlay(): void {
  visible.value = false;
  emits("close");
}

/**
 * 触发面板内置分享
 * @since Beta v0.11.4
 */
async function handleShare(): Promise<void> {
  await panelRef.value?.handleShare();
}

defineExpose({
  closeOverlay,
  closePanel: closeOverlay,
  handleShare,
  get content() {
    return panelRef.value?.content ?? null;
  },
  get panel() {
    return panelRef.value?.panel ?? null;
  },
});

defineSlots<{
  actions?: () => unknown;
  default?: () => unknown;
  footer?: () => unknown;
  header?: () => unknown;
  left?: () => unknown;
  right?: () => unknown;
  share?: () => unknown;
  toolbar?: () => unknown;
}>();
</script>

<style lang="scss" scoped>
.topo-container {
  display: flex;
  max-height: calc(100% - 32px);
  align-items: center;
  justify-content: center;
  gap: 16px;
}

@media (width <= 720px) {
  .topo-container {
    gap: 8px;
  }
}
</style>
