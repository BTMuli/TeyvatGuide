<template>
  <TOverlay v-model="visible" hide>
    <div class="toc-box">
      <div class="box-div">
        <div class="toc-top">
          <div class="toc-icon">
            <TMiniAvatar v-if="itemType=== 'character'" v-model="itemVal" size="100px" />
            <TMiniWeapon v-if="itemType=== 'weapon'" v-model="itemVal" size="100px" />
          </div>
          <div class="toc-material-grid">
            <TCalendarMaterial v-for="item in itemVal.materials" :item="item" />
          </div>
        </div>
        <img src="/source/UI/item-line.webp" alt="line" class="toc-line">
        <div class="toc-bottom">
          <div class="toc-src-box">
            <div class="toc-src-text">
              来源：
            </div>
            <img :src="`/icon/nation/${itemVal.source.area}.webp`" alt="icon">
            <div class="toc-src-text">
              {{ itemVal.source.area }} - {{ itemVal.source.name }}
            </div>
          </div>
          <v-btn variant="outlined" @click="toDetail(itemVal)">
            <template #append>
              <img src="../../assets/icons/arrow-right.svg" alt="right" class="toc-btn-img">
            </template>
            详情
          </v-btn>
        </div>
      </div>
      <div class="close-div">
        <div class="close-btn" @click="onCancel">
          <v-icon>mdi-close</v-icon>
        </div>
      </div>
    </div>
  </TOverlay>
  <v-snackbar v-model="snackbar" :timeout="1500" color="error">
    该 {{ itemType === "weapon" ? "武器" : "角色" }} 暂无详情
  </v-snackbar>
</template>
<script setup lang="ts">
// vue
import { computed, ref } from "vue";
import TOverlay from "../main/t-overlay.vue";
import TCalendarMaterial from "../mini/t-calendar-material.vue";
import TMiniAvatar from "../mini/t-mini-avatar.vue";
import TMiniWeapon from "../mini/t-mini-weapon.vue";
// utils
import { OBC_CONTENT_API } from "../../plugins/Mys/interface/utils";
import { createTGWindow } from "../../utils/TGWindow";

interface TOCalendarProps {
  modelValue: boolean;
  dataType: string;
  dataVal: TGApp.App.Calendar.Item;
}

interface TOCalendarEmits {
  (e: "update:modelValue", value: TGApp.App.Calendar.Item): void;
  (e: "cancel"): void;
}

const emits = defineEmits<TOCalendarEmits>();
const props = withDefaults(defineProps<TOCalendarProps>(), {
  modelValue: false,
  dataType: "",
  dataVal: {} as TGApp.App.Calendar.Item,
});

const visible = computed({
  get: () => props.modelValue,
  set: (value) => emits("update:modelValue", value),
});
const itemType = computed(() => props.dataType);
const itemVal = computed(() => props.dataVal);
const snackbar = ref(false);

const onCancel = () => {
  visible.value = false;
  emits("cancel");
};

function toDetail (item: TGApp.App.Calendar.Item) {
  if (item.contentId === 0) {
    snackbar.value = true;
    return;
  }
  const url = OBC_CONTENT_API.replace("{content_id}", item.contentId.toString());
  createTGWindow(url, "素材详情", item.name, 1200, 800, true);
}
</script>
<style scoped>
/* overlay 盒子 */
.toc-box {
  width: 440px;
  height: 260px;
}

.box-div {
  height: 200px;
  background: rgb(255 255 255 / 30%);
  padding: 10px;
  border-radius: 5px;
  color: #faf7e8;
  align-items: center;
}

.toc-top {
  height: 100px;
  width: 100%;
  display: flex;
}

.toc-icon {
  height: 100px;
  width: 100px;
}

.toc-material-grid {
  margin-left: 10px;
  font-family: Genshin, serif;
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  grid-gap: 10px;
}

.toc-line {
  width: 100%;
  height: auto;
}

.toc-bottom {
  background: rgb(0 0 0 / 30%);
  padding: 3px 10px;
  width: 420px;
  border-radius: 5px;
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.toc-bottom img {
  width: 50px;
  height: 50px;
}

.toc-src-box {
  width: 300px;
  height: 50px;
  display: flex;
  justify-content: left;
  align-items: center;
}

.toc-src-text {
  height: 50px;
  font-size: 20px;
  font-family: Genshin-Light, serif;
  display: flex;
  justify-content: center;
  align-items: center;
}

.toc-btn-img {
  width: 18px !important;
  height: 18px !important;
}

.close-div {
  height: 60px;
  width: 100%;
  display: flex;
  justify-content: center;
  align-items: center;
}

.close-btn {
  border-radius: 50%;
  width: 30px;
  height: 30px;
  background: rgb(255 255 255 / 30%);
  color: #faf7e8;
  cursor: pointer;
  display: flex;
  justify-content: center;
  align-items: center;
}
</style>
