<template>
  <TOverlay v-model="visible" blur-val="5px">
    <div class="tpoc-box">
      <div class="tpoc-top">
        <span>{{ props.collection.collection_title }}</span>
        <span>合集ID：{{ props.collection.collection_id }}</span>
      </div>
      <div class="tpoc-list" ref="postListRef">
        <div class="tpoc-load" v-if="posts.length === 0">
          <v-progress-circular indeterminate color="primary" size="24" />
          <span>加载中...</span>
        </div>
        <div
          class="tpoc-item"
          v-for="(item, index) in posts"
          :key="index"
          @click="toPost(item.postId, index)"
          :class="{ selected: index === props.collection.cur - 1 }"
        >
          <div class="tpoc-item-title" :title="item.title">{{ item.title }}</div>
          <div class="tpoc-item-info">
            <div class="tpoc-iii time">
              <span title="创建时间">
                <v-icon size="12">mdi-clock-time-four-outline</v-icon>
                <span>{{ timestampToDate(item.created * 1000) }}</span>
              </span>
              <span title="最后更新时间">
                <v-icon size="12">mdi-clock-time-four-outline</v-icon>
                <span>{{ timestampToDate(item.updated * 1000) }}</span>
              </span>
            </div>
            <div class="tpoc-iii">
              <span title="评论数">
                <v-icon size="12">mdi-comment</v-icon>
                <span>{{ item.comments }}</span>
              </span>
              <span title="点赞数">
                <v-icon size="12">mdi-thumb-up</v-icon>
                <span>{{ item.likes }}</span>
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  </TOverlay>
</template>
<script lang="ts" setup>
import TOverlay from "@comp/app/t-overlay.vue";
import showSnackbar from "@comp/func/snackbar.js";
import { nextTick, onMounted, shallowRef, useTemplateRef, watch } from "vue";
import { useRouter } from "vue-router";

import { timestampToDate } from "@/utils/toolFunc.js";
import postReq from "@/web/request/postReq.js";

type TpoCollectionProps = { collection: TGApp.Plugins.Mys.Post.Collection };
type TpoCollectionItem = {
  postId: string;
  title: string;
  created: number;
  updated: number;
  comments: number;
  likes: number;
};

const router = useRouter();

const props = defineProps<TpoCollectionProps>();
const visible = defineModel<boolean>();
const posts = shallowRef<Array<TpoCollectionItem>>([]);
const postListEl = useTemplateRef<HTMLDivElement>("postListRef");

watch(
  () => [visible.value, posts.value],
  async () => {
    if (visible.value && posts.value.length > 0) {
      await nextTick();
      if (postListEl.value === null || props.collection.total < 5) return;
      let topNum: number;
      if (props.collection.total - props.collection.cur < 3) topNum = props.collection.total;
      else topNum = props.collection.cur - 3;
      postListEl.value.scrollTo({ top: topNum * 87, behavior: "smooth" });
    }
  },
);

onMounted(async () => {
  const collectionPosts = await postReq.collection(props.collection.collection_id);
  const tempArr: Array<TpoCollectionItem> = [];
  for (const postItem of collectionPosts) {
    const post: TpoCollectionItem = {
      postId: postItem.post.post_id,
      title: postItem.post.subject,
      created: postItem.post.created_at,
      updated: postItem.post.updated_at,
      comments: postItem.stat === null ? 0 : postItem.stat.reply_num,
      likes: postItem.stat === null ? 0 : postItem.stat.like_num,
    };
    tempArr.push(post);
  }
  posts.value = tempArr;
});

async function toPost(postId: string, index: number): Promise<void> {
  if (index === props.collection.cur - 1) {
    showSnackbar.warn("已经在当前帖子");
    return;
  }
  await router.push({ name: "帖子详情", params: { post_id: postId } });
}
</script>
<style lang="css" scoped>
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
  display: flex;
  width: 400px;
  max-height: 400px;
  flex-direction: column;
  padding-right: 10px;
  overflow-y: auto;
  row-gap: 5px;
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
  display: flex;
  flex-direction: column;
  align-items: flex-start;
  justify-content: center;
  padding: 10px;
  border: 1px solid var(--common-shadow-2);
  border-radius: 5px;
  background-color: var(--box-bg-1);
  color: var(--box-text-1);
  cursor: pointer;

  &.selected {
    background-color: var(--box-bg-2);
    color: var(--box-text-2);
    cursor: default;
  }
}

.tpoc-item-title {
  width: 100%;
  max-width: 100%;
  font-family: var(--font-title);
  font-size: 16px;
  word-break: break-all;
}

.tpoc-item-info {
  display: flex;
  width: 100%;
  flex-direction: column;
  align-items: flex-start;
  justify-content: flex-start;
  font-size: 12px;
  opacity: 0.8;
}

.tpoc-iii {
  position: relative;
  display: flex;
  width: 100%;
  align-items: center;
  justify-content: flex-start;
  column-gap: 5px;

  span {
    display: flex;
    align-items: center;
    justify-content: center;
    column-gap: 2px;
    white-space: nowrap;
  }

  &.time span :first-child {
    color: var(--tgc-od-green);
  }

  &:last-child {
    justify-content: flex-end;
  }
}
</style>
