<template>
  <TItemBox :model-value="box" />
</template>
<script setup lang="ts">
// vue
import { ref, onMounted, computed } from "vue";
import TItemBox, { type TItemBoxData } from "../main/t-itembox.vue";
// plugins
import TGSqlite from "../../plugins/Sqlite";

interface TibWikiAbyssProps {
  modelValue: {
    Item: number;
    Rate: number;
  };
}

const props = defineProps<TibWikiAbyssProps>();
const defaultAvatar = <TGApp.Sqlite.Character.AppData>{
  birthday: "",
  element: "",
  id: props.modelValue.Item,
  name: "旅行者",
  nameCard: "",
  star: 5,
  title: "",
  updated: "",
  weapon: "单手剑",
};
const avatar = ref<TGApp.Sqlite.Character.AppData>(defaultAvatar);

const box = computed<TItemBoxData>(() => {
  return {
    bg: `/icon/bg/${avatar.value?.star}-Star.webp`,
    clickable: false,
    display: "outer",
    height: "100px",
    icon: `/WIKI/character/icon/${avatar.value?.id}.webp`,
    innerHeight: 20,
    // 0.24688451 => 24.688%
    innerText: (props.modelValue.Rate * 100).toFixed(3) + "%",
    lt:
      avatar.value.element !== ""
        ? `/icon/element/${avatar.value.element}元素.webp`
        : `/icon/weapon/${avatar.value.weapon}.webp`,
    ltSize: "30px",
    outerHeight: 20,
    outerText: avatar.value.name,
    size: "80px",
  };
});

onMounted(async () => {
  // 如果是 10000005或 10000007，就是主角
  if (props.modelValue.Item === 10000005 || props.modelValue.Item === 10000007) {
    return;
  }
  avatar.value = await TGSqlite.getAppCharacter(props.modelValue.Item);
});
</script>
