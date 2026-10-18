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

  /**
   * 已校验的本地回复图片
   * @since Beta v0.12.6
   */
  type PreparedImage = {
    /** 原始文件字节，用于计算摘要 */
    bytes: ArrayBuffer;
    /** 原始文件的 MD5 */
    md5: string;
    /** 规范化的图片扩展名 */
    ext: "png" | "jpg" | "gif" | "webp";
    /** 图片 MIME 类型 */
    contentType: "image/png" | "image/jpeg" | "image/gif" | "image/webp";
    /** 原始文件大小，单位字节 */
    size: number;
    /** 图片宽度 */
    width: number;
    /** 图片高度 */
    height: number;
  };
}
