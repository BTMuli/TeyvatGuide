<!-- 编辑收藏帖子的合集 -->
<template>
  <TOverlay v-model="visible" hide :to-click="onCancel" blur-val="20px">
    <div class="topc-container">
      <div class="topc-post-info">
        {{ props.post?.post.subject }}
      </div>
      <div v-if="postCollect.length > 0" class="topc-cur-collect">
        当前所属分类：{{ postCollect.map((i) => i.collection).join(",") }}
      </div>
      <div v-else class="topc-cur-collect">当前所属分类：未分类</div>
      <div class="topc-collect-list">
        <v-list-item v-for="item in collectList" :key="item.id">
          <template #prepend>
            <v-list-item-action start>
              <v-checkbox-btn v-model="selectList" :value="item.title" />
            </v-list-item-action>
          </template>
          <template #title>{{ item.title }}</template>
          <template #subtitle>{{ item.desc }}</template>
          <template #append>
            <v-list-item-action end>
              <v-btn size="small" class="topc-btn" @click="deleteCollect(item)" icon="mdi-delete" />
            </v-list-item-action>
          </template>
        </v-list-item>
      </div>
      <div class="topc-bottom">
        <v-btn class="topc-btn" rounded @click="newCollect">新建分类</v-btn>
        <v-btn class="topc-btn" rounded @click="onCancel">取消</v-btn>
        <v-btn :loading="submit" class="topc-btn" rounded @click="onSubmit">确定</v-btn>
      </div>
    </div>
  </TOverlay>
</template>
<script setup lang="ts">
import { computed, ref, watch } from "vue";

import TSUserCollection from "../../plugins/Sqlite/modules/userCollect.js";
import showDialog from "../func/dialog.js";
import showSnackbar from "../func/snackbar.js";
import TOverlay from "../main/t-overlay.vue";

interface ToPostCollectProps {
  modelValue: boolean;
  post: TGApp.Plugins.Mys.Post.FullData | undefined;
}

interface ToPostCollectEmits {
  (e: "update:modelValue", value: boolean): void;

  (e: "submit"): void;
}

const props = defineProps<ToPostCollectProps>();
const emits = defineEmits<ToPostCollectEmits>();
const collectList = ref<TGApp.Sqlite.UserCollection.UFCollection[]>([]);
const postCollect = ref<TGApp.Sqlite.UserCollection.UFMap[]>([]);
const selectList = ref<string[]>([]);
const submit = ref(false);

watch(
  () => props.modelValue,
  async (val) => {
    if (val) {
      await freshData();
    }
  },
);

async function freshData(): Promise<void> {
  collectList.value = await TSUserCollection.getCollectList();
  if (!props.post) return;
  const collectRes = await TSUserCollection.getPostCollect(props.post.post.post_id.toString());
  if (Array.isArray(collectRes)) {
    postCollect.value = collectRes;
    selectList.value = postCollect.value.map((i) => i.collection);
  } else if (collectRes) {
    postCollect.value = [];
    selectList.value = [];
  }
}

const visible = computed({
  get: () => props.modelValue,
  set: (value) => {
    emits("update:modelValue", value);
  },
});

async function deleteCollect(item: TGApp.Sqlite.UserCollection.UFCollection): Promise<void> {
  const delCheck = await showDialog.check("确定删除分类?", "该分类若有帖子，则会变为未分类");
  if (!delCheck) {
    showSnackbar.cancel("取消删除");
    return;
  }
  const resD = await TSUserCollection.deleteCollect(item.title, false);
  if (!resD) {
    showSnackbar.error("删除失败");
    return;
  }
  showSnackbar.success("删除成功");
  await freshData();
}

async function newCollect(): Promise<void> {
  let title, desc;
  const titleC = await showDialog.input("新建分类", "请输入分类名称");
  if (titleC === undefined || titleC === false) return;
  if (titleC === "未分类") {
    showSnackbar.warn("分类名不可为未分类");
    return;
  }
  if (collectList.value.find((i) => i.title === titleC)) {
    showSnackbar.warn("分类已存在");
    return;
  }
  title = titleC;
  const descC = await showDialog.input("新建分类", "请输入分类描述");
  if (descC === false) return;
  if (descC === undefined) desc = title;
  else desc = descC;
  const res = await TSUserCollection.createCollect(title, desc);
  if (!res) {
    showSnackbar.error("新建失败");
    return;
  }
  showSnackbar.success("新建成功");
  await freshData();
}

async function onSubmit(): Promise<void> {
  if (!props.post) {
    showSnackbar.warn("未找到帖子信息");
    return;
  }
  submit.value = true;
  const res = await TSUserCollection.updatePostCollect(
    props.post.post.post_id.toString(),
    selectList.value,
  );
  await freshData();
  emits("submit");
  submit.value = false;
  if (!res) {
    showSnackbar.error("更新失败");
    return;
  }
  showSnackbar.success("更新成功");
}

function onCancel() {
  visible.value = false;
}
</script>
<style lang="css" scoped>
.topc-container {
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

.topc-post-info {
  font-family: var(--font-title);
  font-size: 18px;
}

.topc-cur-collect {
  color: var(--common-text-title);
  font-size: 16px;
  word-break: break-all;
}

.topc-collect-list {
  display: flex;
  width: 100%;
  max-height: 300px;
  flex-direction: column;
  overflow-y: auto;
  row-gap: 10px;
}

.topc-bottom {
  display: flex;
  align-items: center;
  justify-content: center;
  margin-top: 20px;
  margin-left: auto;
  column-gap: 10px;
}

.topc-btn {
  background: var(--btn-bg-1);
  color: var(--btn-text-1);
  font-family: var(--font-title);
}

.dark .topc-btn {
  border: 1px solid var(--common-shadow-2);
}
</style>
