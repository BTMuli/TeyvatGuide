<template>
  <!-- todo 编辑收藏合集的 overlay -->
  <div class="collect-box" data-html2canvas-ignore>
    <div class="collect-btn" @click="switchCollect()" :title="isCollected ? '取消收藏' : '收藏'">
      <v-icon :color="isCollected ? 'yellow' : 'white'">
        {{ isCollected ? "mdi-star" : "mdi-star-outline" }}
      </v-icon>
    </div>
  </div>
</template>
<script lang="ts" setup>
import DataBase from "tauri-plugin-sql-api";
import { onBeforeMount, ref } from "vue";

import TGSqlite from "../../plugins/Sqlite";
import TSUserCollection from "../../plugins/Sqlite/modules/userCollect";
import showConfirm from "../func/confirm";
import showSnackbar from "../func/snackbar";

const isCollected = ref(false);
const collect = ref<Array<TGApp.Sqlite.UserCollection.UFMap>>([]);
const db = ref<DataBase | undefined>(undefined);

interface TSetCollectProps {
  modelValue: number;
  data: TGApp.Plugins.Mys.Post.FullData | undefined;
}

const props = defineProps<TSetCollectProps>();

onBeforeMount(async () => {
  db.value = await TGSqlite.getDB();
  const check = await TSUserCollection.getCollectPost(db.value, props.modelValue.toString());
  if (typeof check === "boolean") {
    isCollected.value = check;
    return;
  }
  isCollected.value = true;
  collect.value = check;
});

async function switchCollect(): Promise<void> {
  if (db.value === undefined) {
    showSnackbar({
      text: "未获取到数据库",
      color: "error",
    });
    return;
  }
  if (isCollected.value === false) {
    if (props.data === undefined) {
      showSnackbar({
        text: "未获取到帖子信息",
        color: "error",
      });
      return;
    }
    await TSUserCollection.addCollect(db.value, props.modelValue.toString(), props.data);
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
  await TSUserCollection.deletePostCollect(db.value, props.modelValue.toString(), true);
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
