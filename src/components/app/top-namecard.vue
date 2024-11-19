<template>
  <v-list class="top-nc-box" @click="toNameCard(props.data)">
    <v-list-item :title="props.data.name">
      <template #subtitle>
        <span :title="props.data.desc">{{ props.data.desc }}</span>
      </template>
      <template #prepend>
        <v-img width="80px" style="margin-right: 10px" :src="props.data.icon" />
      </template>
    </v-list-item>
  </v-list>
</template>
<script lang="ts" setup>
import { computed } from "vue";

interface TopNameCardProps {
  data: TGApp.App.NameCard.Item;
}

interface TopNameCardEmits {
  (e: "selected", data: TGApp.App.NameCard.Item): void;
}

const props = defineProps<TopNameCardProps>();
const emit = defineEmits<TopNameCardEmits>();

const bgImage = computed<string>(() => {
  if (props.data.name === "原神·印象") return "none;";
  return `url("${props.data.bg}")`;
});

function toNameCard(item: TGApp.App.NameCard.Item) {
  emit("selected", item);
}
</script>
<style lang="css" scoped>
.top-nc-box {
  width: 100%;
  height: 80px;
  border: 1px solid var(--common-shadow-2);
  border-radius: 10px 50px 50px 10px;
  background-color: var(--box-bg-1);
  background-image: v-bind(bgImage);
  background-position: right;
  background-repeat: no-repeat;
  cursor: pointer;
  font-family: var(--font-title);
}
</style>
