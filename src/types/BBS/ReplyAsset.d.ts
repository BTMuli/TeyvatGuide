/**
 * 回复资源请求类型定义
 * @since Beta v0.12.6
 */

declare namespace TGApp.BBS.ReplyAsset {
  /**
   * 回复中提及的用户
   * @since Beta v0.12.6
   */
  type Mention = {
    /** 用户 UID */
    uid: number;
    /** 用户昵称 */
    nickname: string;
  };

  /**
   * 已上传的回复图片
   * @since Beta v0.12.6
   */
  type UploadedImage = {
    /** 图片 URL */
    url: string;
    /** 图片宽度 */
    width: number;
    /** 图片高度 */
    height: number;
  };
}
