<template>
  <TOverlay v-model="visible" hide :to-click="onCancel" blur-val="20px">
    <div class="tocp-container">
      <div class="tocp-title">选择分类</div>
      <div class="tocp-list">
        <v-list-item v-for="item in collectList" :key="item.id">
          <template #prepend>
            <v-list-item-action start>
              <v-checkbox-btn v-model="select" :value="item.title" />
            </v-list-item-action>
          </template>
          <template #title>{{ item.title }}</template>
          <template #subtitle>{{ item.desc }}</template>
        </v-list-item>
      </div>
      <div class="tocp-bottom">
        <v-btn class="tocp-btn" rounded @click="newCollect">新建分类</v-btn>
        <v-btn class="tocp-btn" rounded @click="onCancel">取消</v-btn>
        <v-btn :loading="submit" class="tocp-btn" rounded @click="onSubmit">确定</v-btn>
      </div>
    </div>
  </TOverlay>
</template>
<script setup lang="ts">
import { computed, ref, watch } from "vue";

import TSUserCollection from "../../plugins/Sqlite/modules/userCollect.js";
import showConfirm from "../func/confirm.js";
import showSnackbar from "../func/snackbar.js";
import TOverlay from "../main/t-overlay.vue";

interface ToPostCollectProps {
  modelValue: boolean;
  post: string[];
}

interface ToPostCollectEmits {
  (e: "update:modelValue", value: boolean): void;

  (e: "submit"): void;
}

const props = defineProps<ToPostCollectProps>();
const emits = defineEmits<ToPostCollectEmits>();
const select = ref<string>();
const collectList = ref<TGApp.Sqlite.UserCollection.UFCollection[]>([]);
const submit = ref(false);

const visible = computed({
  get: () => props.modelValue,
  set: (value) => {
    emits("update:modelValue", value);
  },
});

function onCancel() {
  visible.value = false;
}

watch(
  () => props.modelValue,
  async (val) => {
    if (val) {
      await freshData();
    }
  },
);

async function onSubmit(): Promise<void> {
  if (!select.value) {
    showSnackbar({
      text: "请选择分类",
      color: "error",
    });
    return;
  }
  submit.value = true;
  let force = false;
  const forceCheck = await showConfirm({
    title: "是否保留原分类",
    text: "若否则仅保留新分类",
  });
  if (forceCheck === false) force = true;
  const check = await TSUserCollection.updatePostsCollect(props.post, select.value, force);
  if (!check) {
    showSnackbar({
      text: "处理失败",
      color: "error",
    });
    submit.value = false;
    return;
  }
  showSnackbar({
    text: `成功处理 ${props.post.length} 个帖子`,
    color: "success",
  });
  submit.value = false;
  visible.value = false;
  emits("submit");
}

async function newCollect(): Promise<void> {
  let title, desc;
  const titleC = await showConfirm({
    mode: "input",
    title: "新建分类",
    text: "请输入分类名称",
  });
  if (titleC === undefined || titleC === false) return;
  if (titleC === "未分类") {
    showSnackbar({
      text: "分类名不可为未分类",
      color: "error",
    });
    return;
  }
  if (collectList.value.find((i) => i.title === titleC)) {
    showSnackbar({
      text: "分类已存在",
      color: "error",
    });
    return;
  }
  title = titleC;
  const descC = await showConfirm({
    mode: "input",
    title: "新建分类",
    text: "请输入分类描述",
  });
  if (descC === false) return;
  if (descC === undefined) desc = title;
  else desc = descC;
  const res = await TSUserCollection.createCollect(title, desc);
  if (res) {
    showSnackbar({
      text: "新建成功",
      color: "success",
    });
    await freshData();
  } else {
    showSnackbar({
      text: "新建失败",
      color: "error",
    });
  }
}

async function freshData(): Promise<void> {
  collectList.value = await TSUserCollection.getCollectList();
  select.value = undefined;
}
</script>
<style lang="css" scoped>
.tocp-container {
  display: flex;
  width: 400px;
  flex-direction: column;
  align-items: flex-start;
  justify-content: center;
  padding: 10px;
  border-radius: 10px;
  background: var(--app-page-bg);
  row-gap: 10px;
}

.tocp-title {
  font-family: var(--font-title);
  font-size: 20px;
}

.tocp-list {
  display: flex;
  width: 100%;
  max-height: 300px;
  flex-direction: column;
  overflow-y: auto;
  row-gap: 10px;
}

.tocp-bottom {
  display: flex;
  align-items: center;
  justify-content: center;
  margin-top: 20px;
  margin-left: auto;
  column-gap: 10px;
}

.tocp-btn {
  background: var(--btn-bg-1);
  color: var(--btn-text-1);
  font-family: var(--font-title);
}

.dark .tocp-btn {
  border: 1px solid var(--common-shadow-2);
}
</style>
