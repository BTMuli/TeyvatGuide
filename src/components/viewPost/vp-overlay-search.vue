<template>
  <TOverlay v-model="visible">
    <div class="tops-box">
      <div class="tops-top">查找：{{ search }}</div>
      <div class="tops-act">
        <span>分区：{{ gameName }}</span>
        <v-btn :loading="load" size="small" class="tops-btn" @click="searchPosts()" rounded>
          加载更多({{ results.length }})
        </v-btn>
      </div>
      <div class="tops-list">
        <div v-for="item in results" :key="item.post.post_id">
          <TPostCard :model-value="item" />
        </div>
      </div>
    </div>
  </TOverlay>
</template>
<script lang="ts" setup>
import TOverlay from "@comp/app/t-overlay.vue";
import TPostCard from "@comp/app/t-postcard.vue";
import showSnackbar from "@comp/func/snackbar.js";
import Mys from "@Mys/index.js";
import { computed, onMounted, ref, shallowRef, watch } from "vue";

import TGBbs from "@/utils/TGBbs.js";

type ToPostSearchProps = { gid: string; keyword?: string };

const props = defineProps<ToPostSearchProps>();
const visible = defineModel<boolean>();
const search = ref<string>();
const lastId = ref<string>("");
const game = ref<string>("2");
const isLast = ref<boolean>(false);
const load = ref<boolean>(false);
const results = shallowRef<Array<TGApp.Plugins.Mys.Post.FullData>>([]);
const gameName = computed<string>(
  () => TGBbs.channels.find((v) => v.gid.toString() === game.value)?.title || "未知分区",
);

onMounted(async () => {
  game.value = props.gid;
  if (props.keyword && props.keyword !== "") search.value = props.keyword;
  if (visible.value) await searchPosts();
});

watch(
  () => visible.value,
  async () => {
    if (visible.value && results.value.length === 0) {
      await searchPosts();
      return;
    }
  },
);

watch(
  () => props.keyword,
  async () => {
    if (search.value === "" && props.keyword !== "") {
      search.value = props.keyword;
      return;
    }
    if (search.value !== props.keyword && props.keyword !== "") {
      search.value = props.keyword;
      results.value = [];
      lastId.value = "";
      isLast.value = false;
      if (visible.value) await searchPosts();
    }
  },
);

watch(
  () => props.gid,
  async () => {
    if (game.value !== props.gid) {
      game.value = props.gid;
      results.value = [];
      lastId.value = "";
      isLast.value = false;
    }
  },
);

async function searchPosts(): Promise<void> {
  if (load.value || !search.value) return;
  load.value = true;
  if (!props.gid || !props.keyword) {
    showSnackbar.warn("参数错误");
    load.value = false;
    return;
  }
  if (isLast.value) {
    showSnackbar.warn("没有更多了");
    load.value = false;
    return;
  }
  if (search.value === "") {
    showSnackbar.warn("请输入搜索关键词");
    load.value = false;
    return;
  }
  const res = await Mys.Post.searchPosts(game.value, search.value, lastId.value);
  if (lastId.value === "") results.value = res.posts;
  else results.value = results.value.concat(res.posts);
  lastId.value = res.last_id;
  isLast.value = res.is_last;
  load.value = false;
  if (!visible.value) visible.value = true;
}
</script>
<style lang="css" scoped>
.tops-box {
  padding: 10px;
  border-radius: 5px;
  background-color: var(--box-bg-1);
}

.tops-top {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  justify-content: flex-start;
  color: var(--common-text-title);
  font-family: var(--font-title);
  font-size: 20px;
  word-break: break-all;
}

.tops-act {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding-bottom: 5px;
  border-bottom: 1px solid var(--common-shadow-2);
  margin-bottom: 10px;
}

.tops-list {
  position: relative;
  display: flex;
  width: 400px;
  max-height: 400px;
  flex-direction: column;
  padding-right: 10px;
  overflow-y: auto;
  row-gap: 10px;
}

.tops-btn {
  width: fit-content;
  background: var(--tgc-btn-1);
  color: var(--btn-text);
}
</style>
