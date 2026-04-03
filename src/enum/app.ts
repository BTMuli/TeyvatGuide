/**
 * 应用枚举类
 * @since Beta v0.10.0
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

const appEnum = {
  req: ReqMethodEnum,
};

export default appEnum;
