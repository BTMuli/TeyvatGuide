<template>
  <div class="tbc-box" data-html2canvas-ignore>
    <div class="tbc-btn" @click="switchCollect()" :title="isCollected ? '取消收藏' : '收藏'">
      <v-icon :color="isCollected ? 'yellow' : 'inherit'">
        {{ isCollected ? "mdi-star" : "mdi-star-outline" }}
      </v-icon>
    </div>
    <div class="tbc-edit" title="编辑收藏" v-if="isCollected" @click="showEdit = !showEdit">
      <v-icon size="small">mdi-pencil</v-icon>
    </div>
  </div>
  <VpOverlayCollect v-model="showEdit" :post="props.data" @submit="refresh()" />
</template>
<script lang="ts" setup>
import showDialog from "@comp/func/dialog.js";
import showSnackbar from "@comp/func/snackbar.js";
import TSUserCollection from "@Sqlite/modules/userCollect.js";
import { event } from "@tauri-apps/api";
import { onBeforeMount, ref, shallowRef, watch } from "vue";

import VpOverlayCollect from "./vp-overlay-collect.vue";

import TGLogger from "@/utils/TGLogger.js";

type TbCollectProps = { modelValue: number; data?: TGApp.BBS.Post.FullData };

const props = defineProps<TbCollectProps>();
const isCollected = ref<boolean>(false);
const showEdit = ref<boolean>(false);
const collect = shallowRef<Array<TGApp.Sqlite.UserCollection.UFMap>>([]);

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
<style lang="css" scoped>
.tbc-box {
  position: fixed;
  top: 70px;
  right: 20px;
  border: 2px solid var(--common-shadow-8);
  border-radius: 50%;
  cursor: pointer;

  :hover {
    opacity: 0.8;
  }
}

.tbc-btn {
  display: flex;
  width: 24px;
  height: 24px;
  align-items: center;
  justify-content: center;
  margin: 5px;
}

.tbc-edit {
  position: absolute;
  right: -10px;
  bottom: -10px;
  display: flex;
  width: 20px;
  height: 20px;
  align-items: center;
  justify-content: center;
  cursor: pointer;
}
</style>
