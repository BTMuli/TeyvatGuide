<!-- 搜索悬浮层 -->
<template>
  <TOverlay v-model="visible">
    <div class="tops-box">
      <div class="tops-top">查找：{{ search }}</div>
      <div class="tops-act">
        <div class="tops-game">
          <span>分区：{{ label }}</span>
          <span>加载帖子：{{ results.length }}</span>
        </div>
        <div class="tops-sort">
          <v-select
            v-model="sortType"
            :disabled="load"
            :items="sortOrderList"
            density="compact"
            item-title="text"
            item-value="value"
            label="排序"
            variant="outlined"
          />
        </div>
      </div>
      <div class="tops-divider" />
      <div ref="listRef" class="tops-list">
        <TPostCard
          v-for="item in results"
          :key="item.post.post_id"
          :model-value="item"
          class="tops-item"
        />
      </div>
    </div>
  </TOverlay>
</template>
<script lang="ts" setup>
import TOverlay from "@comp/app/t-overlay.vue";
import TPostCard from "@comp/app/t-postcard.vue";
import showSnackbar from "@comp/func/snackbar.js";
import { useBoxReachBottom } from "@hooks/reachBottom.js";
import postReq from "@req/postReq.js";
import useBBSStore from "@store/bbs.js";
import { storeToRefs } from "pinia";
import { computed, onMounted, ref, shallowRef, useTemplateRef, watch } from "vue";

type ToPostSearchProps = { gid: number; keyword?: string };
type SortSelect = { text: string; value: number };

const sortOrderList: Array<SortSelect> = [
  { text: "最新", value: 2 },
  { text: "最热", value: 1 },
];

const { gameList } = storeToRefs(useBBSStore());

const listEl = useTemplateRef<HTMLElement>("listRef");
const { isReachBottom } = useBoxReachBottom(listEl);

const props = defineProps<ToPostSearchProps>();
const visible = defineModel<boolean>();

const search = ref<string>();
const lastId = ref<string>("");
const gameId = ref<string>("2");
const isLast = ref<boolean>(false);
const load = ref<boolean>(false);
const sortType = ref<number>(1);
const results = shallowRef<Array<TGApp.BBS.Post.FullData>>([]);
const label = computed<string>(() => {
  const gameFind = gameList.value.find((v) => v.id.toString() === gameId.value);
  if (gameFind === undefined) return "未知分区";
  return gameFind.name;
});

onMounted(async () => {
  gameId.value = props.gid.toString();
  if (props.keyword && props.keyword !== "") search.value = props.keyword;
  if (visible.value) await searchPosts();
});

watch(
  () => isReachBottom.value,
  async () => {
    if (!isReachBottom.value) return;
    await searchPosts();
  },
);
watch(
  () => sortType.value,
  async () => {
    results.value = [];
    lastId.value = "";
    isLast.value = false;
    await searchPosts();
  },
);
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
    if (gameId.value !== props.gid.toString()) {
      gameId.value = props.gid.toString();
      results.value = [];
      lastId.value = "";
      isLast.value = false;
    }
  },
);

async function searchPosts(): Promise<void> {
  if (load.value || !search.value) return;
  load.value = true;
  if (!props.gid) {
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
  const res = await postReq.search(gameId.value, search.value, lastId.value, sortType.value);
  if (lastId.value === "") results.value = res.posts;
  else results.value = results.value.concat(res.posts);
  lastId.value = res.last_id;
  isLast.value = res.is_last;
  load.value = false;
  if (!visible.value) visible.value = true;
  showSnackbar.success(`成功加载${res.posts.length}条数据`);
}
</script>
<style lang="css" scoped>
.tops-box {
  position: relative;
  display: flex;
  width: 1080px;
  height: 600px;
  box-sizing: border-box;
  flex-direction: column;
  align-items: flex-start;
  justify-content: flex-start;
  padding: 8px;
  border-radius: 4px;
  background-color: var(--app-page-bg);
  row-gap: 8px;
}

.tops-top {
  position: relative;
  display: flex;
  width: 100%;
  flex-wrap: wrap;
  align-items: center;
  justify-content: flex-start;
  color: var(--common-text-title);
  font-family: var(--font-title);
  font-size: 20px;
  word-break: break-all;
}

.tops-act {
  position: relative;
  display: flex;
  width: 100%;
  align-items: flex-end;
  justify-content: space-between;
}

.tops-game {
  position: relative;
  display: flex;
  align-items: center;
  justify-content: center;
  column-gap: 8px;
}

.tops-sort {
  width: 100px;
  height: 40px;
}

.tops-divider {
  position: relative;
  width: 100%;
  height: 1px;
  background-color: var(--common-shadow-2);
}

.tops-list {
  position: relative;
  display: grid;
  width: 100%;
  box-sizing: border-box;
  padding-right: 4px;
  gap: 8px;
  grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
  overflow-y: auto;
}
</style>
