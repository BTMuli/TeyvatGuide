<!-- 绘想游迹项 -->
<template>
  <div
    :class="{ locked: props.item.status === gameEnum.combat.charMasterStat.LOCK }"
    class="tuc-ovci-box"
  >
    <img alt="bg" class="tuc-ovci-bg" src="/UI/combat/charBg.webp" />
    <img :src="props.item.icon" alt="icon" class="tuc-ovci-icon" />
    <img alt="front" class="tuc-ovci-front" src="/UI/combat/charFront.webp" />
    <div class="tuc-ovci-stat">
      <template v-if="props.item.status === gameEnum.combat.charMasterStat.DONE">
        <img alt="finish" src="/UI/combat/charFinish.webp" />
      </template>
      <template v-if="props.item.status === gameEnum.combat.charMasterStat.LOCK">
        <img alt="finish" src="/UI/combat/charLock.webp" />
      </template>
    </div>
    <span class="tuc-ovci-title">{{ props.item.name }}</span>
  </div>
</template>
<script lang="ts" setup>
import gameEnum from "@enum/game.js";

type TucOvcItemProps = { item: TGApp.Game.Combat.CharMaster };
const props = defineProps<TucOvcItemProps>();
</script>
<style lang="scss" scoped>
.tuc-ovci-box {
  position: relative;
  display: flex;
  width: 100%;
  box-sizing: border-box;
  flex-direction: column;
  flex-shrink: 0;
  align-items: center;
  justify-content: center;
  padding-top: 100%;
  aspect-ratio: 327 / 600;

  &.locked {
    .tuc-ovci-icon {
      opacity: 0.6;
    }
  }
}

.tuc-ovci-bg {
  position: absolute;
  z-index: 1;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
}

.tuc-ovci-icon {
  position: absolute;
  z-index: 2;
  top: 3%;
  left: 0;
  width: 100%;
  border-radius: 50%;
}

.tuc-ovci-front {
  position: absolute;
  z-index: 3;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
}

.tuc-ovci-stat {
  position: relative;
  z-index: 4;
  display: flex;
  width: 100%;
  height: 30%;
  align-items: center;
  justify-content: center;

  img {
    position: relative;
    display: flex;
    height: 100%;
    align-items: center;
    justify-content: center;
  }
}

.tuc-ovci-title {
  position: relative;
  z-index: 4;
  color: #a67754;
  font-family: var(--font-title);
  font-size: 14px;
}
</style>
