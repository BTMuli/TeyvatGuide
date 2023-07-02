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
      <tr v-for="item in props.modelValue" :key="item.holdingRate" class="hta-th-tr">
        <td class="hta-th-td">
          <TibWikiAbyss2 v-model="item.avatarId" />
        </td>
        <td>{{ (item.holdingRate * 100).toFixed(3) }}%</td>
        <td v-for="rate in item.constellations" :key="rate.item">
          {{ (rate.rate * 100).toFixed(3) }}%
        </td>
      </tr>
    </table>
  </div>
</template>
<script lang="ts" setup>
// vue
import TibWikiAbyss2 from "../itembox/tib-wiki-abyss-2.vue";

interface HtaTabHoldProps {
  modelValue: TGApp.Plugins.Hutao.Abyss.AvatarHold[];
}

const props = defineProps<HtaTabHoldProps>();
</script>
<style lang="css" scoped>
.hta-th-box {
  width: calc(100% - 10px);
  height: 100%;
  border: 1px inset var(--common-bg-1);
  border-radius: 5px;
  max-height: calc(100vh - 120px);
  overflow-y: auto;
  padding: 10px;
}

.hta-th-table {
  width: 100%;
  text-align: center;
}

.hta-th-tr {
  border-radius: 5px;
  background: var(--common-bg-1);
  border-collapse: collapse;
}

.hta-th-td {
  width: 100%;
  height: 100%;
  padding: 10px;
  display: flex;
  justify-content: center;
  align-items: center;
}
</style>
