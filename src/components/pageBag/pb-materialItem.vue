<!-- 背包材料物品项 -->
<template>
  <div :title="props.info.name" class="pb-mi-box" @click="toMaterial()">
    <div class="pb-mi-left">
      <img :src="`/icon/bg/${props.info.star}-Star.webp`" alt="bg" class="pb-mi-bg" />
      <img :src="`/icon/material/${props.info.id}.webp`" alt="icon" class="pb-mi-icon" />
    </div>
    <div class="pb-mi-right">{{ props.info.name }}</div>
    <div class="pb-mi-id">{{ props.info.id }}</div>
    <div class="pb-mi-cnt">{{ item.count }}</div>
  </div>
</template>
<script lang="ts" setup>
import { shallowRef, watch } from "vue";

import type { MaterialInfo } from "@/pages/common/PageBagMaterial.vue";

/** 组件参数 */
type PbMaterialItemProps = {
  /** 数据库数据 */
  tb: TGApp.Sqlite.UserBag.TableMaterial;
  /** WIKI 数据 */
  info: TGApp.App.Material.WikiItem;
  /** 当前选中材料 */
  cur?: MaterialInfo;
};
/** 组件事件 */
type PbMaterialItemEmits = (e: "select", v: MaterialInfo) => void;

const props = defineProps<PbMaterialItemProps>();
const emits = defineEmits<PbMaterialItemEmits>();

const item = shallowRef<TGApp.Sqlite.UserBag.TableMaterial>(props.tb);

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
</script>
<style lang="scss" scoped>
@use "@styles/github.styles.scss" as github-styles;

.pb-mi-box {
  position: relative;
  display: flex;
  height: 45px;
  align-items: center;
  justify-content: flex-start;
  padding-right: 5px;
  border: 1px solid var(--common-shadow-1);
  border-radius: 5px;
  background: var(--box-bg-1);
  column-gap: 5px;
  cursor: pointer;
}

.pb-mi-left {
  position: relative;
  width: 45px;
  height: 45px;
  border-bottom-left-radius: 5px;
  border-top-left-radius: 5px;
}

.pb-mi-bg,
.pb-mi-icon {
  position: absolute;
  top: 0;
  width: 45px;
  height: 45px;
  border-bottom-left-radius: 5px;
  border-top-left-radius: 5px;
}

.pb-mi-right {
  position: relative;
  overflow: hidden;
  max-width: calc(100% - 50px);
  color: var(--box-text-2);
  font-size: 14px;
  text-overflow: ellipsis;
  white-space: nowrap;
  word-break: break-all;
}

.pb-mi-id {
  position: absolute;
  right: 4px;
  bottom: 2px;
  font-size: 8px;
  opacity: 0.6;
}

.pb-mi-cnt {
  @include github-styles.github-tag-dark-gen(#82aaff);

  position: absolute;
  top: 0;
  right: 0;
  padding-right: 4px;
  padding-left: 12px;
  border-top: unset;
  border-left: unset;
  border-bottom-left-radius: 20px;
  border-top-right-radius: 4px;
  font-family: var(--font-title);
  font-size: 10px;
  text-align: center;
}
</style>
