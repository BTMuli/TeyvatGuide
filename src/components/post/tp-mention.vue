<template>
  <span class="mys-post-link" @click="toLink()">
    <v-icon size="small">mdi-account-circle-outline</v-icon>
    <span>{{ props.data.insert.mention.nickname }}</span>
  </span>
</template>
<script lang="ts" setup>
interface TpMention {
  insert: {
    mention: {
      uid: string;
      nickname: string;
    };
  };
}

interface TpMentionProps {
  data: TpMention;
}

const props = defineProps<TpMentionProps>();

function toLink() {
  const prefix = "https://www.miyoushe.com/ys/accountCenter/postList?id=";
  window.open(prefix + props.data.insert.mention.uid);
}
</script>
