<template>
  <div class="collect-box" data-html2canvas-ignore>
    <div class="collect-btn" @click="switchCollect()" :title="isCollected ? '取消收藏' : '收藏'">
      <v-icon :color="isCollected ? 'yellow' : 'white'">
        {{ isCollected ? "mdi-star" : "mdi-star-outline" }}
      </v-icon>
    </div>
  </div>
</template>
<script lang="ts" setup>
import { onMounted, ref } from "vue";

import TGSqlite from "../../plugins/Sqlite";
import showConfirm from "../func/confirm";
import showSnackbar from "../func/snackbar";

const isCollected = ref(false);
const collect = ref<Array<string>>([]);

interface TSetCollectProps {
  modelValue: number;
  data: TGApp.Plugins.Mys.Post.FullData | undefined;
}

const props = defineProps<TSetCollectProps>();

onMounted(async () => await getCollect());

async function getCollect(): Promise<void> {
  const res = await TGSqlite.checkPostCollect(props.modelValue.toString());
  if (res !== false) {
    isCollected.value = true;
    try {
      collect.value = JSON.parse(res);
      console.warn(collect.value);
    } catch (e) {
      showSnackbar({
        text: `收藏数据解析失败: ${res}`,
        color: "error",
      });
    }
  }
}

async function switchCollect(): Promise<void> {
  if (isCollected.value === false) {
    collect.value = ["default"];
    if (props.data === undefined) {
      showSnackbar({
        text: "获取帖子数据失败",
        color: "error",
      });
      return;
    }
    await TGSqlite.collectPost(props.data, collect.value);
    isCollected.value = true;
    showSnackbar({
      text: "收藏成功",
      color: "success",
    });
    return;
  }
  if (collect.value.length > 1) {
    const check = await showConfirm({
      title: "确定取消收藏？",
      text: "该帖子有多个收藏分类，是否全部取消？",
    });
    if (!check) {
      return;
    }
  }
  await TGSqlite.cancelCollect(props.modelValue.toString());
  isCollected.value = false;
  showSnackbar({
    text: "取消收藏成功",
    color: "success",
  });
}
</script>
<style lang="css" scoped>
.collect-box {
  position: absolute;
  top: 80px;
  right: 20px;
  border: 2px solid var(--common-shadow-8);
  border-radius: 50%;
  cursor: pointer;
}

.collect-box:hover {
  opacity: 0.8;
}

.collect-btn {
  display: flex;
  width: 24px;
  height: 24px;
  align-items: center;
  justify-content: center;
  padding-right: 2px;
  margin: 5px;
}
</style>
