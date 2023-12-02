<template>
  <div class="mys-post-link-card">
    <div class="mys-post-link-card-cover">
      <img :src="props.data.insert.link_card.cover" alt="cover" />
    </div>
    <div class="mys-post-link-card-content">
      <div class="mys-post-link-card-title">
        {{ props.data.insert.link_card.title }}
      </div>
      <div v-if="props.data.insert.link_card.price" class="mys-post-link-card-price">
        {{ props.data.insert.link_card.price }}
      </div>
      <div @click="toLink()" class="mys-post-link-card-btn">
        {{ props.data.insert.link_card.button_text ?? "详情" }} >
      </div>
    </div>
  </div>
</template>
<script lang="ts" setup>
import { useRouter } from "vue-router";

import { isMysPost } from "../../plugins/Mys/utils/parsePost";

interface TpLinkCard {
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
}

interface TpLinkCardProps {
  data: TpLinkCard;
}

const props = defineProps<TpLinkCardProps>();
const router = useRouter();

async function toLink() {
  const link = props.data.insert.link_card.landing_url;
  if (isMysPost(link)) {
    await router.push({
      name: "帖子详情",
      params: {
        post_id: link.split("/").pop(),
      },
    });
  } else {
    window.open(link);
  }
}
</script>
