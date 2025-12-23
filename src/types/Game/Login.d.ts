/**
 * 登录相关定义文件
 * @since Beta v0.7.0
 */

declare namespace TGApp.Game.Login {
  /**
   * 获取登录二维码返回数据响应
   * @since Beta v0.7.0
   */
  type QrResp = TGApp.BBS.Response.BaseWithData & { data: QrRes };

  /**
   * 获取登录二维码返回数据
   * @since Beta v0.7.0
   */
  type QrRes = {
    /** 二维码 URL */
    url: string;
  };

  /**
   * 获取登录状态返回响应
   * @since Beta v0.7.0
   */
  type StatResp = TGApp.BBS.Response.BaseWithData & { data: StatRes };

  /**
   * 登录二维码状态
   * @since Beta v0.9.1
   */
  const QrStat = <const>{
    INIT: "Init",
    SCANNED: "Scanned",
    CONFIRMED: "Confirmed",
  };

  /**
   * 登录二维码状态枚举
   * @since Beta v0.9.1
   */
  type QrStatEnum = (typeof QrStat)[keyof typeof QrStat];

  /**
   * 获取登录状态返回数据
   * @since Beta v0.7.0
   */
  type StatRes = {
    /** 二维码状态 */
    stat: QrStatEnum;
    /** 状态数据 */
    payload: StatPayloadFull;
  };

  /**
   * 登录状态Payload
   * @since Beta v0.7.0
   */
  type StatPayloadFull = {
    /** 未知数据 */
    ext: string;
    /** 未知数据 */
    proto: string;
    /**
     * 元数据
     * @remarks 序列化，反序列化后是 {@link StatPayloadRaw}
     */
    raw: string;
  };

  /**
   * 反序列化后的登录状态数据
   * @since Beta v0.7.0
   */
  type StatPayloadRaw = {
    /** 用户 UID */
    uid: string;
    /** 用户 Token */
    token: string;
  };

  /**
   * GameToken获取SToken返回响应
   * @since Beta v0.7.2
   */
  type StResp = TGApp.BBS.Response.BaseWithData<StRes>;

  /**
   * GameToken获取SToken返回数据
   * @since Beta v0.7.2
   */
  type StRes = {
    /** Token */
    token: TGApp.BBS.GameLogin.GetLoginStatusDataToken;
    /** 用户信息 */
    user_info: TGApp.BBS.GameLogin.GetLoginStatusDataUserInfo;
    /** 实名信息 */
    realname_info: unknown;
    /** 是否需要实名 */
    need_realperson: boolean;
  };
}
