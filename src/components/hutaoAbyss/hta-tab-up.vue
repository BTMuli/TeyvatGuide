<template>
  <div v-if="selectedData" class="hta-tu-box">
    <TibWikiAbyss
      v-for="item in selectedData.Ranks"
      :key="item.cur.Item"
      :cur="item.cur.Rate"
      :last="item.last.Rate"
      :role="item.cur.Item"
    />
  </div>
  <div v-else class="hta-tu-empty">暂无数据</div>
</template>
<script lang="ts" setup>
import { computed } from "vue";

import TibWikiAbyss from "./tib-wiki-abyss.vue";

type HtaTabUpProps = {
  data: TGApp.Plugins.Hutao.Abyss.PeriodData<Array<TGApp.Plugins.Hutao.Abyss.AvatarUp>>;
  floor?: number;
};
type HtaTabUpData = {
  Floor: number;
  Ranks: Array<TGApp.Plugins.Hutao.Abyss.PeriodData<TGApp.Plugins.Hutao.Base.Rate>>;
};

const props = defineProps<HtaTabUpProps>();
const select = computed<Array<HtaTabUpData>>(() => {
  const floors = new Set<number>([
    ...props.data.cur.map((item) => item.Floor),
    ...props.data.last.map((item) => item.Floor),
  ]);
  return [...floors].map((floor) => {
    const current = props.data.cur.find((item) => item.Floor === floor);
    const previous = props.data.last.find((item) => item.Floor === floor);
    const avatarIds = new Set<number>([
      ...(current?.Ranks.map((item) => item.Item) ?? []),
      ...(previous?.Ranks.map((item) => item.Item) ?? []),
    ]);
    const ranks = [...avatarIds]
      .map((avatarId) => ({
        cur: current?.Ranks.find((item) => item.Item === avatarId) ?? {
          Item: avatarId,
          Rate: 0,
        },
        last: previous?.Ranks.find((item) => item.Item === avatarId) ?? {
          Item: avatarId,
          Rate: 0,
        },
      }))
      .sort((a, b) => b.cur.Rate - a.cur.Rate);
    return { Floor: floor, Ranks: ranks };
  });
});
const selectedData = computed<HtaTabUpData | undefined>(() =>
  select.value.find((item) => item.Floor === props.floor),
);
</script>
<style lang="scss" scoped>
.hta-tu-box {
  display: grid;
  width: 100%;
  height: 100%;
  min-height: 0;
  box-sizing: border-box;
  align-content: start;
  align-items: center;
  padding: 12px;
  gap: 12px;
  grid-template-columns: repeat(auto-fill, minmax(180px, 1fr));
  overflow-y: auto;
}

.hta-tu-empty {
  display: flex;
  width: 100%;
  height: 100%;
  align-items: center;
  justify-content: center;
  color: var(--box-text-4);
}
</style>
