<!-- 料理详情 -->
<template>
  <section v-if="props.food.effect.length > 0" class="twfd-panel">
    <header class="twfd-panel-title">
      <v-icon size="18">mdi-creation</v-icon>
      <h3>料理效果</h3>
    </header>
    <div class="twfd-effect" v-html="effectHtml" />
  </section>
  <section v-if="props.food.input.length > 0" class="twfd-panel">
    <header class="twfd-panel-title">
      <v-icon size="18">mdi-food-outline</v-icon>
      <h3>所需食材</h3>
      <span>{{ props.food.input.length }} 项</span>
    </header>
    <div class="twfd-inputs">
      <div v-for="item in props.food.input" :key="item.id" class="twfd-input">
        <img :src="`/icon/material/${item.id}.webp`" :alt="item.name" />
        <span>{{ item.name }}</span>
        <strong>×{{ item.count }}</strong>
      </div>
    </div>
  </section>
</template>
<script lang="ts" setup>
import { parseHtmlText } from "@utils/toolFunc.js";
import { computed } from "vue";

type TwoFoodDetailProps = { food: TGApp.App.Material.WikiFood };

const props = defineProps<TwoFoodDetailProps>();
const effectHtml = computed<string>(() => parseHtmlText(props.food.effect.join("\n")));
</script>
<style lang="scss" scoped>
.twfd-panel {
  display: flex;
  flex-direction: column;
  padding: 12px;
  border: 1px solid var(--common-shadow-1);
  border-radius: 8px;
  background: var(--box-bg-1);
  gap: 8px;
}

.twfd-panel-title {
  display: flex;
  align-items: center;
  color: var(--common-text-title);
  gap: 8px;

  h3 {
    margin: 0;
    font-size: 16px;
    font-weight: 600;
    line-height: 22px;
  }

  > span {
    margin-left: auto;
    color: var(--box-text-4);
    font-size: 12px;
    line-height: 16px;
  }
}

.twfd-effect {
  color: var(--box-text-2);
  font-size: 14px;
  line-height: 20px;
  white-space: pre-wrap;
  word-break: break-all;
}

.twfd-inputs {
  display: grid;
  gap: 8px;
  grid-template-columns: repeat(auto-fit, minmax(160px, 1fr));
}

.twfd-input {
  display: flex;
  min-width: 0;
  align-items: center;
  padding: 8px;
  border: 1px solid var(--common-shadow-1);
  border-radius: 8px;
  background: var(--box-bg-2);
  color: var(--box-text-2);
  column-gap: 8px;

  img {
    width: 40px;
    height: 40px;
    flex-shrink: 0;
    object-fit: contain;
  }

  span {
    overflow: hidden;
    flex: 1;
    text-overflow: ellipsis;
    white-space: nowrap;
  }

  strong {
    color: var(--common-text-title);
    font-size: 14px;
    line-height: 20px;
  }
}
</style>
