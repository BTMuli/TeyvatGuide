<!-- 剧诗，角色&敌人 -->
<template>
  <div class="tuc-ae-box">
    <div class="tuc-avatars">
      <div class="tuc-ae-title">上场角色</div>
      <div class="tuc-ae-grid">
        <TItembox
          v-for="(avatar, idx) in props.avatars"
          :key="idx"
          :model-value="getAvatarBox(avatar)"
        />
      </div>
    </div>
    <div class="tuc-enemies">
      <div class="tuc-ae-title">讨伐列表</div>
      <div class="tuc-ae-flex">
        <div v-for="(enemy, idx) in props.enemies" :key="idx" class="tuc-enemy">
          <div class="tuc-enemy-icon">
            <img :src="enemy.icon" alt="icon" />
          </div>
          <div class="tuc-enemy-info">
            <span>{{ enemy.name }}</span>
            <span>Lv.{{ enemy.level }}</span>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>
<script lang="ts" setup>
import TItembox, { type TItemBoxData } from "@comp/app/t-itemBox.vue";
import { getWikiBrief, getZhElement } from "@utils/toolFunc.js";

type TucAeBoxProps = {
  /* 上场角色数据 */
  avatars: Array<TGApp.Game.Combat.Avatar>;
  /* 敌人数据 */
  enemies: Array<TGApp.Game.Combat.Enemy>;
};

const props = defineProps<TucAeBoxProps>();

function getAvatarBox(item: TGApp.Game.Combat.Avatar): TItemBoxData {
  const findAvatar = getWikiBrief(item.avatar_id);
  let innerText = item.avatar_type === 2 ? "试用角色" : item.avatar_type === 3 ? "助演角色" : "";
  let findWeapon;
  if (findAvatar) {
    findWeapon = findAvatar.weapon;
    if (innerText === "") innerText = findAvatar.name;
  }
  return {
    bg: `/icon/bg/${item.rarity === 105 ? 5 : item.rarity}-BGC.webp`,
    clickable: false,
    display: "inner",
    height: "80px",
    icon: `/WIKI/character/${item.avatar_id}.webp`,
    innerHeight: innerText === "" ? 0 : 20,
    innerText: innerText,
    lt:
      item.element === "None"
        ? findWeapon
          ? `/icon/weapon/${findWeapon}.webp`
          : ""
        : `/icon/element/${getZhElement(item.element)}元素.webp`,
    ltSize: "20px",
    innerBlur: "5px",
    rt: "",
    rtSize: "",
    size: "80px",
  };
}
</script>
<style lang="scss" scoped>
.tuc-ae-box {
  position: relative;
  display: flex;
  width: 100%;
  box-sizing: border-box;
  align-items: stretch;
  justify-content: space-between;
  padding: 8px;
  border: 1px solid var(--common-shadow-1);
  border-radius: 4px;
  background: var(--box-bg-2);
  row-gap: 8px;
}

.tuc-avatars {
  position: relative;
  display: flex;
  width: 100%;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  row-gap: 4px;
}

.tuc-ae-title {
  color: var(--box-text-2);
  font-family: var(--font-title);
}

.tuc-ae-grid {
  position: relative;
  display: grid;
  margin: 0 auto;
  gap: 8px;
  grid-template-columns: repeat(4, 80px);
}

.tuc-enemies {
  position: relative;
  display: flex;
  width: 100%;
  flex-direction: column;
  align-items: center;
  justify-content: flex-start;
  row-gap: 4px;
}

.tuc-ae-flex {
  position: relative;
  display: flex;
  width: 100%;
  height: 100%;
  flex-wrap: wrap-reverse;
  align-items: center;
  justify-content: center;
  gap: 4px 8px;
}

.tuc-enemy {
  position: relative;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 4px 8px 4px 4px;
  border-radius: 40px;
  background: var(--box-bg-3);
  column-gap: 4px;
}

.tuc-enemy-icon {
  position: relative;
  overflow: hidden;
  width: 40px;
  height: 40px;
  border-radius: 50%;
  background: var(--box-bg-4);

  img {
    width: 100%;
    height: 100%;
  }
}

.tuc-enemy-info {
  position: relative;
  display: flex;
  flex-direction: column;
  align-items: flex-start;
  justify-content: center;
  font-size: 12px;

  span {
    line-height: 16px;

    &:first-child {
      font-family: var(--font-title);
    }
  }
}
</style>
