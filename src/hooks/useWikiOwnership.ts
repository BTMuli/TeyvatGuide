/**
 * 图鉴持有状态显示与当前游戏账号的本地持有数据。
 * @since Beta v0.13.1
 */

import showSnackbar from "@comp/func/snackbar.js";
import TGLogger from "@utils/system/TGLogger.js";
import { ref, shallowRef, toValue, watch } from "vue";
import type { MaybeRefOrGetter, Ref, ShallowRef } from "vue";

import TSUserAvatar from "@/plugins/Sqlite/modules/userAvatar.js";
import TSUserBagAvatar from "@/plugins/Sqlite/modules/userBagAvatar.js";
import TSUserBagWeapon from "@/plugins/Sqlite/modules/userBagWeapon.js";

/**
 * 图鉴持有状态的显示开关与载入结果。
 * @since Beta v0.13.1
 */
type WikiOwnershipState = {
  showOwnership: Ref<boolean>;
  ownedIds: ShallowRef<ReadonlySet<number>>;
  loading: Ref<boolean>;
  ready: Ref<boolean>;
};

/**
 * 按当前账号载入角色或武器的持有 ID，关闭显示或切换账号时丢弃过期结果。
 * @since Beta v0.13.1
 * @param mode - 图鉴类型
 * @param gameUid - 当前游戏账号 UID
 * @returns 持有状态显示开关、ID 集合及载入状态
 */
export function useWikiOwnership(
  mode: "character" | "weapon",
  gameUid: MaybeRefOrGetter<string>,
): WikiOwnershipState {
  const showOwnership = ref<boolean>(false);
  const ownedIds = shallowRef<ReadonlySet<number>>(new Set());
  const loading = ref<boolean>(false);
  const ready = ref<boolean>(false);

  watch(
    [() => toValue(gameUid), showOwnership],
    async ([uid, enabled], _previous, onCleanup) => {
      ownedIds.value = new Set();
      loading.value = false;
      ready.value = false;
      if (!enabled) return;
      if (!uid) {
        showSnackbar.warn("请先选择游戏账号");
        return;
      }
      let cancelled = false;
      onCleanup(() => {
        cancelled = true;
      });
      loading.value = true;
      try {
        const userUid = Number(uid);
        const ids = new Set<number>();
        if (mode === "character") {
          const [roles, bagAvatars] = await Promise.all([
            TSUserAvatar.getAvatars(userUid),
            TSUserBagAvatar.getByUid(userUid),
          ]);
          for (const role of roles) ids.add(role.cid);
          for (const avatar of bagAvatars) ids.add(avatar.rid);
        } else {
          const [roles, weapons] = await Promise.all([
            TSUserAvatar.getAvatars(userUid),
            TSUserBagWeapon.getWeapon(userUid),
          ]);
          for (const role of roles) ids.add(role.weapon.id);
          for (const weapon of weapons) ids.add(weapon.id);
        }
        if (!cancelled) {
          ownedIds.value = ids;
          ready.value = true;
        }
      } catch (error) {
        if (cancelled) return;
        showSnackbar.error("读取持有数据失败，请重试");
        await TGLogger.Error(`[useWikiOwnership] 读取持有数据失败：${String(error)}`);
      } finally {
        if (!cancelled) loading.value = false;
      }
    },
    { flush: "sync" },
  );

  return { showOwnership, ownedIds, loading, ready };
}
