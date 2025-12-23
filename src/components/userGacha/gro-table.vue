<!-- todo 优化，增加筛选功能 -->
<template>
  <v-data-table
    :headers="headers"
    :items="props.modelValue"
    fixed-header
    fixed-footer
    class="ua-gt-box"
  >
    <template v-slot:item="{ item }">
      <tr class="ua-gt-tr">
        <td>{{ item.time }}</td>
        <td>{{ getPool(item.uigfType) }}</td>
        <td>{{ item.type }}</td>
        <td>{{ item.name }}</td>
        <td>{{ item.rank }}</td>
      </tr>
    </template>
  </v-data-table>
</template>
<script lang="ts" setup>
type GroTableProps = { modelValue: Array<TGApp.Sqlite.Gacha.Gacha> };

const props = defineProps<GroTableProps>();

const headers = <const>[
  { title: "时间", align: "center", key: "time" },
  { title: "卡池", align: "center", key: "uigfType" },
  { title: "类型", align: "center", key: "type" },
  { title: "名称", align: "center", key: "name" },
  { title: "星级", align: "center", key: "rank" },
];

function getPool(type: string) {
  switch (type) {
    case "100":
      return "新手祈愿";
    case "200":
      return "常驻祈愿";
    case "301":
      return "角色活动祈愿";
    case "302":
      return "武器活动祈愿";
    case "500":
      return "集录祈愿";
    default:
      return "未知";
  }
}
</script>
<style lang="css" scoped>
.ua-gt-box {
  height: calc(100vh - 200px);
  padding-right: 5px;
  border-radius: 5px;
  overflow-y: auto;
}

.ua-gt-tr {
  text-align: center;
}
</style>
