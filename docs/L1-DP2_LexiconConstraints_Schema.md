好的，遵照指示。

我将根据《项目代办事项列表 (V1.3)》的指引，执行下一个待办事项。当前列表中的第一项待办任务是隶属于 `L1-DP2: 项目词汇服务` 的：

*   `[ ]` **撰写《项目词汇与约束文件 Schema 规范》**

此文档旨在为确保项目范围内知识的高度确定性和一致性提供基础。我将依据《软件用户需求文档 (URD) V1.6》中第 5.2 节和 5.3 节的规定，设计一个机器可读的、结构化的 Schema，用于定义“项目词汇与约束”文件的内容。

以下是为该任务撰写的完整设计文档。

---

### **项目词汇与约束文件 Schema 规范 (V1.0)**

**状态:** 草稿 (Draft)

**版本说明:** 本文档 (V1.0) 是此规范的初版。其目标是为 `L1-DP2: 项目词汇服务` 所管理的核心数据文件——“项目词汇与约束文件”，提供一个明确、健壮且机器可读的结构化定义。

#### **1. 引言**

本文档使用 JSON Schema 格式，详细定义了“项目词汇与约束”文件的数据结构。该文件是项目的“知识范式 (Canon)”，是确保整个项目范围内术语、命名和格式高度一致性的基础。根据 URD 5.3 的规定，此文件中的定义拥有最高知识优先级，将覆盖所有其他知识源（如外部知识库）的冲突信息。

`L1-DP2: 项目词汇服务` 负责加载、解析、验证并提供对此文件内容的查询服务。所有需要确保一致性的组件（如 `L1-DP5` 内容生成引擎, `L1-DP6` 评审与评估引擎）都将通过 `L1-DP2` 的 API 来访问这些规则。

本文档定义的是该文件的 canonical (标准) JSON 结构。系统可以提供工具，用于将用户更易于维护的 Markdown 格式版本转换为此标准的 JSON 格式。

**设计依据:**
*   《软件用户需求文档 (URD) V1.6》§5.2, §5.3
*   《公理设计辅助系统 L1 公理设计文档 (V1.1)》

#### **2. JSON Schema 定义**

以下是“项目词汇与约束”文件 (推荐使用 `.lexicon.json` 作为文件扩展名) 的完整 JSON Schema 定义。

```json
{
  "$schema": "http://json-schema.org/draft-07/schema#",
  "title": "Project Lexicon and Constraints File Schema",
  "description": "Defines the structure for a project's canonical lexicon, including glossary, acronyms, naming conventions, and formatting constraints. This file serves as the single source of truth for project-specific terminology and rules, as per URD 5.2.",
  "type": "object",
  "required": [
    "schemaVersion",
    "lexicon"
  ],
  "properties": {
    "schemaVersion": {
      "description": "The version of this schema. Ensures compatibility and proper parsing.",
      "type": "string",
      "const": "1.0"
    },
    "lexicon": {
      "description": "The container for all lexicon and constraint definitions.",
      "type": "object",
      "properties": {
        "glossary": {
          "description": "A list of core project terms and their official definitions. Terms must be unique.",
          "type": "array",
          "items": {
            "type": "object",
            "properties": {
              "term": {
                "description": "The specific word or phrase being defined (e.g., 'Design Matrix').",
                "type": "string"
              },
              "definition": {
                "description": "The unambiguous, official definition of the term.",
                "type": "string"
              },
              "aliases": {
                "description": "An optional list of synonyms or alternative phrases for the term.",
                "type": "array",
                "items": { "type": "string" }
              }
            },
            "required": ["term", "definition"]
          }
        },
        "acronyms": {
          "description": "A list of all official project acronyms and their expansions. Acronyms must be unique.",
          "type": "array",
          "items": {
            "type": "object",
            "properties": {
              "acronym": {
                "description": "The abbreviated form (e.g., 'URD').",
                "type": "string"
              },
              "expansion": {
                "description": "The fully expanded phrase (e.g., 'User Requirements Document').",
                "type": "string"
              }
            },
            "required": ["acronym", "expansion"]
          }
        },
        "namingConventions": {
          "description": "A set of enforceable naming rules for various project artifacts.",
          "type": "array",
          "items": {
            "type": "object",
            "properties": {
              "target": {
                "description": "A human-readable description of the artifact the rule applies to (e.g., 'Interface Document', 'API Endpoint').",
                "type": "string"
              },
              "pattern": {
                "description": "A regular expression (regex) that valid names for the target artifact must match.",
                "type": "string",
                "format": "regex"
              },
              "description": {
                "description": "A user-friendly explanation of the naming rule.",
                "type": "string"
              }
            },
            "required": ["target", "pattern", "description"]
          }
        },
        "formattingConstraints": {
          "description": "A set of enforceable formatting rules for specific data types within documents.",
          "type": "array",
          "items": {
            "type": "object",
            "properties": {
              "dataType": {
                "description": "A human-readable description of the data type (e.g., 'Date', 'Version String').",
                "type": "string"
              },
              "pattern": {
                "description": "A regular expression (regex) that valid data of this type must match.",
                "type": "string",
                "format": "regex"
              },
              "description": {
                "description": "A user-friendly explanation of the format.",
                "type": "string"
              }
            },
            "required": ["dataType", "pattern", "description"]
          }
        }
      },
      "additionalProperties": false
    }
  }
}
```

#### **3. 关键字段说明**

*   **`schemaVersion` (string, 必需):** Schema 版本号。本文档定义的版本为 "1.0"。
*   **`lexicon` (object, 必需):** 包含所有定义的核心对象。
    *   **`glossary` (array):** 术语表。定义项目中的核心术语，以消除歧义。
        *   `term`: 术语本身，在数组内应唯一。
        *   `definition`: 官方定义。
        *   `aliases`: (可选) 别名或同义词列表。
    *   **`acronyms` (array):** 缩写词表。定义项目中使用的所有缩写。
        *   `acronym`: 缩写词，在数组内应唯一。
        *   `expansion`: 完整的展开形式。
    *   **`namingConventions` (array):** 命名约定。用于强制执行文档、组件、接口等的命名规则。
        *   `target`: 规则应用的对象描述。
        *   `pattern`: 用于验证名称的**正则表达式**。
        *   `description`: 对规则的人类可读描述。
    *   **`formattingConstraints` (array):** 格式化约束。用于强制执行特定数据（如日期、版本号）的格式。
        *   `dataType`: 数据类型描述。
        *   `pattern`: 用于验证格式的**正则表达式**。
        *   `description`: 对格式的人类可读描述。

#### **4. 示例 (`example.lexicon.json`)**

以下是一个符合 V1.0 Schema 规范的完整“项目词汇与约束”文件示例。

```json
{
  "schemaVersion": "1.0",
  "lexicon": {
    "glossary": [
      {
        "term": "Design Matrix",
        "definition": "A matrix that maps Functional Requirements (FRs) to Design Parameters (DPs) to visualize and analyze the relationships between them.",
        "aliases": [
          "FR-DP Matrix"
        ]
      },
      {
        "term": "Frozen Document",
        "definition": "A document that has been approved by both the Reviewer and the User, and is now locked as a baseline for subsequent work. Changes require a formal Change Management process."
      }
    ],
    "acronyms": [
      {
        "acronym": "URD",
        "expansion": "User Requirements Document"
      },
      {
        "acronym": "DP",
        "expansion": "Design Parameter"
      },
      {
        "acronym": "FR",
        "expansion": "Functional Requirement"
      }
    ],
    "namingConventions": [
      {
        "target": "Interface Specification Document",
        "pattern": "^IF_([A-Z0-9]+_)*[A-Z0-9]+\\.md$",
        "description": "Interface specification documents must start with 'IF_' and end with '.md'. Example: 'IF_L1_DP2_API_Spec.md'"
      },
      {
        "target": "L2 Design Document",
        "pattern": "^AD_L2_[A-Za-z0-9_]+\\.md$",
        "description": "Level 2 Axiomatic Design documents must start with 'AD_L2_'. Example: 'AD_L2_Content_Engine.md'"
      }
    ],
    "formattingConstraints": [
      {
        "dataType": "Date",
        "pattern": "^\\\\d{4}-\\\\d{2}-\\\\d{2}$",
        "description": "All dates must be in YYYY-MM-DD format."
      },
      {
        "dataType": "Semantic Version",
        "pattern": "^(0|[1-9]\\\\d*)\\\\. (0|[1-9]\\\\d*)\\\\. (0|[1-9]\\\\d*)$",
        "description": "Version numbers must follow semantic versioning (e.g., 1.2.0)."
      }
    ]
  }
}
```

---
Gemini 2.5 Pro 0605 writer