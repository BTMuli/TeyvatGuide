<!-- 背包材料页面 -->
<template>
  <!-- TODO: 顶部栏，参考材料WIKI页面 -->
  <div class="page-bag-material">
    <template v-for="(table, idx) in materialList" :key="idx">
      <PbMaterialItem :tb="table" />
    </template>
    <!-- TODO: 材料浮窗，显示获取数量&更改记录&一些操作 -->
  </div>
</template>
<script lang="ts" setup>
import PbMaterialItem from "@comp/pageBag/pb-materialItem.vue";
import TSUserBagMaterial from "@Sqlm/userBagMaterial.js";
import { onMounted, ref, shallowRef } from "vue";

const curUid = ref<number>();
const uidList = shallowRef<Array<number>>([]);
const materialList = shallowRef<Array<TGApp.Sqlite.UserBag.TableMaterial>>([]);

onMounted(async () => {
  uidList.value = await TSUserBagMaterial.getAllUid();
  // TODO: 如果用户已登录，优先当前登录UID
  if (uidList.value.length > 0) {
    curUid.value = uidList.value[0];
    materialList.value = await TSUserBagMaterial.getMaterial(curUid.value);
    console.log(curUid.value, materialList.value);
  }
});
</script>
<style lang="scss" scoped>
.page-bag-material {
  position: relative;
  display: grid;
  width: 100%;
  gap: 8px;
  grid-template-columns: repeat(auto-fill, minmax(200px, 1fr));
}
</style>
