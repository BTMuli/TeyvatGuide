/**
 * @file interface Base
 * @description interface Base
 * @author BTMuli<bt-muli@outlook.com>
 * @since Alpha
 */

/**
 * @description 定义一个 Map<T> 接口
 * @since Alpha
 * @description 该接口的方法实现在 TGMap<T> 中
 * @see TGMap
 * @interface Map
 * @template T
 * @return Map
 */
export interface Map<T> {
	[key: number]: T;
}
