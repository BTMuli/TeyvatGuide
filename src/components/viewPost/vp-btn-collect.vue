<template>
  <div class="tbc-box" :class="isCollected ? 'active' : ''" data-html2canvas-ignore>
    <div class="tbc-btn" @click="switchCollect()" :title="isCollected ? '取消收藏' : '收藏'">
      <v-icon size="20">
        {{ isCollected ? "mdi-star" : "mdi-star-outline" }}
      </v-icon>
    </div>
    <div class="tbc-edit" title="编辑收藏" v-if="isCollected" @click="showEdit = !showEdit">
      <v-icon size="8">mdi-pencil</v-icon>
    </div>
  </div>
  <VpOverlayCollect v-model="showEdit" :post="props.data" @submit="refresh()" />
</template>
<script lang="ts" setup>
import showDialog from "@comp/func/dialog.js";
import showSnackbar from "@comp/func/snackbar.js";
import TSUserCollection from "@Sqlm/userCollect.js";
import { event } from "@tauri-apps/api";
import TGLogger from "@utils/TGLogger.js";
import { onBeforeMount, ref, shallowRef, watch } from "vue";

import VpOverlayCollect from "./vp-overlay-collect.vue";

type TbCollectProps = { modelValue: number; data?: TGApp.BBS.Post.FullData };

const props = defineProps<TbCollectProps>();
const isCollected = ref<boolean>(false);
const showEdit = ref<boolean>(false);
const collect = shallowRef<Array<TGApp.Sqlite.Collection.PcMap>>([]);

onBeforeMount(async () => await refresh());

async function refresh(): Promise<void> {
  await event.emit("refreshCollect");
  const check = await TSUserCollection.getPostCollect(props.modelValue.toString());
  if (typeof check === "boolean") {
    isCollected.value = check;
    collect.value = [];
    return;
  }
  isCollected.value = true;
  collect.value = check;
}

watch(
  () => props.data,
  async (val) => {
    if (!val) return;
    if (!isCollected.value) return;
    const res = await TSUserCollection.updatePostInfo(props.modelValue.toString(), val);
    await event.emit("refreshCollect");
    if (!res) {
      showSnackbar.warn("更新帖子信息失败，数据库中不存在帖子信息！");
      return;
    }
    showSnackbar.success("已更新帖子信息");
    await TGLogger.Info(`[TbCollect] 更新帖子信息：${props.modelValue.toString()}`);
  },
);

async function switchCollect(): Promise<void> {
  if (!isCollected.value) {
    if (!props.data) {
      showSnackbar.warn("未获取到帖子信息");
      return;
    }
    await TSUserCollection.addCollect(props.modelValue.toString(), props.data);
    await event.emit("refreshCollect");
    isCollected.value = true;
    showSnackbar.success("收藏成功");
    return;
  }
  if (collect.value.length > 1) {
    const check = await showDialog.check("确定取消收藏？", "该帖子有多个收藏分类，是否全部取消？");
    if (!check) return;
  }
  await TSUserCollection.deletePostCollect(props.modelValue.toString(), true);
  await event.emit("refreshCollect");
  isCollected.value = false;
  showSnackbar.success("取消收藏成功");
}
</script>
<style lang="scss" scoped>
@use "@styles/github.styles.scss" as github-styles;

.tbc-box {
  @include github-styles.github-card;

  position: fixed;
  z-index: 1;
  top: 64px;
  right: 16px;
  display: flex;
  width: 36px;
  height: 36px;
  box-sizing: border-box;
  align-items: center;
  justify-content: center;
  border-radius: 50%;
  cursor: pointer;

  &.active {
    background: var(--tgc-btn-1);
    box-shadow: 1px 3px 6px var(--common-shadow-2);
    color: var(--btn-text);
  }

  &:hover:not(.active) {
    background: var(--common-shadow-1);
  }
}

.dark .tbc-box {
  border: 1px solid var(--common-shadow-1);
  box-shadow: 1px 3px 6px var(--common-shadow-t-2);

  &:not(.active) {
    @include github-styles.github-card("dark");

    &:hover {
      background: var(--common-shadow-6);
    }
  }
}

.tbc-btn {
  position: relative;
  z-index: 1;
  display: flex;
  width: 20px;
  height: 20px;
  align-items: center;
  justify-content: center;
}

.tbc-edit {
  @include github-styles.github-card;

  position: absolute;
  z-index: 2;
  right: -4px;
  bottom: -4px;
  display: flex;
  width: 16px;
  height: 16px;
  box-sizing: border-box;
  align-items: center;
  justify-content: center;
  border: unset;
  border-radius: 50%;
  cursor: pointer;
}

.dark .tbc-edit {
  @include github-styles.github-card("dark");
}
</style>
