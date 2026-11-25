/**
 * 七圣召唤卡牌广场请求回归测试。
 * @since Beta v0.14.1
 */

import cardSquareReq from "@req/cardSquareReq.js";
import { beforeEach, describe, expect, it, vi } from "vitest";

const { get, post } = vi.hoisted(() => ({
  get: vi.fn(),
  post: vi.fn(),
}));

vi.mock("@utils/network/TGHttps.js", () => ({ default: { get, post } }));

const baseUrl = "https://api-takumi.mihoyo.com/event/cardsquare";
const basic = {
  item_id: 1101,
  name: "示例角色",
  icon: "https://example.com/role.png",
  icon_small: "https://example.com/role-small.png",
  wiki_url: "https://example.com/role",
  max_cnt: 1,
};

beforeEach(() => {
  get.mockReset();
  post.mockReset();
});

describe("卡牌广场请求", () => {
  it("提取角色牌和筛选配置数据", async () => {
    const role = { basic, element: 1, hp: 10, skill_cost: 3 };
    const filters = {
      role_element: [{ id: 1, name: "火" }],
      action_type: [{ id: 1, name: "装备" }],
      action_tag: [{ id: 1, name: "天赋" }],
      action_cost: [{ id: 1, name: "0" }],
    };
    get
      .mockResolvedValueOnce({ data: { retcode: 0, message: "OK", data: { roles: [role] } } })
      .mockResolvedValueOnce({ data: { retcode: 0, message: "OK", data: filters } });

    await expect(cardSquareReq.roles()).resolves.toEqual([role]);
    await expect(cardSquareReq.filters()).resolves.toEqual(filters);
    expect(get).toHaveBeenNthCalledWith(1, `${baseUrl}/roles`);
    expect(get).toHaveBeenNthCalledWith(2, `${baseUrl}/common_conf`);
  });

  it("保留角色、类型、标签和费用筛选参数", async () => {
    const filters: TGApp.Game.CardSquare.ActionFilters = {
      role_ids: [1101, 1102, 1103],
      type_id: 2,
      tag_id: 4,
      cost_id: 5,
    };
    const actions = {
      basic,
      card_type: 1,
      card_tag: ["天赋"],
      skill_element: "",
      skill_value: 0,
      skill_element2: "",
      skill_value2: 0,
      energy_cost: 0,
    };
    post.mockResolvedValueOnce({
      data: { retcode: 0, message: "OK", data: { actions: [actions] } },
    });

    await expect(cardSquareReq.actions(filters)).resolves.toEqual([actions]);
    expect(post).toHaveBeenCalledWith(`${baseUrl}/actions`, {
      headers: { "Content-Type": "application/json" },
      body: filters,
    });
  });

  it("提取角色技能和行动牌详情并传递 ID", async () => {
    const skills = [
      {
        id: "110101",
        icon: "https://example.com/skill.png",
        name: "普通攻击",
        type: ["normal_attack"],
        rich_desc: "造成伤害。",
      },
    ];
    const detail = {
      cost1_raw: 1,
      cost1_type_raw: "same",
      cost1_type_icon: "https://example.com/cost1.png",
      cost2_raw: 0,
      cost2_type_raw: "",
      cost2_type_icon: "",
      desc: "获得效果。",
      has_good_id: false,
      access: "活动获取",
    };
    get
      .mockResolvedValueOnce({ data: { retcode: 0, message: "OK", data: { skills } } })
      .mockResolvedValueOnce({ data: { retcode: 0, message: "OK", data: detail } });

    await expect(cardSquareReq.roleDetail(1101)).resolves.toEqual(skills);
    await expect(cardSquareReq.actionDetail(311101)).resolves.toEqual(detail);
    expect(get).toHaveBeenNthCalledWith(1, `${baseUrl}/role/skill`, { query: { id: 1101 } });
    expect(get).toHaveBeenNthCalledWith(2, `${baseUrl}/action/skill`, { query: { id: 311101 } });
  });

  it("将业务错误和空响应转换为友好错误", async () => {
    get
      .mockResolvedValueOnce({ data: { retcode: 1001, message: "请求过于频繁", data: null } })
      .mockResolvedValueOnce({ data: { retcode: 0, message: "OK", data: null } })
      .mockResolvedValueOnce({ data: null });

    await expect(cardSquareReq.roles()).rejects.toThrow("[1001] 请求过于频繁");
    await expect(cardSquareReq.filters()).rejects.toThrow("卡牌广场未返回数据");
    await expect(cardSquareReq.roles()).rejects.toThrow("卡牌广场未返回数据");
  });
});
