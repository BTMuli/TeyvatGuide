<template>
  <TOverlay v-model="visible" hide :to-click="onCancel" blur-val="5px">
    <div class="tpoc-box">
      <div class="tpoc-top">
        <span>{{ props.collection.collection_title }}</span>
        <span>合集ID：{{ props.collection.collection_id }}</span>
      </div>
      <div class="tpoc-list">
        <div
          class="tpoc-item"
          v-for="(item, index) in posts"
          :key="index"
          @click="toPost(item.postId, index)"
          :style="{
            backgroundColor:
              index === props.collection.cur - 1 ? 'var(--box-bg-2)' : 'var(--box-bg-1)',
            color: index === props.collection.cur - 1 ? 'var(--box-text-2)' : 'var(--box-text-1)',
            cursor: index === props.collection.cur - 1 ? 'default' : 'pointer',
          }"
        >
          <div class="tpoc-item-title" :title="item.title">{{ item.title }}</div>
          <div class="tpoc-item-info">
            <div class="tpoc-iii">
              <span title="创建时间">
                <v-icon size="12">mdi-clock-time-four-outline</v-icon>
                <span>{{ getDate(item.created) }}</span>
              </span>
              <span title="最后更新时间">
                <v-icon size="12">mdi-clock-time-four-outline</v-icon>
                <span>{{ getDate(item.updated) }}</span>
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
import { ref, computed, onMounted } from "vue";
import { useRouter } from "vue-router";

import Mys from "../../plugins/Mys/index.js";
import showSnackbar from "../func/snackbar.js";
import TOverlay from "../main/t-overlay.vue";

interface TpoCollectionProps {
  collection: TGApp.Plugins.Mys.Post.Collection;
  modelValue: boolean;
}

type TpoCollectionEmits = (e: "update:modelValue", value: boolean) => void;

interface TpoCollectionItem {
  postId: string;
  title: string;
  created: number;
  updated: number;
  comments: number;
  likes: number;
}

const props = defineProps<TpoCollectionProps>();
const emits = defineEmits<TpoCollectionEmits>();

const visible = computed({
  get: () => props.modelValue,
  set: (value) => {
    emits("update:modelValue", value);
  },
});
const posts = ref<TpoCollectionItem[]>([]);

const router = useRouter();

onMounted(async () => {
  const collectionPosts = await Mys.Collection.data(props.collection.collection_id);
  const tempArr: TpoCollectionItem[] = [];
  for (const postItem of collectionPosts) {
    const post: TpoCollectionItem = {
      postId: postItem.post.post_id,
      title: postItem.post.subject,
      created: postItem.post.created_at,
      updated: postItem.post.updated_at,
      comments: postItem.stat.reply_num,
      likes: postItem.stat.like_num,
    };
    tempArr.push(post);
  }
  posts.value = tempArr;
});

function onCancel() {
  visible.value = false;
}

function getDate(date: number): string {
  return new Date(date * 1000).toLocaleString().replace(/\//g, "-").split(" ")[0];
}

async function toPost(postId: string, index: number): Promise<void> {
  if (index === props.collection.cur - 1) {
    showSnackbar({
      text: "已经在当前帖子",
      color: "warn",
    });
    return;
  }
  await router.push({
    name: "帖子详情",
    params: {
      post_id: postId,
    },
  });
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

.tpoc-item {
  display: flex;
  flex-direction: column;
  align-items: flex-start;
  justify-content: center;
  padding: 10px;
  border: 1px solid var(--common-shadow-2);
  border-radius: 5px;
  cursor: pointer;
}

.tpoc-item-title {
  overflow: hidden;
  width: 100%;
  font-family: var(--font-title);
  font-size: 16px;
  text-overflow: ellipsis;
  white-space: nowrap;
  word-break: break-all;
}

.tpoc-item-info {
  display: flex;
  width: 100%;
  align-items: center;
  justify-content: space-between;
  font-size: 12px;
  opacity: 0.8;
}

.tpoc-iii {
  display: flex;
  align-items: center;
  justify-content: center;
  column-gap: 5px;
}

.tpoc-iii span {
  display: flex;
  align-items: center;
  justify-content: center;
  column-gap: 2px;
}
</style>
