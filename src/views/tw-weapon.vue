<template>
  <ToLoading v-model="loading" :empty="loadingEmpty" :title="loadingTitle" :subtitle="loadingSub" />
  <div class="ww-box">
    {{ data }}
  </div>
</template>
<script lang="ts" setup>
import { appWindow } from "@tauri-apps/api/window";
import { onMounted, ref } from "vue";
import { useRoute } from "vue-router";

import showSnackbar from "../components/func/snackbar";
import ToLoading from "../components/overlay/to-loading.vue";
import { getWikiData } from "../data";

// 路由数据
const id = <string>useRoute().params.id;
// 加载
const loading = ref<boolean>(true);
const loadingEmpty = ref<boolean>(false);
const loadingTitle = ref<string>("正在加载");
const loadingSub = ref<string>();

// 数据
const data = ref<TGApp.App.Weapon.WikiItem>();

onMounted(async () => {
  await appWindow.show();
  try {
    const res = await getWikiData("Weapon", id);
    if (res !== undefined) {
      data.value = res.default;
    }
    loading.value = false;
  } catch (error) {
    loadingEmpty.value = true;
    if (error instanceof Error) {
      loadingTitle.value = error.name;
      loadingSub.value = error.message;
    } else {
      loadingTitle.value = "未知错误";
      loadingSub.value = <string>error;
    }
    showSnackbar({
      text: "Wiki 数据获取失败，即将关闭窗口",
      color: "error",
    });
    // setTimeout(() => {
    //   appWindow.close();
    // }, 3000);
  }
});
</script>
