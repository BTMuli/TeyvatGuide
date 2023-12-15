<template>
  {{ data }}
</template>
<script lang="ts" setup>
import { onMounted, ref } from "vue";
import { useRoute } from "vue-router";

import showSnackbar from "../../components/func/snackbar";
import { getWikiData } from "../../data";

const id = <string>useRoute().params.id;
const data = ref<TGApp.App.Character.WikiItem>();

onMounted(async () => {
  try {
    const res = await getWikiData("Character", id);
    if (res !== undefined) {
      data.value = res.default;
    }
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
