<template>
  <div class="tucr-box">
    <div class="tucr-title">
      <img :src="`/icon/star/combat${modelValue.is_get_medal ? 1 : 0}.webp`" alt="combat" />
      <span class="main">第{{ modelValue.round_id }}幕</span>
      <span class="sub">{{ timestampToDate(Number(modelValue.finish_time) * 1000) }}</span>
    </div>
    <div class="tucr-content">
      <TucSub title="出演角色" class="main">
        <TucAvatars :model-value="modelValue.avatars" />
      </TucSub>
      <TucSub title="辉彩祝福" class="main">
        <TucBuffs :model-value="modelValue.splendour_buff" />
      </TucSub>
      <TucSub :title="`神秘收获(${modelValue.choice_cards.length})`" class="sub">
        <TucCards :model-value="modelValue.choice_cards" />
      </TucSub>
    </div>
  </div>
</template>
<script lang="ts" setup>
import TucAvatars from "./tuc-avatars.vue";
import TucBuffs from "./tuc-buffs.vue";
import TucCards from "./tuc-cards.vue";
import TucSub from "./tuc-sub.vue";

import { timestampToDate } from "@/utils/toolFunc.js";

defineProps<{ modelValue: TGApp.Game.Combat.RoundData }>();
</script>
<style lang="css" scoped>
.tucr-box {
  display: flex;
  width: 100%;
  height: fit-content;
  flex-direction: column;
  align-items: center;
  padding: 5px;
  border-radius: 5px;
  background: var(--box-bg-1);
  row-gap: 5px;
}

.tucr-title {
  display: flex;
  align-items: flex-end;
  justify-content: center;
  margin-right: auto;
  column-gap: 5px;

  img {
    width: 30px;
    aspect-ratio: 1;
  }

  .main {
    color: var(--common-text-title);
    font-family: var(--font-title);
    font-size: 20px;
  }

  .sub {
    opacity: 0.8;
  }
}

.tucr-content {
  display: flex;
  width: 100%;
  align-items: flex-start;
  justify-content: flex-start;
  column-gap: 10px;

  .main {
    width: 180px;
  }

  .sub {
    width: 100%;
  }
}
</style>
