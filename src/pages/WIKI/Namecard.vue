<template>
  <div class="tw-nc-box">
    <v-virtual-scroll :items="AppNameCardsData" :item-height="80" class="cards-list">
      <template #default="{ item }">
        <v-list
          :style="{ backgroundImage: `url(${item.bg})` }"
          class="card-box"
          @click="toNameCard(item)"
        >
          <v-list-item :title="item.name" :subtitle="item.desc">
            <template #prepend>
              <v-img width="80px" style="margin-right: 10px" :src="item.icon" />
            </template>
          </v-list-item>
        </v-list>
      </template>
    </v-virtual-scroll>
    <ToNamecard v-model="visible" :data="curNameCard" />
  </div>
</template>
<script lang="ts" setup>
import { onMounted, ref } from "vue";

import ToNamecard from "../../components/overlay/to-namecard.vue";
import { AppNameCardsData } from "../../data";

const curNameCard = ref<TGApp.App.NameCard.Item>();
const visible = ref(false);

onMounted(() => {
  curNameCard.value = AppNameCardsData[0];
});

function toNameCard(item: TGApp.App.NameCard.Item) {
  curNameCard.value = item;
  visible.value = true;
}
</script>
<style lang="css" scoped>
.tw-nc-box {
  overflow: auto;
  width: 100%;
  height: 100%;
  padding: 10px;
}

.card-box {
  width: 100%;
  border: 1px solid var(--common-shadow-2);
  border-radius: 10px 50px 50px 10px;
  margin-bottom: 10px;
  background-position: right;
  background-repeat: no-repeat;
  cursor: pointer;
  font-family: var(--font-title);
}
</style>
