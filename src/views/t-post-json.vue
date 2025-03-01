<template>
  <TSwitchTheme />
  <div class="tpj-page">
    <v-expansion-panels>
      <v-expansion-panel>
        <template #title>
          <div class="tpj-title">帖子返回内容 JSON</div>
        </template>
        <template #text>
          <div class="tpj-box">
            <vue-json-pretty
              :data="JSON.parse(JSON.stringify(jsonData))"
              :show-icon="true"
              :show-length="true"
              :show-line="true"
              :show-line-number="true"
              :show-double-quotes="true"
              :show-key-value-space="true"
              :collapsed-on-click-brackets="true"
              :deep="2"
              :theme="jsonTheme"
            />
          </div>
        </template>
      </v-expansion-panel>
      <v-expansion-panel>
        <template #title>
          <div class="tpj-title">帖子解析内容 JSON</div>
        </template>
        <template #text>
          <div class="tpj-box">
            <vue-json-pretty
              :data="parseData"
              :show-icon="true"
              :show-length="true"
              :show-line="true"
              :show-line-number="true"
              :show-double-quotes="true"
              :show-key-value-space="true"
              :collapsed-on-click-brackets="true"
              :deep="2"
              :theme="jsonTheme"
            />
          </div>
        </template>
      </v-expansion-panel>
    </v-expansion-panels>
  </div>
</template>
<script lang="ts" setup>
import TSwitchTheme from "@comp/app/t-switchTheme.vue";
import showLoading from "@comp/func/loading.js";
import showSnackbar from "@comp/func/snackbar.js";
import { storeToRefs } from "pinia";
import { computed, onMounted, ref, shallowRef } from "vue";
import VueJsonPretty from "vue-json-pretty";
import "vue-json-pretty/lib/styles.css";
import { useRoute } from "vue-router";

import { useAppStore } from "@/store/modules/app.js";
import { useUserStore } from "@/store/modules/user.js";
import TGLogger from "@/utils/TGLogger.js";
import postReq from "@/web/request/postReq.js";

const { theme } = storeToRefs(useAppStore());
const { cookie } = storeToRefs(useUserStore());
const postId = Number(useRoute().params.post_id);
const isEmpty = ref<boolean>(false);
const jsonData = shallowRef<TGApp.Plugins.Mys.Post.FullData>();
const parseData = shallowRef<Array<TGApp.Plugins.Mys.SctPost.Base>>();
const jsonTheme = computed<"dark" | "light">(() => (theme.value === "dark" ? "dark" : "light"));

onMounted(async () => {
  await showLoading.start(`正在获取帖子数据`);
  if (!postId) {
    await showLoading.empty("未获取到PostID");
    return;
  }
  let ck: Record<string, string> | undefined = undefined;
  if (cookie.value) ck = { ltoken: cookie.value.ltoken, ltuid: cookie.value.ltuid };
  const resp = await postReq.post(postId, ck);
  if ("retcode" in resp) {
    await showLoading.empty("获取数据失败", `[${resp.retcode}]${resp.message}`);
    showSnackbar.error(`[${resp.retcode}]${resp.message}`);
    await TGLogger.Error(`[${postId}]获取帖子数据失败：${resp.retcode} ${resp.message}`);
    return;
  }
  await showLoading.update("正在渲染帖子数据");
  jsonData.value = resp;
  try {
    parseData.value = JSON.parse(jsonData.value.post.content);
  } catch (err) {
    try {
      parseData.value = JSON.parse(jsonData.value.post.structured_content);
    } catch (e) {
      isEmpty.value = true;
      await TGLogger.Error(`[${postId}]解析帖子数据失败：${e}`);
    }
    console.warn(`[${postId}]解析帖子数据失败：${err}`);
  }
  await showLoading.end();
});
</script>
<style lang="scss" scoped>
.tpj-page {
  width: 800px;
  margin: 0 auto;
  font-family: var(--font-text);
}

.tpj-title {
  color: var(--common-text-title);
  font-family: var(--font-title);
  font-size: 20px;
  font-weight: 600;
}

.tpj-box {
  border-radius: 4px;
  position: relative;
  width: 100%;
  padding: 12px;
  box-sizing: border-box;
  max-width: 100%;
  background: var(--box-bg-1);
}
</style>
