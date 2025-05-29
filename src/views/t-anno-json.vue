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
              :data="JSON.parse(JSON.stringify(jsonList))"
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
          <div class="taj-title">活动内容 JSON</div>
        </template>
        <template #text>
          <div class="taj-box">
            <vue-json-pretty
              :data="JSON.parse(JSON.stringify(jsonContent))"
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
          <div class="taj-title">解析 JSON</div>
        </template>
        <template #text>
          <div class="taj-box">
            <vue-json-pretty
              :data="JSON.parse(JSON.stringify(parsedJson))"
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
import Hk4eApi, { type AnnoLang, AnnoServer } from "@req/hk4eReq.js";
import useAppStore from "@store/app.js";
import parseAnnoContent from "@utils/annoParser.js";
import { storeToRefs } from "pinia";
import { computed, onMounted, shallowRef } from "vue";
import VueJsonPretty from "vue-json-pretty";
import "vue-json-pretty/lib/styles.css";
import { useRoute } from "vue-router";

// 数据
const route = useRoute();
const annoId = Number(route.params.anno_id);
const region = <AnnoServer>route.params.region;
const lang = <AnnoLang>route.params.lang;
const { theme } = storeToRefs(useAppStore());
const jsonList = shallowRef<TGApp.BBS.Announcement.AnnoSingle>();
const jsonContent = shallowRef<TGApp.BBS.Announcement.ContentItem>();
const parsedJson = shallowRef<Array<TGApp.BBS.SctPost.Base>>();
const jsonTheme = computed<"dark" | "light">(() => (theme.value === "dark" ? "dark" : "light"));

onMounted(async () => {
  await showLoading.start("正在获取公告数据");
  if (!annoId) {
    await showLoading.empty("未找到数据");
    return;
  }
  await showLoading.update(`公告ID: ${annoId}`);
  const listData = await Hk4eApi.anno.list(region, lang);
  for (const listItem of listData.list) {
    for (const single of listItem.list) {
      if (single.ann_id === annoId) {
        jsonList.value = single;
        break;
      }
    }
  }
  jsonContent.value = await Hk4eApi.anno.content(annoId, region, lang);
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
