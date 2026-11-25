/**
 * 七圣召唤卡牌广场图鉴请求。
 * @since Beta v0.14.1
 */

import TGHttps from "@utils/network/TGHttps.js";

const CardSquareApi: Readonly<string> = "https://api-takumi.mihoyo.com/event/cardsquare";

/** 卡牌广场接口响应外壳。 @since Beta v0.14.1 */
type CardSquareResponse<T> = {
  retcode: number;
  message: string;
  data: T | null;
};

/**
 * 解包卡牌广场响应。
 * @since Beta v0.14.1
 * @param response - 卡牌广场响应
 * @returns 响应数据
 */
function unwrapResponse<T>(response: CardSquareResponse<T> | null): T {
  if (response === null) {
    throw new Error("卡牌广场未返回数据");
  }
  if (response.retcode !== 0) {
    throw new Error(`卡牌广场返回错误 [${response.retcode}] ${response.message}`);
  }
  if (response.data === null) {
    throw new Error("卡牌广场未返回数据");
  }
  return response.data;
}

/**
 * 获取角色牌列表。
 * @since Beta v0.14.1
 * @returns 角色牌列表
 */
async function getRoles(): Promise<Array<TGApp.Game.CardSquare.RoleCard>> {
  const resp = await TGHttps.get<CardSquareResponse<{
    roles: Array<TGApp.Game.CardSquare.RoleCard>;
  }> | null>(`${CardSquareApi}/roles`);
  const data = unwrapResponse(resp.data);
  return data.roles;
}

/**
 * 获取卡牌筛选配置。
 * @since Beta v0.14.1
 * @returns 卡牌筛选配置
 */
async function getFilters(): Promise<TGApp.Game.CardSquare.Filters> {
  const resp = await TGHttps.get<CardSquareResponse<TGApp.Game.CardSquare.Filters> | null>(
    `${CardSquareApi}/common_conf`,
  );
  return unwrapResponse(resp.data);
}

/**
 * 获取行动牌列表。
 * @since Beta v0.14.1
 * @param filters - 行动牌筛选参数
 * @returns 行动牌列表
 */
async function getActions(
  filters: TGApp.Game.CardSquare.ActionFilters,
): Promise<Array<TGApp.Game.CardSquare.ActionCard>> {
  const resp = await TGHttps.post<CardSquareResponse<{
    actions: Array<TGApp.Game.CardSquare.ActionCard>;
  }> | null>(`${CardSquareApi}/actions`, {
    headers: { "Content-Type": "application/json" },
    body: filters,
  });
  const data = unwrapResponse(resp.data);
  return data.actions;
}

/**
 * 获取角色技能列表。
 * @since Beta v0.14.1
 * @param id - 角色牌 ID
 * @returns 角色技能列表
 */
async function getRoleDetail(id: number): Promise<Array<TGApp.Game.CardSquare.RoleSkill>> {
  const resp = await TGHttps.get<CardSquareResponse<{
    skills: Array<TGApp.Game.CardSquare.RoleSkill>;
  }> | null>(`${CardSquareApi}/role/skill`, { query: { id } });
  const data = unwrapResponse(resp.data);
  return data.skills;
}

/**
 * 获取行动牌技能详情。
 * @since Beta v0.14.1
 * @param id - 行动牌 ID
 * @returns 行动牌技能详情
 */
async function getActionDetail(id: number): Promise<TGApp.Game.CardSquare.ActionDetail> {
  const resp = await TGHttps.get<CardSquareResponse<TGApp.Game.CardSquare.ActionDetail> | null>(
    `${CardSquareApi}/action/skill`,
    { query: { id } },
  );
  return unwrapResponse(resp.data);
}

const cardSquareReq = {
  roles: getRoles,
  filters: getFilters,
  actions: getActions,
  roleDetail: getRoleDetail,
  actionDetail: getActionDetail,
};

export default cardSquareReq;
