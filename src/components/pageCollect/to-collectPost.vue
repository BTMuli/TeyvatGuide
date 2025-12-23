<template>
  <TOverlay v-model="visible">
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
        <v-btn class="tocp-btn" rounded @click="visible = false">取消</v-btn>
        <v-btn :loading="submit" class="tocp-btn" rounded @click="onSubmit">确定</v-btn>
      </div>
    </div>
  </TOverlay>
</template>
<script setup lang="ts">
import TOverlay from "@comp/app/t-overlay.vue";
import showDialog from "@comp/func/dialog.js";
import showSnackbar from "@comp/func/snackbar.js";
import TSUserCollection from "@Sqlm/userCollect.js";
import { ref, shallowRef, watch } from "vue";

type ToPostCollectProps = { post: Array<string> };
type ToPostCollectEmits = (e: "submit") => void;

const props = defineProps<ToPostCollectProps>();
const emits = defineEmits<ToPostCollectEmits>();
const visible = defineModel<boolean>();
const select = ref<string>();
const submit = ref<boolean>(false);
const collectList = shallowRef<Array<TGApp.Sqlite.Collection.Collection>>([]);

watch(
  () => visible.value,
  async () => {
    if (visible.value) await freshData();
  },
);

async function onSubmit(): Promise<void> {
  if (!select.value) {
    showSnackbar.warn("请选择分类");
    return;
  }
  submit.value = true;
  let force = false;
  const forceCheck = await showDialog.check("是否保留原分类", "若否则仅保留新分类");
  if (forceCheck === false) force = true;
  const check = await TSUserCollection.updatePostsCollect(props.post, select.value, force);
  if (!check) {
    showSnackbar.warn("处理失败");
    submit.value = false;
    return;
  }
  showSnackbar.success(`成功处理 ${props.post.length} 个帖子`);
  submit.value = false;
  emits("submit");
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
    showSnackbar.warn("新建失败");
    return;
  }
  showSnackbar.success("新建成功");
  await freshData();
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
  background: var(--tgc-btn-1);
  color: var(--btn-text);
  font-family: var(--font-title);
}

.dark .tocp-btn {
  border: 1px solid var(--common-shadow-2);
}
</style>
