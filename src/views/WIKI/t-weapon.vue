<template></template>
<script lang="ts" setup>
import { onMounted, ref } from "vue";
import { useRoute } from "vue-router";

import showSnackbar from "../../components/func/snackbar";
import { getWikiData } from "../../data";

const id = <string>useRoute().params.id;
const data = ref<any>();

onMounted(async () => {
  try {
    const res = await getWikiData("Weapon", id);
    data.value = res.default;
  } catch (e) {
    console.error(e);
    showSnackbar({
      text: "Wiki 数据获取失败",
      color: "error",
    });
    history.back();
  }
});
</script>
