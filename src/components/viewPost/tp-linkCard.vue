<template>
  <div class="tp-link-card-box">
    <img :src="cover" alt="cover" @click="toLink()" v-if="cover" />
    <div class="tp-link-card-content">
      <span>{{ props.data.insert.link_card.title }}</span>
      <div v-if="props.data.insert.link_card.price" class="tp-link-card-price">
        {{ props.data.insert.link_card.price }}
      </div>
      <div @click="toLink()" class="tp-link-card-btn">{{ btnText }} ></div>
    </div>
  </div>
</template>
<script lang="ts" setup>
import showSnackbar from "@comp/func/snackbar.js";
import { computed, onMounted, onUnmounted, ref, toRaw } from "vue";
import { useRouter } from "vue-router";

import { useAppStore } from "@/store/modules/app.js";
import { parseLink, parsePost } from "@/utils/linkParser.js";
import { saveImgLocal } from "@/utils/TGShare.js";

type TpLinkCard = {
  insert: {
    link_card: {
      link_type: number;
      origin_url: string;
      landing_url: string;
      cover: string;
      title: string;
      card_id: string;
      card_status: number;
      market_price: string;
      price?: string;
      button_text?: string;
      landing_url_type: number;
    };
  };
};
type TpLinkCardProps = { data: TpLinkCard };

const props = defineProps<TpLinkCardProps>();
const router = useRouter();
const appStore = useAppStore();

const cover = ref<string>();
const btnText = computed<string>(() => {
  if (!props.data.insert.link_card.button_text || props.data.insert.link_card.button_text === "") {
    return "详情";
  }
  return props.data.insert.link_card.button_text;
});

onMounted(async () => {
  const coverLink = appStore.getImageUrl(props.data.insert.link_card.cover);
  cover.value = await saveImgLocal(coverLink);
});

onUnmounted(() => {
  if (cover.value) URL.revokeObjectURL(cover.value);
});

console.log("tpLinkCard", props.data.insert.link_card.card_id, toRaw(props.data).insert.link_card);

async function toLink(): Promise<void> {
  const link = props.data.insert.link_card.landing_url;
  const isPost = await parsePost(link);
  if (isPost !== false) {
    await router.push({ name: "帖子详情", params: { post_id: isPost } });
    return;
  }
  const res = await parseLink(link);
  if (res === true) return;
  if (res === false) {
    showSnackbar.error(`未知链接:${link}`, 3000);
    return;
  }
  window.open(res);
}
</script>
<style lang="css" scoped>
.tp-link-card-box {
  display: flex;
  width: 100%;
  padding: 10px;
  border: 1px solid var(--common-shadow-1);
  border-radius: 10px;
  margin-bottom: 10px;
  background: var(--app-side-bg);
  column-gap: 10px;
}

.tp-link-card-box img {
  max-width: 50%;
  max-height: 180px;
  border-radius: 10px;
  cursor: pointer;
  transition: all 0.5s;
}

.tp-link-card-box img:hover {
  scale: 0.9;
}

.tp-link-card-content {
  display: flex;
  width: 100%;
  flex-direction: column;
  align-items: center;
  justify-content: space-between;
  font-family: var(--font-title);
}

.tp-link-card-content :nth-child(1) {
  width: 100%;
  color: var(--common-text-title);
  font-size: 20px;
  text-align: left;
}

.tp-link-card-price {
  display: inline-block;
  color: #ff6d6d;
  font-size: 20px;
}

.tp-link-card-btn {
  display: inline-block;
  margin-left: auto;
  color: #00c3ff;
  cursor: pointer;
  text-align: right;
}
</style>
