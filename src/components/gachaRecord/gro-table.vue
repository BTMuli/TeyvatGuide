<template>
  <!-- todo 优化，增加筛选功能 -->
  <div class="ua-gt-box">
    <v-data-table
      :headers="headers"
      :items="props.modelValue"
      height="500px"
      fixed-header
      fixed-footer
    >
      <template v-slot:item="{ item }">
        <tr class="ua-gt-tr">
          <td>{{ item.time }}</td>
          <td>{{ getPool(item.gachaType) }}</td>
          <td>{{ item.type }}</td>
          <td>{{ item.name }}</td>
          <td>{{ item.rank }}</td>
        </tr>
      </template>
    </v-data-table>
  </div>
</template>
<script lang="ts" setup>
interface GroTableProps {
  modelValue: TGApp.Sqlite.GachaRecords.SingleTable[];
}

const props = defineProps<GroTableProps>();

const headers = [
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
    case "400":
      return "集录祈愿";
    default:
      return "未知";
  }
}
</script>
<style lang="css" scoped>
.ua-gt-box {
  height: 100%;
  max-height: calc(100vh - 120px);
  padding-right: 5px;
  border-radius: 5px;
  overflow-y: auto;
}

.ua-gt-tr {
  text-align: center;
}
</style>
