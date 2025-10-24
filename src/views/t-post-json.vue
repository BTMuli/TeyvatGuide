<template>
  <TSwitchTheme />
  <TPinWin />
  <div class="tpj-page">
    <v-expansion-panels>
      <v-expansion-panel>
        <template #title>
          <div class="tpj-title">帖子返回内容 JSON</div>
        </template>
        <template #text>
          <div class="tpj-box">
            <span class="tpj-box-copy" @click="copyContent(jsonData)" title="复制全部内容到剪贴板">
              <v-icon small>mdi-content-copy</v-icon>
            </span>
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
            <span class="tpj-box-copy" @click="copyContent(parseData)" title="复制全部内容到剪贴板">
              <v-icon small>mdi-content-copy</v-icon>
            </span>
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
import TPinWin from "@comp/app/t-pinWin.vue";
import TSwitchTheme from "@comp/app/t-switchTheme.vue";
import showLoading from "@comp/func/loading.js";
import showSnackbar from "@comp/func/snackbar.js";
import postReq from "@req/postReq.js";
import useAppStore from "@store/app.js";
import useUserStore from "@store/user.js";
import TGLogger from "@utils/TGLogger.js";
import { storeToRefs } from "pinia";
import { computed, onMounted, ref, shallowRef } from "vue";
import VueJsonPretty from "vue-json-pretty";
import "vue-json-pretty/lib/styles.css";
import { useRoute } from "vue-router";

const { theme } = storeToRefs(useAppStore());
const { cookie } = storeToRefs(useUserStore());
const postId = Number(useRoute().params.post_id);
const isEmpty = ref<boolean>(false);
const jsonData = shallowRef<TGApp.BBS.Post.FullData>();
const parseData = shallowRef<Array<TGApp.BBS.SctPost.Base>>();
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

async function copyContent(jsonData: unknown): Promise<void> {
  try {
    await navigator.clipboard.writeText(JSON.stringify(jsonData, null, 2));
    showSnackbar.success("已复制帖子返回内容 JSON 到剪贴板");
  } catch (err) {
    showSnackbar.error("复制失败，请稍后重试");
    await TGLogger.Error(`[${postId}]复制帖子返回内容 JSON 失败：${err}`);
  }
}
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
  position: relative;
  width: 100%;
  max-width: 100%;
  box-sizing: border-box;
  padding: 12px;
  border-radius: 4px;
  background: var(--box-bg-1);
}

.tpj-box-copy {
  position: absolute;
  z-index: 1;
  top: 8px;
  right: 8px;
  display: flex;
  width: 24px;
  height: 24px;
  align-items: center;
  justify-content: center;
  border-radius: 4px;
  color: var(--common-text-title);
  cursor: pointer;
  transition: background 0.2s;
}
</style>
