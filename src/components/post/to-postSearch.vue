<template>
  <TOverlay v-model="visible" hide :to-click="onCancel" blur-val="20px">
    <div class="tops-box">
      <div class="tops-top">查找：{{ search }}</div>
      <div class="tops-act">
        <span>分区：{{ getGidLabel() }}</span>
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
import { computed, onMounted, ref, watch } from "vue";

import Mys from "../../plugins/Mys/index.js";
import showSnackbar from "../func/snackbar.js";
import TOverlay from "../main/t-overlay.vue";
import TPostCard from "../main/t-postcard.vue";

// data
const search = ref("");
const lastId = ref("");
const game = ref("2");
const isLast = ref(false);
const results = ref<TGApp.Plugins.Mys.Post.FullData[]>([]);
const load = ref(false);

interface ToPostSearchProps {
  modelValue: boolean;
  gid: string;
  keyword: string;
}

interface ToPostSearchEmits {
  (e: "update:modelValue", value: boolean): void;

  (e: "cancel"): void;
}

const props = defineProps<ToPostSearchProps>();
const emits = defineEmits<ToPostSearchEmits>();

const gameList: Record<string, string> = {
  "1": "崩坏3",
  "2": "原神",
  "3": "崩坏2",
  "4": "未定事件簿",
  "5": "大别野",
  "6": "崩坏：星穹铁道",
  "8": "绝区零",
};
// overlay
const visible = computed({
  get: () => props.modelValue,
  set: (value) => {
    emits("update:modelValue", value);
  },
});

function onCancel() {
  visible.value = false;
}

onMounted(async () => {
  search.value = props.keyword;
  game.value = props.gid;
});

watch(
  () => props.modelValue,
  async (value) => {
    if (value && results.value.length === 0) {
      await searchPosts();
    } else {
      visible.value = value;
    }
  },
);

watch(
  () => props.keyword,
  async (value) => {
    if (search.value === "" && value !== "") {
      search.value = value;
    } else if (search.value !== value && value !== "") {
      search.value = value;
      results.value = [];
      lastId.value = "";
      isLast.value = false;
    }
  },
);

watch(
  () => props.gid,
  async (value) => {
    if (game.value !== value) {
      game.value = value;
      results.value = [];
      lastId.value = "";
      isLast.value = false;
    }
  },
);

async function searchPosts() {
  if (load.value) return;
  load.value = true;
  if (!props.gid || !props.keyword) {
    showSnackbar({
      text: "参数错误",
    });
    load.value = false;
    return;
  }
  if (isLast.value) {
    showSnackbar({
      text: "没有更多了",
    });
    load.value = false;
    return;
  }
  if (search.value === "") {
    showSnackbar({
      text: "请输入搜索关键词",
    });
    load.value = false;
    return;
  }
  const res = await Mys.Post.searchPosts(game.value, search.value, lastId.value);
  if (lastId.value === "") {
    results.value = res.posts;
  } else {
    results.value = results.value.concat(res.posts);
  }
  lastId.value = res.last_id;
  isLast.value = res.is_last;
  load.value = false;
  if (!visible.value) {
    visible.value = true;
  }
}

function getGidLabel(): string {
  if (gameList[game.value]) {
    return gameList[game.value];
  }
  return "未知";
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
