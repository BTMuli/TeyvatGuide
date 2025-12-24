<!-- 链接卡片组件 -->
<template>
  <div class="tp-lc-box">
    <TMiImg
      :src="props.data.insert.link_card.cover"
      alt="cover"
      class="tp-lc-cover"
      @click="toLink()"
    />
    <div class="tp-lc-info">
      <span class="tp-lc-title">{{ props.data.insert.link_card.title }}</span>
      <div v-if="props.data.insert.link_card.price" class="tp-lc-price">
        {{ props.data.insert.link_card.price }}
      </div>
      <div class="tp-lc-btn" @click="toLink()">{{ btnText }} ></div>
    </div>
  </div>
</template>
<script lang="ts" setup>
import TMiImg from "@comp/app/t-mi-img.vue";
import showSnackbar from "@comp/func/snackbar.js";
import { openUrl } from "@tauri-apps/plugin-opener";
import { parseLink, parsePost } from "@utils/linkParser.js";
import { computed, toRaw } from "vue";
import { useRouter } from "vue-router";

/** 链接卡片组件 */
type TpLinkCard = {
  /** 插入内容 */
  insert: {
    /** 链接卡片数据 */
    link_card: {
      /** 卡片ID */
      card_id: string;
      /** 卡片状态 */
      card_status: number;
      /** 封面 */
      cover: string;
      /** 落地URL */
      landing_url: string;
      /** 落地URL类型 */
      landing_url_type: number;
      /**
       * 链接类型
       * @example
       * 1-帖子
       */
      link_type: number;
      /** 原始URL */
      origin_url: string;
      /** 标题 */
      title: string;
      /** 市场价格 */
      market_price?: string;
      /** 价格 */
      price?: string;
      /** 按钮文本 */
      button_text?: string;
    };
  };
};
type TpLinkCardProps = { data: TpLinkCard };

const props = defineProps<TpLinkCardProps>();
const router = useRouter();

const btnText = computed<string>(() => {
  if (!props.data.insert.link_card.button_text || props.data.insert.link_card.button_text === "") {
    return "详情";
  }
  return props.data.insert.link_card.button_text;
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
  await openUrl(res);
}
</script>
<style lang="scss" scoped>
.tp-lc-box {
  position: relative;
  display: flex;
  width: 100%;
  box-sizing: border-box;
  padding: 8px;
  border: 1px solid var(--common-shadow-1);
  border-radius: 4px;
  margin-bottom: 8px;
  background: var(--box-bg-1);
  column-gap: 8px;
}

.tp-lc-cover {
  max-width: 50%;
  max-height: 180px;
  border-radius: 4px;
  cursor: pointer;
  transition: all 0.5s;

  &:hover {
    scale: 0.9;
  }
}

.tp-lc-info {
  position: relative;
  display: flex;
  width: 100%;
  flex-direction: column;
  align-items: center;
  justify-content: space-between;
}

.tp-lc-title {
  color: var(--common-text-title);
  font-family: var(--font-title);
  font-size: 18px;
  text-align: left;
  word-break: break-all;
}

.tp-lc-price {
  display: inline-block;
  color: #ff6d6dff;
  font-size: 16px;
}

.tp-lc-btn {
  display: inline-block;
  margin-left: auto;
  color: #00c3ffff;
  cursor: pointer;
  text-align: right;
}
</style>
