<!-- 角色衣装 -->
<template>
  <div class="twc-costumes-box">
    <v-tabs v-model="tab" class="twc-detail-tabs" density="compact" show-arrows>
      <v-tab
        v-for="(item, idx) in costumes"
        :key="idx"
        :title="item.name"
        :value="item.id"
        class="twc-costume-tab"
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
        :class="{ 'twc-costume-detail--default': item.isDefault }"
      >
        <div class="twc-costume-copy">
          <div class="twc-costume-heading">
            <img
              v-if="!item.isDefault"
              :src="`/WIKI/costume/${item.id}.webp`"
              :alt="`${item.name}衣装头像`"
            />
            <div>
              <span>{{ item.isDefault ? "默认衣装" : "衣装档案" }}</span>
              <h3>{{ item.name }}</h3>
            </div>
          </div>
          <div class="twc-costume-desc" v-html="parseHtmlText(item.desc)" />
        </div>
        <div v-if="!item.isDefault" class="twc-costume-preview">
          <img :src="`/WIKI/costume/${item.id}_full.webp`" :alt="`${item.name}衣装立绘`" />
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
  gap: 8px;
}

.twc-costume-tab {
  display: flex;
  align-items: center;
  justify-content: center;
  font-weight: normal;

  img {
    width: 24px;
    height: 24px;
    border-radius: 2px;
    object-fit: cover;
  }
}

.twc-costume-detail {
  display: grid;
  overflow: hidden;
  min-height: 240px;
  border: 1px solid var(--common-shadow-1);
  border-radius: 8px;
  background: var(--box-bg-4);
  grid-template-columns: minmax(240px, 2fr) minmax(400px, 3fr);
}

.twc-costume-detail--default {
  min-height: 0;
  grid-template-columns: 1fr;
}

.twc-costume-copy {
  display: flex;
  min-width: 0;
  flex-direction: column;
  justify-content: center;
  padding: 24px;
  gap: 16px;
}

.twc-costume-heading {
  display: flex;
  align-items: center;
  column-gap: 12px;

  > img {
    width: 64px;
    height: 64px;
    flex-shrink: 0;
    border: 1px solid var(--common-shadow-1);
    border-radius: 4px;
    background: var(--box-bg-2);
    object-fit: cover;
  }

  > div {
    display: flex;
    min-width: 0;
    flex-direction: column;
    gap: 2px;

    > span {
      color: var(--box-text-4);
      font-size: 12px;
      line-height: 16px;
    }

    h3 {
      overflow: hidden;
      margin: 0;
      color: var(--common-text-title);
      font-family: var(--font-title);
      font-size: 18px;
      font-weight: normal;
      line-height: 24px;
      text-overflow: ellipsis;
      white-space: nowrap;
    }
  }
}

.twc-costume-desc {
  color: var(--box-text-2);
  font-size: 14px;
  line-height: 22px;
  white-space: pre-wrap;
}

.twc-costume-preview {
  display: flex;
  overflow: hidden;
  min-height: 240px;
  align-items: center;
  justify-content: center;
  padding: 12px;
  border-left: 1px solid var(--common-shadow-1);
  background: var(--box-bg-2);

  img {
    width: 100%;
    height: 100%;
    max-height: 280px;
    object-fit: contain;
  }
}

@media (width <= 760px) {
  .twc-costume-detail {
    grid-template-columns: 1fr;
  }

  .twc-costume-copy {
    padding: 16px;
  }

  .twc-costume-preview {
    border-top: 1px solid var(--common-shadow-1);
    border-left: 0;
  }
}
</style>
