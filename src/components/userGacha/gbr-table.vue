<!-- 千星奇域数据表格 -->
<template>
  <v-data-table
    :headers="headers"
    :items="props.modelValue"
    fixed-header
    fixed-footer
    class="gbr-t-box"
  >
    <template v-slot:item="{ item }">
      <tr class="gbr-t-tr">
        <td>{{ item.time }}</td>
        <td>{{ getPool(item.opGachaType) }}</td>
        <td>{{ item.type }}</td>
        <td>{{ item.name }}</td>
        <td>{{ item.rank }}</td>
      </tr>
    </template>
  </v-data-table>
</template>
<script lang="ts" setup>
type GroTableProps = { modelValue: Array<TGApp.Sqlite.GachaRecords.TableGachaB> };

const props = defineProps<GroTableProps>();

const headers = <const>[
  { title: "时间", align: "center", key: "time" },
  { title: "卡池", align: "center", key: "opGachaType" },
  { title: "类型", align: "center", key: "type" },
  { title: "名称", align: "center", key: "name" },
  { title: "星级", align: "center", key: "rank" },
];

function getPool(type: string) {
  switch (type) {
    case "1000":
      return "常驻颂愿";
    case "2000":
      return "活动颂愿";
    case "20011":
    case "20012":
      return "活动颂愿-男";
    case "20021":
    case "20022":
      return "活动颂愿-女";
    default:
      return "未知";
  }
}
</script>
<style lang="css" scoped>
.gbr-t-box {
  height: calc(100vh - 200px);
  padding-right: 5px;
  border-radius: 5px;
  overflow-y: auto;
}

.gbr-t-tr {
  text-align: center;
}
</style>
