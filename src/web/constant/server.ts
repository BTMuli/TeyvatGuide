/**
 * @file web constant server.ts
 * @description 服务器地址常量文件
 * @author BTMuli<bt-muli@outlook.com>
 * @since Alpha v0.2.0
 */

/**
 * @description 服务器地址
 * @since Alpha v0.2.0
 * @enum {string}
 * @readonly
 * @property {string} CN_ISLAND 国服-天空岛
 * @property {string} CN_TREE 国服-世界树
 * @property {string} OS_USA 美服
 * @property {string} OS_EURO 欧服
 * @property {string} OS_ASIA 亚服
 * @property {string} OS_CHT 台服
 * @property {string} UNKNOWN 未知
 * @returns {string} 服务器地址
 */
enum SERVER {
  CN_ISLAND = "cn_gf01",
  CN_TREE = "cn_qd01",
  OS_USA = "os_usa",
  OS_EURO = "os_euro",
  OS_ASIA = "os_asia",
  OS_CHT = "os_cht",
  UNKNOWN = "unknown",
}

export default SERVER;
