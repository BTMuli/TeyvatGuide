<template>
  <TOverlay v-model="visible" blur-val="5px">
    <div class="tpoc-box">
      <div class="tpoc-top">
        <span>{{ props.collection.collection_title }}</span>
        <span>合集ID：{{ props.collection.collection_id }}</span>
      </div>
      <div class="tpoc-list" ref="postListRef">
        <div class="tpoc-load" v-if="postList.length === 0">
          <v-progress-circular indeterminate color="primary" size="24" />
          <span>加载中...</span>
        </div>
        <TPostcard
          class="tpoc-item"
          v-for="(item, index) in postList"
          :key="index"
          :model-value="item"
          :class="{ selected: index === props.collection.cur - 1 }"
        />
      </div>
    </div>
  </TOverlay>
</template>
<script lang="ts" setup>
import TOverlay from "@comp/app/t-overlay.vue";
import TPostcard from "@comp/app/t-postcard.vue";
import { nextTick, onMounted, shallowRef, useTemplateRef, watch } from "vue";

import bbsReq from "@/web/request/bbsReq.js";
import postReq from "@/web/request/postReq.js";

type TpoCollectionProps = { collection: TGApp.BBS.Post.Collection; gid: number };

const props = defineProps<TpoCollectionProps>();
const visible = defineModel<boolean>();
const info = shallowRef<TGApp.BBS.Collection.InfoRes>();
const postList = shallowRef<Array<TGApp.BBS.Post.FullData>>([]);
const postListEl = useTemplateRef<HTMLDivElement>("postListRef");

watch(
  () => [visible.value, postList.value],
  async () => {
    if (visible.value && postList.value.length > 0) {
      await nextTick();
      if (postListEl.value === null) return;
      const selectedEl = document.querySelector<HTMLDivElement>(".tpoc-item.selected");
      if (selectedEl === null) return;
      postListEl.value.scrollTo({ top: selectedEl.offsetTop, behavior: "smooth" });
    }
  },
);

onMounted(async () => await Promise.all([refreshInfo(), refreshPosts()]));

async function refreshInfo(): Promise<void> {
  const infoResp = await bbsReq.collection(props.collection.collection_id, props.gid);
  if ("retcode" in infoResp) {
    // showSnackbar.warn(`[合集信息][${infoResp.retcode}] ${infoResp.message}`);
    return;
  }
  info.value = infoResp;
  console.log(info.value);
}

async function refreshPosts(): Promise<void> {
  postList.value = await postReq.collection(props.collection.collection_id);
}
</script>
<style lang="scss" scoped>
.tpoc-box {
  padding: 10px;
  border-radius: 5px;
  background-color: var(--box-bg-1);
}

.tpoc-top {
  display: flex;
  flex-direction: column;
  border-bottom: 1px solid var(--common-shadow-2);
  margin-bottom: 10px;
}

.tpoc-top :nth-child(1) {
  color: var(--common-text-title);
  font-family: var(--font-title);
  font-size: 20px;
}

.tpoc-top :nth-child(2) {
  font-size: 14px;
  opacity: 0.8;
}

.tpoc-list {
  position: relative;
  display: flex;
  width: 400px;
  max-height: 400px;
  box-sizing: border-box;
  flex-direction: column;
  padding-right: 8px;
  overflow-y: auto;
  row-gap: 12px;
}

.tpoc-load {
  position: relative;
  display: flex;
  width: 100%;
  height: 100px;
  align-items: center;
  justify-content: center;
  column-gap: 5px;
}

.tpoc-item {
  height: fit-content;
  flex-shrink: 0;

  &.selected {
    background-color: var(--box-bg-2);
    color: var(--box-text-2);
    cursor: default;
  }
}
</style>
