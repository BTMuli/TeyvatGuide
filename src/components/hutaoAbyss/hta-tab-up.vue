<template>
  <HtaAvatarRankGrid v-if="selectedData" :ranks="selectedData.Ranks" />
  <div v-else class="hta-tu-empty">暂无数据</div>
</template>
<script lang="ts" setup>
import { computed } from "vue";

import HtaAvatarRankGrid from "./hta-avatar-rank-grid.vue";

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
.hta-tu-empty {
  display: flex;
  width: 100%;
  height: 100%;
  align-items: center;
  justify-content: center;
  color: var(--box-text-4);
}
</style>
