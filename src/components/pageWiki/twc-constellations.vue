<template>
  <div class="twc-constellations-box">
    <v-tabs v-model="tab" class="twc-detail-tabs twc-icon-tabs" density="compact" show-arrows>
      <v-tab
        v-for="(item, index) in props.data"
        :key="index"
        :aria-label="item.Name"
        :title="item.Name"
        :value="item.Name"
        class="twc-constellation-tab"
      >
        <img :src="`/icon/constellations/${item.Icon}.webp`" alt="" />
      </v-tab>
    </v-tabs>
    <v-window v-model="tab">
      <v-window-item
        v-for="(item, index) in props.data"
        :key="index"
        :value="item.Name"
        class="twc-constellation-desc"
      >
        <div class="twc-constellation-normal">
          <span v-html="parseHtmlText(item.Description)"></span>
        </div>
        <div v-if="item.SpecialDescription" class="twc-constellation-spec">
          <span v-html="parseHtmlText(item.SpecialDescription)" />
        </div>
      </v-window-item>
    </v-window>
  </div>
</template>
<script lang="ts" setup>
import { parseHtmlText } from "@utils/toolFunc.js";
import { onMounted, watch } from "vue";

type TwcConstellationProps = { data: Array<TGApp.Plugins.Hutao.Character.RhisdTalent> };

const props = defineProps<TwcConstellationProps>();
const tab = defineModel<string>("selected");

function loadData(): void {
  tab.value = props.data[0].Name;
}

onMounted(() => loadData());

watch(() => props.data, loadData);
</script>
<style lang="scss" scoped>
.twc-constellations-box {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.twc-constellation-tab {
  display: flex;
  align-items: center;
  justify-content: center;
  font-weight: normal;
}

.twc-constellation-tab img {
  width: 24px;
  height: 24px;
  filter: var(--icon-filter);
}

.twc-constellation-desc {
  display: flex;
  font-size: 14px;
}

.twc-constellation-normal {
  width: 100%;
  white-space: pre-wrap;

  span {
    :deep(span) {
      filter: var(--gs-filter);
    }
  }
}

.twc-constellation-spec {
  padding: 8px;
  border-radius: 4px;
  margin-left: 4px;
  background: var(--box-bg-3);
  white-space: pre-wrap;

  span {
    :deep(span) {
      filter: var(--gs-filter);
    }
  }
}
</style>
