/**
 * Hutao 插件入口
 * @since Beta v0.10.1
 */

import AbyssReq from "./request/abyssReq.js";
import AccountReq from "./request/accountReq.js";
import CombatReq from "./request/combatReq.js";
import GachaReq from "./request/gachaReq.js";
import HutaoValid from "./utils/RawValidator.js";

const _ = "Not Implemented";

const Hutao = {
  Abyss: AbyssReq,
  Combat: CombatReq,
  Account: AccountReq,
  Token: {
    refresh: AccountReq.refresh,
    revoke: _,
    revokeAll: _,
  },
  Gacha: GachaReq,
  valid: HutaoValid,
};

export default Hutao;
