/**
 * 应用枚举类
 * @since Beta v0.12.1
 */

/**
 * 请求方法类型枚举
 * @since Beta v0.10.0
 * @see TGApp.App.Response.ReqMethodEnum
 */
const ReqMethodEnum: typeof TGApp.App.Response.ReqMethod = {
  GET: "GET",
  POST: "POST",
};

/**
 * 成就分步项类型枚举
 * @since Beta v0.12.1
 * @see TGApp.App.Achievement.PartialTypeEnum
 */
const AchievementPartialTypeEnum: typeof TGApp.App.Achievement.PartialType = {
  Achievement: "achievement",
  Quest: "quest",
  SubQuest: "subquest",
  Task: "task",
  SubTask: "subtask",
};

const appEnum = {
  req: ReqMethodEnum,
  achiPartial: AchievementPartialTypeEnum,
};

export default appEnum;
