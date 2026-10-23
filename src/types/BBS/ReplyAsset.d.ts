/**
 * 回复资源请求类型定义
 * @since Beta v0.13.0
 */

declare namespace TGApp.BBS.ReplyAsset {
  /**
   * 昵称解析接口响应
   * @since Beta v0.13.0
   */
  type MentionResp = Omit<TGApp.BBS.Response.Base, "data"> & {
    /** 昵称解析数据；接口失败时为 null */
    data: MentionRes | null;
  };

  /**
   * 昵称解析接口数据
   * @since Beta v0.13.0
   */
  type MentionRes = {
    /** 昵称与 UID 映射，兼容字符串 UID */
    nickname_uid_info: Record<string, number | string>;
  };

  /**
   * 图片上传签名接口响应
   * @since Beta v0.13.0
   */
  type UploadParamsResp = {
    /** 响应代码，0 表示成功 */
    retcode: number;
    /** 上传参数；接口失败时为 null */
    data: UploadParamsRes | null;
  };

  /**
   * 图片上传签名数据中已接入的 OSS 分支
   * @since Beta v0.13.0
   */
  type UploadParamsRes = {
    /** 上传方式 */
    type: "oss";
    /** OSS 原始签名参数 */
    oss: OssConfig;
  };

  /**
   * 签名接口返回的 OSS 参数
   * @since Beta v0.13.0
   */
  type OssConfig = {
    /** OSS 上传地址 */
    host: string;
    /** 文件名称 */
    name: string;
    /** 对象目录 */
    dir: string;
    /** Base64 回调参数 */
    callback: string;
    /** 自定义回调字段 */
    callback_var?: Record<string, string>;
    /** 额外表单字段，保留顺序和重复键 */
    extra_form_data?: Array<FormField>;
    /** OSS 访问密钥 ID */
    accessid: string;
    /** Base64 上传策略 */
    policy: string;
    /** 上传签名 */
    signature: string;
    /** 上传 MIME 类型 */
    x_oss_content_type: string;
    /** 对象访问权限 */
    object_acl?: string;
    /** 内容处置参数，可为空字符串 */
    content_disposition?: string;
  };

  /**
   * OSS 上传回调响应的消费字段
   * @since Beta v0.13.0
   */
  type UploadResp = {
    /** 响应代码，0 表示成功 */
    retcode: number;
    /** 上传结果；接口失败时为 null */
    data: UploadRes | null;
  };

  /**
   * OSS 上传结果
   * @since Beta v0.13.0
   */
  type UploadRes = {
    /** 已上传图片的 URL */
    url: string;
    /** 上传对象键，返回时须与签名对象键一致 */
    object?: string;
  };

  /**
   * OSS 自定义表单字段
   * @since Beta v0.13.0
   */
  type FormField = {
    /** 字段名称 */
    key: string;
    /** 字段内容 */
    value: string;
  };

  /**
   * 回复中提及的用户
   * @since Beta v0.13.0
   */
  type Mention = {
    /** 用户 UID */
    uid: number;
    /** 用户昵称 */
    nickname: string;
  };

  /**
   * 已上传的回复图片
   * @since Beta v0.13.0
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
   * @since Beta v0.13.0
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
