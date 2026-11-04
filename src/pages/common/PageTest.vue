<template>
  <div class="test-box">
    <h1>兑换码样式预览</h1>
    <p>以下均为模拟数据，不会读取账号或发送兑换请求。</p>
    <div class="btn-list">
      <v-btn @click="openRedeemPreview(2)">原神兑换码浮窗</v-btn>
      <v-btn @click="openRedeemPreview(8)">绝区零兑换码浮窗</v-btn>
    </div>
    <ToLivecode
      v-model="showRedeemPreview"
      :gid="previewGid"
      :data="fakeCodes"
      actId="preview"
      :preview="fakePreview"
    />
    <h1>颜色测试</h1>
    <div class="test-item">
      <div class="test-1">
        Box 1
        <div class="test-2">
          Box 2
          <div class="test-3">
            Box 3
            <div class="test-4">Box 4</div>
          </div>
        </div>
      </div>
    </div>
    <div class="btn-list">
      <v-btn class="test-btn" @click="testReply()">回复测试</v-btn>
      <v-btn class="test-btn" @click="test()">测试</v-btn>
    </div>
  </div>
  <VpReplyDebug v-model="showReply" />
</template>
<script lang="ts" setup>
import ToLivecode from "@comp/app/to-livecode.vue";
import showSnackbar from "@comp/func/snackbar.js";
import VpReplyDebug from "@comp/viewPost/vp-reply-debug.vue";
import recordReq from "@req/recordReq.js";
import useUserStore from "@store/user.js";
import TGHttps from "@utils/network/TGHttps.js";
import TGLogger from "@utils/system/TGLogger.js";
import { storeToRefs } from "pinia";
import { computed, ref } from "vue";

const previewGid = ref<number>(2);
const showRedeemPreview = ref<boolean>(false);
const fakeCodes: Array<TGApp.BBS.Navigator.CodeData> = [
  { code: "前瞻福利模拟码", title: "原石 / 菲林 ×100", img: "", to_get_time: "1793764800" },
  { code: "PREVIEW2026", title: "养成材料补给", img: "", to_get_time: "1793764800" },
  { code: "", title: "尚未公布", img: "", to_get_time: "1793764800" },
];
const fakePreview = computed<TGApp.Game.Redeem.Preview>(() => ({
  roles: [1, 2].map((index) => ({
    uid: "preview",
    gameBiz: previewGid.value === 2 ? "hk4e_cn" : "nap_cn",
    gameUid: `10000000${index}`,
    isChosen: index === 1 ? 1 : 0,
    isOfficial: 1,
    level: "60",
    nickname: index === 1 ? "模拟旅行者" : "用于检查长昵称换行的模拟角色",
    region: previewGid.value === 2 ? "cn_gf01" : "prod_gf_cn",
    regionName: "国服官服",
    updated: "",
  })),
  results: [
    { code: "前瞻福利模拟码", retcode: 0, message: "兑换成功，请到游戏邮件领取奖励（模拟）" },
    { code: "PREVIEW2026", retcode: -2001, message: "兑换码已过期（模拟）" },
    { code: "NETWORK", retcode: -1, message: "兑换结果未知，请先检查游戏邮件后再重试（模拟）" },
    { code: "WAITING", retcode: -2, message: "未兑换，前序请求异常（模拟）" },
  ],
}));
function openRedeemPreview(gid: number): void {
  previewGid.value = gid;
  showRedeemPreview.value = true;
}

const showReply = ref<boolean>(false);
const { account, cookie } = storeToRefs(useUserStore());

function testReply(): void {
  showReply.value = true;
}

async function test() {
  if (!cookie.value) return;
  let dnResp: TGApp.Game.DailyNote.DnResp | undefined;
  try {
    dnResp = await recordReq.daily(cookie.value, account.value);
    console.debug(`dailyNoteResp`, dnResp);
    if (dnResp.retcode !== 0) {
      showSnackbar.warn(`获取实时便笺失败: ${dnResp.retcode}-${dnResp.message}`);
      await TGLogger.Warn(`[PageTest][test] 获取实时便笺失败`);
      await TGLogger.Warn(`[PageTest][test] ${dnResp}`);
      return;
    }
    showSnackbar.success("成功获取实时便笺数据");
  } catch (e) {
    const errMsg = TGHttps.getErrMsg(e);
    showSnackbar.error(`获取实时便笺失败：${errMsg}`);
    await TGLogger.Error(`[PageTest][test] 获取实时便笺失败`);
    await TGLogger.Error(`[PageTest][test] ${e}`);
  }
}
</script>
<style lang="scss" scoped>
.test-box {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.test-item {
  padding: 10px;
  border-radius: 8px;
}

.btn-list {
  display: flex;
  flex-wrap: wrap;
  justify-content: flex-start;
  margin-bottom: 20px;
  gap: 12px;
}

.test-btn {
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 10px;
  border-radius: 8px;
  background: var(--tgc-btn-1);
  color: var(--btn-text);
}

.test-1,
.test-2,
.test-3,
.test-4 {
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 10px;
  border-radius: 8px;
}

.test-1 {
  background: var(--box-bg-1);
}

.test-2 {
  background: var(--box-bg-2);
}

.test-3 {
  background: var(--box-bg-3);
}

.test-4 {
  background: var(--box-bg-4);
}
</style>
