<template>
  <div class="hta-th-box">
    <table class="hta-th-table">
      <!-- 表头 -->
      <tr>
        <th>角色</th>
        <th>持有</th>
        <th>0命</th>
        <th>1命</th>
        <th>2命</th>
        <th>3命</th>
        <th>4命</th>
        <th>5命</th>
        <th>6命</th>
      </tr>
      <!-- 表格 -->
      <tr v-for="item in props.modelValue" :key="item.HoldingRate" class="hta-th-tr">
        <td class="hta-th-td">
          <TibWikiAbyss2 v-model="item.AvatarId" />
        </td>
        <td>{{ (item.HoldingRate * 100).toFixed(3) }}%</td>
        <td v-for="rate in item.Constellations" :key="rate.Item">
          {{ (rate.Rate * 100).toFixed(3) }}%
        </td>
      </tr>
    </table>
  </div>
</template>
<script lang="ts" setup>
import TibWikiAbyss2 from "../itembox/tib-wiki-abyss-2.vue";

interface HtaTabHoldProps {
  modelValue: TGApp.Plugins.Hutao.Abyss.AvatarHold[];
}

const props = defineProps<HtaTabHoldProps>();
</script>
<style lang="css" scoped>
.hta-th-box {
  height: 100%;
  max-height: calc(100vh - 120px);
  padding-right: 5px;
  border-radius: 5px;
  overflow-y: auto;
}

.hta-th-table {
  width: 100%;
  border-radius: 5px;
  background: var(--box-bg-1);
  text-align: center;
}

.hta-th-tr {
  border-radius: 5px;
  background: var(--box-bg-2);
  border-collapse: collapse;
}

.hta-th-td {
  display: flex;
  width: 100%;
  height: 100%;
  align-items: center;
  justify-content: center;
  padding: 10px;
}
</style>
