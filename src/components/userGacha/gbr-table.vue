<!-- 颂愿数据表格 -->
<template>
  <v-data-table
    :headers="headers"
    :items="props.modelValue"
    class="gbr-t-box"
    fixed-footer
    fixed-header
  >
    <template v-slot:item="{ item }">
      <tr class="gbr-t-tr">
        <td>{{ item.time }}</td>
        <td>{{ getPool(item.opGachaType) }}</td>
        <td>{{ item.type }}</td>
        <td>{{ item.name }}</td>
        <td width="80">
          <div class="gbr-t-icon">
            <img :src="`/icon/bg/${item.rank}-BGC.webp`" alt="icon" class="bg" />
            <img :src="getIcon(item.itemId)" alt="icon" class="icon" />
          </div>
        </td>
        <td>{{ item.rank }}</td>
      </tr>
    </template>
  </v-data-table>
</template>
<script lang="ts" setup>
import { AppGachaBData } from "@/data/index.js";

type GroTableProps = { modelValue: Array<TGApp.Sqlite.GachaRecords.TableGachaB> };

const props = defineProps<GroTableProps>();

const headers = <const>[
  { title: "时间", align: "center", key: "time" },
  { title: "卡池", align: "center", key: "opGachaType" },
  { title: "类型", align: "center", key: "type" },
  { title: "名称", align: "center", key: "name" },
  { title: "图标", align: "center", key: "icon" },
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

function getIcon(id: string): string {
  const find = AppGachaBData.find((i) => i.id.toString() === id);
  if (!find) return `/source/UI/paimon.webp`;
  return `/WIKI/gachaB/${find.icon}.webp`;
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

.gbr-t-icon {
  position: relative;
  display: flex;
  overflow: hidden;
  width: 64px;
  height: 64px;
  flex-shrink: 0;
  align-items: center;
  justify-content: center;
  border-radius: 4px;
  margin: 4px 0;

  .bg {
    position: absolute;
    z-index: 0;
    top: 0;
    left: 0;
    width: 100%;
    height: 100%;
  }

  .icon {
    position: relative;
    z-index: 1;
    width: 48px;
    height: 48px;
    flex-shrink: 0;
  }
}
</style>
