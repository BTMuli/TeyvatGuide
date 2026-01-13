<!-- 角色衣装 -->
<template>
  <div class="twc-costumes-box">
    <v-tabs v-model="tab">
      <v-tab
        v-for="(item, idx) in costumes"
        :key="idx"
        :title="item.name"
        :value="item.id"
        class="twc-costume-tab"
        density="compact"
      >
        <img v-if="!item.isDefault" :src="`/WIKI/costume/${item.id}_side.webp`" alt="icon" />
        <span>{{ item.name }}</span>
      </v-tab>
    </v-tabs>
    <v-window v-model="tab">
      <v-window-item
        v-for="item in costumes"
        :key="item.id"
        :value="item.id"
        class="twc-costume-detail"
      >
        <span v-html="parseHtmlText(item.desc)" />
        <div v-if="!item.isDefault" class="twc-costume-icons">
          <img :src="`/WIKI/costume/${item.id}.webp`" alt="icon" class="icon" />
          <img :src="`/WIKI/costume/${item.id}_full.webp`" alt="icon" class="full" />
        </div>
      </v-window-item>
    </v-window>
  </div>
</template>
<script lang="ts" setup>
import { parseHtmlText } from "@utils/toolFunc.js";
import { nextTick, onMounted, ref, watch } from "vue";

type TwcConstellationProps = { costumes: Array<TGApp.App.Character.Costume> };

const props = defineProps<TwcConstellationProps>();
const tab = ref<number>(0);

async function loadData(): Promise<void> {
  await nextTick();
  tab.value = props.costumes[0].id;
}

onMounted(async () => await loadData());

watch(
  () => props.costumes,
  async () => await loadData(),
);
</script>
<style lang="scss" scoped>
.twc-costumes-box {
  display: flex;
  flex-direction: column;
  padding: 5px;
  border: 1px solid var(--common-shadow-1);
  border-radius: 5px;
}

.twc-costume-tab {
  display: flex;
  align-items: center;
  justify-content: center;
  font-weight: bold;

  img {
    width: 30px;
    height: 30px;
  }
}

.twc-costume-detail {
  position: relative;
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  padding: 8px;
  border-radius: 4px;
  background: var(--box-bg-1);
  column-gap: 8px;
  white-space: pre-wrap;
}

.twc-costume-icons {
  position: relative;
  width: 400px;
  height: 200px;

  .icon {
    position: absolute;
    top: 0;
    right: 0;
    width: 80px;
    height: 80px;
    border-radius: 4px;
    background: var(--box-bg-2);
  }

  .full {
    position: relative;
    height: 100%;
    flex-shrink: 0;
    object-fit: contain;
  }
}
</style>
