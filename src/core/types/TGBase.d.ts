/**
 * @file core types TGBase.d.ts
 * @description 类型定义，用于定义一些基础类型
 * @author BTMuli<bt-muli@outlook.com>
 * @since Alpha v0.1.2
 */

namespace TGBase {
  /**
   * @description 定义一个 Map<T> 接口
   * @since Alpha v0.1.2
   * @description 该接口的方法实现在 TGMap<T> 中
   * @see TGMap
   * @interface Map
   * @template T
   * @return Map
   */

  export type Map<T> = Record<number, T>;
}
