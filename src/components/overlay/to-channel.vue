<template>
  <TOverlay v-model="visible" hide :to-click="onCancel" blur-val="20px">
    <div class="toc-box">
      <div class="toc-top">
        <div class="toc-title">请选择要跳转的频道</div>
        <div class="toc-list">
          <div v-for="item in channelList" class="toc-list-item" @click="toChannel(item.link)">
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
// vue
import { computed } from "vue";
import { useRouter } from "vue-router";
import TOverlay from "../main/t-overlay.vue";

interface ToChannelProps {
  modelValue: boolean;
}

interface ToChannelEmits {
  (e: "update:modelValue", value: boolean): void;
}

interface ToChannelItem {
  title: string;
  icon: string;
  link: string;
}

const props = withDefaults(defineProps<ToChannelProps>(), {
  modelValue: false,
});
const emits = defineEmits<ToChannelEmits>();

const visible = computed({
  get: () => props.modelValue,
  set: (value) => emits("update:modelValue", value),
});
const router = useRouter();

const channelList: ToChannelItem[] = [
  {
    title: "原神",
    icon: "/platforms/mhy/ys.webp",
    link: "/news/2",
  },
  {
    title: "崩坏：星穹铁道",
    icon: "/platforms/mhy/sr.webp",
    link: "/news/6",
  },
  {
    title: "崩坏3",
    icon: "/platforms/mhy/bh3.webp",
    link: "/news/1",
  },
  {
    title: "崩坏2",
    icon: "/platforms/mhy/bh2.webp",
    link: "/news/3",
  },
  {
    title: "未定事件簿",
    icon: "/platforms/mhy/wd.webp",
    link: "/news/4",
  },
  {
    title: "绝区零",
    icon: "/platforms/mhy/zzz.webp",
    link: "/news/8",
  },
  {
    title: "大别野",
    icon: "/platforms/mhy/dby.webp",
    link: "/news/5",
  },
];

function onCancel() {
  visible.value = false;
}

function toChannel(link: string) {
  visible.value = false;
  router.push(link);
  setTimeout(() => {
    window.location.reload();
  }, 300);
}
</script>
<style lang="css" scoped>
.toc-box {
  padding: 10px;
}

.toc-top {
  padding: 10px;
  border-radius: 5px;
  background: rgb(255 255 255 / 30%);
}

.toc-title {
  color: var(--common-color-blue);
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
  border-radius: 5px;
  background: rgb(0 0 0 / 20%);
  color: var(--common-color-black);
  cursor: pointer;
  transition: all 0.5s linear;
}

.toc-list-item:hover {
  background: rgb(0 0 0 / 50%);
  color: var(--common-color-white);
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
  background: rgb(255 255 255 / 30%);
  color: #faf7e8;
  cursor: pointer;
}
</style>
