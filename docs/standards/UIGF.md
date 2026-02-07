---
Author: 目棃
Description: UIGF v4 Backup
Date: 2024-11-11
Update: 2026-02-07
---

> 本文档 [`Frontmatter`](https://github.com/BTMuli/MuCli#Frontmatter) 由 [MuCli](https://github.com/BTMuli/Mucli) 自动生成于 `2024-11-11 11:57:27`
>
> 更新于 `2026-02-07 21:29:27`

> 本文档为 [UIGF v4.2](https://github.com/UIGF-org/UIGF-org.github.io/blob/main/docs/zh/standards/uigf.md) 的备份，仅供参考。

# 统一可交换抽卡记录标准 v4.2
> Uniformed Interchangeable GachaLog Format standard (UIGF) v4.2 <Badge text="Current" type="message" />

::: warning 中断性更新警告
`UIGF v4.0 及更高版本` 对于 `UIGF v3.0 及更低版本` 和 `SRGF v1.0` **不具备向下兼容性**。UIGF/SRGF 合作项目如需适配，需重新认证。
:::

## 更新记录
| 版本     | 说明                          | 兼容         |
|--------|-----------------------------|------------|
| `v3.0` | 低版本的更新日志请查看历史版本             | v3.0 及更低版本 |
| `v4.0` | 合并 SRGF，新增绝区零抽卡格式支持         | v4.0       |
| `v4.1` | 新增对星穹铁道 v3.4 版所引入的新的卡池类型的支持 | v4.1/v4.0* |
| `v4.2` | 新增对于千星奇域的支持                 | v4.1       |

* 对于无需处理星穹铁道的应用，v4.1 与 v4.0 兼容。

## 前言

为了统一不同应用、不同游戏、不同账号间的抽卡记录导入导出行为，我们决定将所有支持的游戏抽卡格式合并入 UIGF 中。不同的游戏、不同的账号将能够以单个文件或字符串的形式进行表示，导入与导出操作对用户而言将变得史无前例的简单。

## 实现与认证

实现 `UIGF v4.0 及更高版本`格式的导入导出并不意味着需要移除对 `UIGF v3.0 及更低版本`或 `SRGF v1.0` 的导入导出支持。但是，不建议对 `UIGF v4.0 和更高版本` 与 `UIGF v3.0 及更低版本`或 `SRGF v1.0` 使用同一套导入导出逻辑。

导出方可以选择性地填充针对每个游戏的字段或直接忽略；导入方可以选择性地读取针对每个游戏的字段或直接忽略。

针对对某一款游戏的支持，必须同时实现数据的导入和导出功能，否则将无法通过认证。

::: info UIGF 标准使用声明
请在应用内提供跳转至 [UIGF-Org](https://uigf.org) 的超链接，声明支持 UIGF 数据格式。

仅包含导入或导出功能降低了用户数据的流通性，且将数据置于用户不可控的风险中，不符合 UIGF-Org 设计的初衷。
:::

## Json Schema

> UIGF-Org 提供下述 Json Schema 以用于验证资料结构的正确性。

::: warning 注意字段类型
开发者务必遵循 Schema 内定义的字段类型。使用错误的类型可能会导致其他由强类型编程语言编写的工具在解析 Json 文件时产生错误，进而导致数据转移失败。

为了避免这类问题，我们建议您针对 UIGF 格式设计专用的数据结构。同时，设计相关的单元测试以确保导入导出的一致性。

我们也提供 [UIGF 格式校验工具](https://schema.uigf.org/?schema=uigf)来帮助你校验 Json 文件。
:::

```json
{
  "$schema": "https://json-schema.org/draft/2020-12/schema",
  "type": "object",
  "properties": {
    "info": {
      "type": "object",
      "properties": {
        "export_timestamp": {
          "oneOf": [
            {
              "type": "string"
            },
            {
              "type": "integer"
            }
          ],
          "description": "导出档案的时间戳，秒级"
        },
        "export_app": {
          "type": "string",
          "description": "导出档案的应用名称"
        },
        "export_app_version": {
          "type": "string",
          "description": "导出档案的应用版本"
        },
        "version": {
          "type": "string",
          "pattern": "^v\\d+\\.\\d+$",
          "description": "导出档案的 UIGF 版本号，格式为 'v{major}.{minor}'，如 v4.0"
        }
      },
      "required": [
        "export_timestamp",
        "export_app",
        "export_app_version",
        "version"
      ]
    },
    "hk4e": {
      "type": "array",
      "items": {
        "type": "object",
        "properties": {
          "uid": {
            "oneOf": [
              {
                "type": "string"
              },
              {
                "type": "integer"
              }
            ],
            "description": "UID"
          },
          "timezone": {
            "type": "integer",
            "description": "时区偏移，由米哈游 API 返回，若与服务器时区不同请注意 list 中 time 的转换"
          },
          "lang": {
            "type": "string",
            "description": "语言代码",
            "enum": [
              "de-de",
              "en-us",
              "es-es",
              "fr-fr",
              "id-id",
              "it-it",
              "ja-jp",
              "ko-kr",
              "pt-pt",
              "ru-ru",
              "th-th",
              "tr-tr",
              "vi-vn",
              "zh-cn",
              "zh-tw"
            ]
          },
          "list": {
            "type": "array",
            "items": {
              "type": "object",
              "properties": {
                "uigf_gacha_type": {
                  "type": "string",
                  "description": "UIGF 卡池类型，用于区分卡池类型不同，但卡池保底计算相同的物品",
                  "enum": [
                    "100",
                    "200",
                    "301",
                    "302",
                    "500"
                  ]
                },
                "gacha_type": {
                  "type": "string",
                  "description": "卡池类型，米哈游 API 返回",
                  "enum": [
                    "100",
                    "200",
                    "301",
                    "302",
                    "400",
                    "500"
                  ]
                },
                "item_id": {
                  "type": "string",
                  "description": "物品的内部 ID"
                },
                "count": {
                  "type": "string",
                  "description": "物品个数，一般为1，米哈游 API 返回"
                },
                "time": {
                  "type": "string",
                  "description": "抽取物品时对应时区（timezone）下的当地时间",
                  "pattern": "^\\d{4}-\\d{2}-\\d{2} \\d{2}:\\d{2}:\\d{2}$"
                },
                "name": {
                  "type": "string",
                  "description": "物品名称，米哈游 API 返回"
                },
                "item_type": {
                  "type": "string",
                  "description": "物品类型，米哈游 API 返回"
                },
                "rank_type": {
                  "type": "string",
                  "description": "物品等级，米哈游 API 返回"
                },
                "id": {
                  "type": "string",
                  "description": "记录内部 ID，米哈游 API 返回",
                  "maxLength": 19,
                  "minLength": 1,
                  "pattern": "^[0-9]+$"
                }
              },
              "required": [
                "uigf_gacha_type",
                "gacha_type",
                "item_id",
                "time",
                "id"
              ]
            }
          }
        },
        "required": [
          "uid",
          "timezone",
          "list"
        ]
      }
    },
    "hkrpg": {
      "type": "array",
      "items": {
        "type": "object",
        "properties": {
          "uid": {
            "oneOf": [
              {
                "type": "string"
              },
              {
                "type": "integer"
              }
            ],
            "description": "UID"
          },
          "timezone": {
            "type": "integer",
            "description": "时区偏移，由米哈游 API 返回，若与服务器时区不同请注意 list 中 time 的转换"
          },
          "lang": {
            "type": "string",
            "description": "语言代码",
            "enum": [
              "de-de",
              "en-us",
              "es-es",
              "fr-fr",
              "id-id",
              "it-it",
              "ja-jp",
              "ko-kr",
              "pt-pt",
              "ru-ru",
              "th-th",
              "tr-tr",
              "vi-vn",
              "zh-cn",
              "zh-tw"
            ]
          },
          "list": {
            "type": "array",
            "items": {
              "type": "object",
              "properties": {
                "gacha_id": {
                  "type": "string",
                  "description": "卡池 ID"
                },
                "gacha_type": {
                  "type": "string",
                  "description": "卡池类型",
                  "enum": [
                    "1",
                    "2",
                    "11",
                    "12",
                    "21",
                    "22"
                  ]
                },
                "item_id": {
                  "type": "string",
                  "description": "物品的内部 ID"
                },
                "count": {
                  "type": "string",
                  "description": "物品个数，一般为1，米哈游 API 返回"
                },
                "time": {
                  "type": "string",
                  "description": "抽取物品时对应时区（timezone）下的当地时间",
                  "pattern": "^\\d{4}-\\d{2}-\\d{2} \\d{2}:\\d{2}:\\d{2}$"
                },
                "name": {
                  "type": "string",
                  "description": "物品名称，米哈游 API 返回"
                },
                "item_type": {
                  "type": "string",
                  "description": "物品类型，米哈游 API 返回"
                },
                "rank_type": {
                  "type": "string",
                  "description": "物品等级，米哈游 API 返回"
                },
                "id": {
                  "type": "string",
                  "description": "记录内部 ID，米哈游 API 返回",
                  "maxLength": 19,
                  "minLength": 1,
                  "pattern": "^[0-9]+$"
                }
              },
              "required": [
                "gacha_type",
                "gacha_id",
                "time",
                "item_id",
                "id"
              ]
            }
          }
        },
        "required": [
          "uid",
          "timezone",
          "list"
        ]
      }
    },
    "nap": {
      "type": "array",
      "items": {
        "type": "object",
        "properties": {
          "uid": {
            "oneOf": [
              {
                "type": "string"
              },
              {
                "type": "integer"
              }
            ],
            "description": "UID"
          },
          "timezone": {
            "type": "integer",
            "description": "时区偏移，由米哈游 API 返回，若与服务器时区不同请注意 list 中 time 的转换"
          },
          "lang": {
            "type": "string",
            "description": "语言代码",
            "enum": [
              "de-de",
              "en-us",
              "es-es",
              "fr-fr",
              "id-id",
              "it-it",
              "ja-jp",
              "ko-kr",
              "pt-pt",
              "ru-ru",
              "th-th",
              "tr-tr",
              "vi-vn",
              "zh-cn",
              "zh-tw"
            ]
          },
          "list": {
            "type": "array",
            "items": {
              "type": "object",
              "properties": {
                "gacha_id": {
                  "type": "string",
                  "description": "卡池 ID"
                },
                "gacha_type": {
                  "type": "string",
                  "description": "卡池类型",
                  "enum": [
                    "1",
                    "2",
                    "3",
                    "5"
                  ]
                },
                "item_id": {
                  "type": "string",
                  "description": "物品的内部 ID"
                },
                "count": {
                  "type": "string",
                  "description": "物品个数，一般为1，米哈游 API 返回"
                },
                "time": {
                  "type": "string",
                  "description": "抽取物品时对应时区（timezone）下的当地时间",
                  "pattern": "^\\d{4}-\\d{2}-\\d{2} \\d{2}:\\d{2}:\\d{2}$"
                },
                "name": {
                  "type": "string",
                  "description": "物品名称，米哈游 API 返回"
                },
                "item_type": {
                  "type": "string",
                  "description": "物品类型，米哈游 API 返回"
                },
                "rank_type": {
                  "type": "string",
                  "description": "物品等级，米哈游 API 返回"
                },
                "id": {
                  "type": "string",
                  "description": "记录内部 ID，米哈游 API 返回",
                  "maxLength": 19,
                  "minLength": 1,
                  "pattern": "^[0-9]+$"
                }
              },
              "required": [
                "gacha_type",
                "item_id",
                "time",
                "id"
              ]
            }
          }
        },
        "required": [
          "uid",
          "timezone",
          "list"
        ]
      }
    },
    "hk4e_ugc": {
      "type": "array",
      "properties": {
        "uid": {
          "oneOf": [
            {
              "type": "string"
            },
            {
              "type": "integer"
            }
          ],
          "description": "UID"
        },
        "timezone": {
          "type": "integer",
          "description": "时区偏移，由米哈游 API 返回，若与服务器时区不同请注意 list 中 time 的转换"
        },
        "lang": {
          "type": "string",
          "description": "语言代码",
          "enum": [
            "de-de",
            "en-us",
            "es-es",
            "fr-fr",
            "id-id",
            "it-it",
            "ja-jp",
            "ko-kr",
            "pt-pt",
            "ru-ru",
            "th-th",
            "tr-tr",
            "vi-vn",
            "zh-cn",
            "zh-tw"
          ]
        },
        "list": {
          "type": "array",
          "items": {
            "type": "object",
            "properties": {
              "id": {
                "type": "string",
                "description": "记录内部 ID，米哈游 API 返回",
                "maxLength": 19,
                "minLength": 1,
                "pattern": "^[0-9]+$"
              },
              "schedule_id": {
                "type": "string",
                "description": "卡池排期 ID，米哈游 API 返回",
                "minLength": 1,
                "pattern": "^[0-9]+$"
              },
              "item_type": {
                "type": "string",
                "description": "物品类型，米哈游 API 返回"
              },
              "item_id": {
                "type": "string",
                "description": "物品 ID，米哈游 API 返回",
                "minLength": 1,
                "pattern": "^[0-9]+$"
              },
              "item_name": {
                "type": "string",
                "description": "物品名称，米哈游 API 返回"
              },
              "rank_type": {
                "type": "string",
                "description": "物品等级，米哈游 API 返回",
                "minLength": 1,
                "pattern": "^[0-9]+$"
              },
              "time": {
                "type": "string",
                "description": "抽取物品时对应时区（timezone）下的当地时间",
                "pattern": "^\\d{4}-\\d{2}-\\d{2} \\d{2}:\\d{2}:\\d{2}$"
              },
              "op_gacha_type": {
                "type": "string",
                "description": "卡池类型，米哈游 API 返回",
                "enum": [
                  "1000",
                  "2000",
                  "20011",
                  "20012",
                  "20021",
                  "20022"
                ]
              }
            },
            "required": ["id","schedule_id","item_type","item_id","item_name","rank_type","time","op_gacha_type"]
          }
        }
      },
      "required": ["uid", "timezone", "list"]
    }
  },
  "required": [
    "info"
  ]
}
```