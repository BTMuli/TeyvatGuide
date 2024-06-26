<template>
  <TOverlay v-model="visible" hide :to-click="onCancel" blur-val="20px">
    <div class="toc-box">
      <div class="toc-top">
        <div class="toc-title">
          <span>请选择要跳转的频道</span>
        </div>
        <div class="toc-list">
          <div
            v-for="(item, index) in channelList"
            :key="index"
            :class="props.gid === item.gid ? 'toc-list-item active' : 'toc-list-item'"
            @click="toChannel(item)"
          >
            <img :src="item.icon" alt="icon" />
            <span>{{ item.title }}</span>
          </div>
        </div>
      </div>
      <div class="toc-close" @click="onCancel">
        <div class="toc-close-btn">
          <v-icon>mdi-close</v-icon>
        </div>
      </div>
    </div>
  </TOverlay>
</template>
<script lang="ts" setup>
import { computed } from "vue";
import { useRouter } from "vue-router";

import { useAppStore } from "../../store/modules/app.js";
import showSnackbar from "../func/snackbar.js";
import TOverlay from "../main/t-overlay.vue";

interface ToChannelProps {
  gid?: string;
  curType?: string;
  modelValue: boolean;
}

type ToChannelEmits = (e: "update:modelValue", value: boolean) => void;

interface ToChannelItem {
  title: string;
  icon: string;
  gid: string;
}

const props = withDefaults(defineProps<ToChannelProps>(), {
  modelValue: false,
});
const emits = defineEmits<ToChannelEmits>();

const visible = computed({
  get: () => props.modelValue,
  set: (value) => {
    emits("update:modelValue", value);
  },
});
const router = useRouter();
const appStore = useAppStore();

const channelList: ToChannelItem[] = [
  {
    title: "原神",
    icon: "/platforms/mhy/ys.webp",
    gid: "2",
  },
  {
    title: "崩坏：星穹铁道",
    icon: "/platforms/mhy/sr.webp",
    gid: "6",
  },
  {
    title: "崩坏3",
    icon: "/platforms/mhy/bh3.webp",
    gid: "1",
  },
  {
    title: "崩坏2",
    icon: "/platforms/mhy/bh2.webp",
    gid: "3",
  },
  {
    title: "未定事件簿",
    icon: "/platforms/mhy/wd.webp",
    gid: "4",
  },
  {
    title: "绝区零",
    icon: "/platforms/mhy/zzz.webp",
    gid: "8",
  },
  {
    title: "大别野",
    icon: "/platforms/mhy/dby.webp",
    gid: "5",
  },
];

function onCancel(): void {
  visible.value = false;
}

async function toChannel(item: ToChannelItem): Promise<void> {
  if (props.gid === item.gid) {
    showSnackbar({
      text: "当前已经在该频道",
      color: "warn",
    });
    return;
  }
  visible.value = false;
  let link = `/news/${item.gid}/{type}`;
  const typeList = ["notice", "news", "activity"];
  if (typeList.includes(appStore.recentNewsType)) {
    link = link.replace("{type}", appStore.recentNewsType);
  } else {
    link = link.replace("{type}", "notice");
    appStore.recentNewsType = "notice";
  }
  await router.push(link);
}
</script>
<style lang="css" scoped>
.toc-box {
  padding: 10px;
}

.toc-top {
  padding: 10px;
  border-radius: 5px;
  background: var(--app-page-bg);
}

.toc-title {
  color: var(--common-text-title);
  font-family: var(--font-title);
  font-size: 20px;
}

.toc-list {
  display: grid;
  margin-top: 10px;
  grid-gap: 10px;
  grid-template-columns: repeat(2, 1fr);
}

.toc-list-item {
  display: flex;
  align-items: center;
  justify-content: start;
  border: 1px solid var(--common-shadow-1);
  border-radius: 5px;
  background: var(--box-bg-1);
  color: var(--box-text-1);
  cursor: pointer;
  transition: all 0.5s linear;
}

.toc-list-item.active {
  border: 1px solid var(--common-shadow-1);
  background: var(--box-bg-2);
  color: var(--box-text-2);
}

.toc-list-item img {
  width: 45px;
  height: 45px;
  margin-right: 10px;
  border-bottom-left-radius: 5px;
  border-top-left-radius: 5px;
}

.toc-list-item span {
  margin-right: 10px;
  font-family: var(--font-title);
  font-size: 16px;
}

.toc-close {
  display: flex;
  width: 100%;
  height: 60px;
  align-items: center;
  justify-content: center;
}

.toc-close-btn {
  display: flex;
  width: 30px;
  height: 30px;
  align-items: center;
  justify-content: center;
  border-radius: 50%;
  background: var(--box-bg-1);
  color: var(--app-page-content);
  cursor: pointer;
}
</style>
