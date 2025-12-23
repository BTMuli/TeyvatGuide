<template>
  <TSwitchTheme />
  <TPinWin />
  <div class="taj-page">
    <v-expansion-panels>
      <v-expansion-panel>
        <template #title>
          <div class="taj-title">活动列表 JSON</div>
        </template>
        <template #text>
          <div class="taj-box">
            <vue-json-pretty
              :collapsed-on-click-brackets="true"
              :data="JSON.parse(JSON.stringify(jsonList))"
              :deep="2"
              :show-double-quotes="true"
              :show-icon="true"
              :show-key-value-space="true"
              :show-length="true"
              :show-line="true"
              :show-line-number="true"
              :theme="jsonTheme"
            />
          </div>
        </template>
      </v-expansion-panel>
      <v-expansion-panel>
        <template #title>
          <div class="taj-title">活动内容 JSON</div>
        </template>
        <template #text>
          <div class="taj-box">
            <vue-json-pretty
              :collapsed-on-click-brackets="true"
              :data="JSON.parse(JSON.stringify(jsonContent))"
              :deep="2"
              :show-double-quotes="true"
              :show-icon="true"
              :show-key-value-space="true"
              :show-length="true"
              :show-line="true"
              :show-line-number="true"
              :theme="jsonTheme"
            />
          </div>
        </template>
      </v-expansion-panel>
      <v-expansion-panel>
        <template #title>
          <div class="taj-title">解析 JSON</div>
        </template>
        <template #text>
          <div class="taj-box">
            <vue-json-pretty
              :collapsed-on-click-brackets="true"
              :data="JSON.parse(JSON.stringify(parsedJson))"
              :deep="2"
              :show-double-quotes="true"
              :show-icon="true"
              :show-key-value-space="true"
              :show-length="true"
              :show-line="true"
              :show-line-number="true"
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
import hk4eReq from "@req/hk4eReq.js";
import useAppStore from "@store/app.js";
import parseAnnoContent from "@utils/annoParser.js";
import { storeToRefs } from "pinia";
import { computed, onMounted, shallowRef } from "vue";
import VueJsonPretty from "vue-json-pretty";
import "vue-json-pretty/lib/styles.css";
import { useRoute } from "vue-router";

const { theme } = storeToRefs(useAppStore());

const route = useRoute();
const annoId = Number(route.params.anno_id);
const region = <TGApp.Game.Base.ServerTypeEnum>route.params.region;
const lang = <TGApp.Game.Anno.AnnoLangEnum>route.params.lang;

const jsonList = shallowRef<TGApp.Game.Anno.ListAnno>();
const jsonContent = shallowRef<TGApp.Game.Anno.AnnoDetail>();
const parsedJson = shallowRef<Array<TGApp.BBS.SctPost.Base>>();
const jsonTheme = computed<"dark" | "light">(() => (theme.value === "dark" ? "dark" : "light"));

onMounted(async () => {
  await showLoading.start("正在获取公告数据");
  if (!annoId) {
    await showLoading.empty("未找到数据");
    return;
  }
  await showLoading.update(`公告ID: ${annoId}`);
  const listResp = await hk4eReq.anno.list(region, lang);
  console.log("annoList", listResp);
  // TODO: 动态Type
  for (const listItem of listResp.list) {
    for (const single of listItem.list) {
      if (single.ann_id === annoId) {
        jsonList.value = single;
        break;
      }
    }
  }
  const detailResp = await hk4eReq.anno.detail(region, lang);
  const find = detailResp.find((item) => item.ann_id === annoId);
  if (!find) {
    showSnackbar.error("未找到公告数据");
    return;
  }
  jsonContent.value = find;
  parsedJson.value = parseAnnoContent(jsonContent.value);
  await showLoading.end();
});
</script>
<style lang="scss" scoped>
.taj-page {
  width: 800px;
  margin: 0 auto;
  font-family: var(--font-text);
}

.taj-title {
  color: var(--common-text-title);
  font-family: var(--font-title);
  font-size: 20px;
  font-weight: 600;
}

.taj-box {
  position: relative;
  width: 100%;
  max-width: 100%;
  box-sizing: border-box;
  padding: 12px;
  border-radius: 4px;
}
</style>
