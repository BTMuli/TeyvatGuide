<!-- 背包材料物品项 -->
<template>
  <div
    :class="{ empty: item.count === 0 }"
    :title="props.info.name"
    class="pb-mi-box"
    @click="toMaterial()"
  >
    <div class="pb-mi-left">
      <img :src="`/icon/bg/${props.info.star}-Star.webp`" alt="bg" class="bg" />
      <img :src="`/icon/material/${props.info.id}.webp`" alt="icon" class="icon" />
    </div>
    <div class="pb-mi-right">{{ props.info.name }}</div>
    <div class="pb-mi-extra">{{ props.info.type }}·{{ props.info.id }}</div>
    <div class="pb-mi-cnt">{{ item.count }}</div>
  </div>
</template>
<script lang="ts" setup>
import { getOdStarColor } from "@utils/colorFunc.js";
import { computed, shallowRef, watch } from "vue";

import type { MaterialInfo } from "@/pages/common/PageBagMaterial.vue";

/** 组件参数 */
type PbMaterialItemProps = {
  /** 数据库数据 */
  tb: TGApp.Sqlite.UserBag.MaterialTable;
  /** WIKI 数据 */
  info: TGApp.App.Material.WikiItem;
  /** 当前选中材料 */
  cur?: MaterialInfo;
};
/** 组件事件 */
type PbMaterialItemEmits = (e: "select", v: MaterialInfo) => void;

const props = defineProps<PbMaterialItemProps>();
const emits = defineEmits<PbMaterialItemEmits>();

const item = shallowRef<TGApp.Sqlite.UserBag.MaterialTable>(props.tb);

function toMaterial(): void {
  emits("select", { tb: item.value, info: props.info });
}

watch(
  () => props.cur,
  () => {
    if (props.cur && props.cur.info.id === props.info.id) {
      item.value = props.cur.tb;
    }
  },
);

const idColor = computed<string>(() => getOdStarColor(props.info.star));
</script>
<style lang="scss" scoped>
@use "@styles/github.styles.scss" as github-styles;

$pb-mi-base: v-bind(idColor); /* stylelint-disable-line value-keyword-case */

.pb-mi-box {
  position: relative;
  display: flex;
  overflow: hidden;
  height: 48px;
  box-sizing: border-box;
  align-items: center;
  justify-content: flex-start;
  padding-right: 8px;
  border: 1px solid color-mix(in srgb, $pb-mi-base 20%, transparent);
  border-radius: 4px;
  background: color-mix(in srgb, $pb-mi-base 15%, transparent);
  column-gap: 4px;
  cursor: pointer;

  &.empty {
    opacity: 0.4;

    .pb-mi-cnt {
      color: var(--tgc-od-red);
    }
  }
}

.pb-mi-left {
  position: relative;
  height: 100%;
  flex-shrink: 0;
  aspect-ratio: 1;

  .bg,
  .icon {
    position: absolute;
    top: 0;
    width: 100%;
    height: 100%;
    vertical-align: center;
  }
}

.pb-mi-right {
  position: relative;
  overflow: hidden;
  max-width: 100%;
  color: var(--box-text-2);
  font-size: 14px;
  text-overflow: ellipsis;
  white-space: nowrap;
  word-break: break-all;
}

.pb-mi-extra {
  position: absolute;
  z-index: 1;
  right: 2px;
  bottom: 0;
  color: $pb-mi-base;
  font-size: 8px;
  font-style: italic;
  opacity: 0.8;
}

.pb-mi-cnt {
  @include github-styles.github-tag-dark-gen($pb-mi-base);

  position: absolute;
  top: 0;
  right: 0;
  box-sizing: border-box;
  padding-right: 4px;
  padding-left: 12px;
  border-top: unset;
  border-right: unset;
  border-bottom-left-radius: 12px;
  font-family: var(--font-title);
  font-size: 10px;
  line-height: 12px;
  text-align: center;
}
</style>
