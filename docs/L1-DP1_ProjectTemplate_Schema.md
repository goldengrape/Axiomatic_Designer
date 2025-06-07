好的，遵照指示。

根据《项目代办事项列表 (V1.1)》中的待办事项顺序，下一个任务是：

*   **L1-DP1: 项目模板管理器**
    *   `[ ]` **撰写《项目模板 Schema 规范》**
        *   **说明:** 以 JSON Schema 或类似格式，定义项目模板文件（`.json` 或 `.yaml`）的结构，包括所有必选和可选字段及其数据类型。

我将依据《软件用户需求文档 (URD) V1.6》中第 3.3 节和第 6.4 节的相关规定，撰写此规范。

---

### **项目模板 Schema 规范 (V1.0)**

**状态:** 草稿 (Draft)

**版本说明:** 本文档 (V1.0) 是对此项目模板结构的首次正式定义。其目的是为项目模板文件提供一个明确、一致且机器可读的结构规范，确保系统能够正确解析和应用模板配置。本规范直接响应《项目代办事项列表 (V1.1)》中的任务项。

#### **1. 引言**

本文档使用 JSON Schema 格式，详细定义了“项目模板”文件（推荐使用 `.project.json` 作为文件扩展名）的数据结构。项目模板允许用户预设项目的核心参数，从而确保项目在创建时具有一致的基线配置。

所有与本项目模板管理器 (`L1-DP1`) 交互的组件，都应遵循此 Schema 来读取或生成模板文件。

设计依据包括：
*   《软件用户需求文档 (URD) V1.6》第 3.3 节：对项目模板内容的高层描述。
*   《软件用户需求文档 (URD) V1.6》第 6.4 节：对信息公理量化评估指标的详细要求。
*   《公理设计辅助系统 L1 公理设计文档 (V1.1)》中对 `L1-DP1` 的职责定义。

#### **2. JSON Schema 定义**

以下是项目模板文件的完整 JSON Schema 定义。

```json
{
  "$schema": "http://json-schema.org/draft-07/schema#",
  "title": "Axiomatic Design Assistant Project Template",
  "description": "Defines the structure for a project template, including process settings, LLM role configurations, and evaluation metrics.",
  "type": "object",
  "required": [
    "templateSchemaVersion",
    "projectName",
    "processSettings",
    "llmRoles",
    "documentSettings",
    "informationAxiom"
  ],
  "properties": {
    "templateSchemaVersion": {
      "description": "The version of this template schema itself.",
      "type": "string",
      "const": "1.0"
    },
    "projectName": {
      "description": "A user-friendly name for the project this template configures.",
      "type": "string",
      "minLength": 1
    },
    "processSettings": {
      "description": "Settings related to the automated review and arbitration process. (URD 2.3, 4.3)",
      "type": "object",
      "properties": {
        "maxReviewCycles": {
          "description": "The maximum number of review-revision cycles before forcing user arbitration. (URD 2.3)",
          "type": "integer",
          "default": 5,
          "minimum": 1
        },
        "maxArbitrationResets": {
          "description": "The maximum number of times a user can reset the review cycle during an arbitration. (URD 4.3.d)",
          "type": "integer",
          "default": 2,
          "minimum": 0
        }
      },
      "required": ["maxReviewCycles", "maxArbitrationResets"]
    },
    "llmRoles": {
      "description": "Configuration for the LLM-based roles. (URD 3.3, 4.1)",
      "type": "object",
      "properties": {
        "writer": {
          "type": "object",
          "properties": {
            "modelId": { "type": "string", "description": "Identifier for the LLM model to be used for the Writer role." },
            "behavioralStyle": { "type": "string", "description": "A detailed prompt describing the desired writing style and personality." }
          },
          "required": ["modelId", "behavioralStyle"]
        },
        "reviewer": {
          "type": "object",
          "properties": {
            "modelId": { "type": "string", "description": "Identifier for the LLM model to be used for the Reviewer role." },
            "behavioralStyle": { "type": "string", "description": "A detailed prompt describing the desired reviewing style and critical perspective." }
          },
          "required": ["modelId", "behavioralStyle"]
        }
      },
      "required": ["writer", "reviewer"]
    },
    "documentSettings": {
      "description": "Settings related to document structure and review standards. (URD 3.3, 4.2)",
      "type": "object",
      "properties": {
        "reviewChecklist": {
          "description": "A list of standard checks for the Reviewer to perform. Can include machine-parseable instructions. (URD 4.2)",
          "type": "array",
          "items": {
            "type": "string"
          }
        }
      },
      "required": ["reviewChecklist"]
    },
    "informationAxiom": {
      "description": "Defines quantitative metrics and decision strategy for applying the Information Axiom. (URD 6.4)",
      "type": "object",
      "properties": {
        "metrics": {
          "description": "A list of metrics used to evaluate design alternatives.",
          "type": "array",
          "items": {
            "type": "object",
            "properties": {
              "metricId": { "type": "string", "description": "A unique, machine-friendly identifier for the metric (e.g., 'interfaceComplexity')." },
              "name": { "type": "string", "description": "A human-readable name for the metric (e.g., '接口复杂度')." },
              "computableDefinition": { "type": "string", "description": "The precise, computable definition of the metric as required by URD 6.4." },
              "priority": { "type": "integer", "description": "The decision-making priority (lower number means higher priority). Used when strategy is 'priority'." }
            },
            "required": ["metricId", "name", "computableDefinition", "priority"]
          }
        },
        "decisionStrategy": {
          "description": "The strategy to use when comparing designs based on the metrics.",
          "type": "string",
          "enum": ["priority"],
          "default": "priority"
        }
      },
      "required": ["metrics", "decisionStrategy"]
    }
  }
}
```

#### **3. 关键字段说明**

*   **`templateSchemaVersion` (string, 必需):** 模式版本。用于确保模板文件的兼容性。本文档定义的版本为 "1.0"。
*   **`projectName` (string, 必需):** 项目名称。用于在用户界面中识别模板。
*   **`processSettings` (object, 必需):** 流程控制相关的配置。
    *   `maxReviewCycles` (integer): 定义了在强制进入“用户仲裁”前，系统自动执行“审查-修订”循环的最大次数。源自 URD 2.3。
    *   `maxArbitrationResets` (integer): 定义了在单次用户仲裁中，用户可以重置审查循环的最大次数。源自 URD 4.3.d。
*   **`llmRoles` (object, 必需):** 定义了核心LLM角色的配置。
    *   `writer`/`reviewer`: 分别为“撰写员”和“审查员”定义其所使用的 `modelId` (模型标识) 和 `behavioralStyle` (行为风格 Prompt)。源自 URD 3.3 和 4.1。
*   **`documentSettings` (object, 必需):** 定义了文档级的标准。
    *   `reviewChecklist` (array of strings): “审查员”在审查时必须遵循的审查清单。清单中的项目可以是简单的文本，也可以是包含可解析指令的字符串，如 `[TraceabilityCheck: FR-2.1 in Axiomatic_Design_L1.md]`。源自 URD 4.2。
*   **`informationAxiom` (object, 必需):** 定义了应用信息公理的框架，这是本系统的一个关键特性。
    *   `metrics` (array of objects): 一个对象数组，每个对象定义一个量化评估指标。
        *   `metricId`: 机器可读的唯一ID。
        *   `name`: 人类可读的名称。
        *   `computableDefinition`: **核心字段**，严格遵循 URD 6.4 的要求，提供了该指标可被程序计算的明确定义。
        *   `priority`: 定义了当多个指标冲突时，进行决策的优先级顺序（数字越小，优先级越高）。
    *   `decisionStrategy`: 决策策略。目前仅支持 `"priority"`（基于优先级）。

#### **4. 示例 (`example.project.json`)**

以下是一个符合本 Schema 规范的完整项目模板文件示例。

```json
{
  "templateSchemaVersion": "1.0",
  "projectName": "Default Engineering Design Template",
  "processSettings": {
    "maxReviewCycles": 5,
    "maxArbitrationResets": 2
  },
  "llmRoles": {
    "writer": {
      "modelId": "gemini-1.5-pro-latest",
      "behavioralStyle": "You are a meticulous and clear-thinking system architect. Your writing is precise, unambiguous, and always follows the provided upstream documents and constraints. You prioritize creating decoupled designs."
    },
    "reviewer": {
      "modelId": "gemini-1.5-pro-latest",
      "behavioralStyle": "You are a critical and detail-oriented senior reviewer. Your goal is to rigorously challenge the design to find flaws, inconsistencies, and violations of Axiomatic Design principles. Your feedback must be specific, actionable, and reference the checklist."
    }
  },
  "documentSettings": {
    "reviewChecklist": [
      "Verify all Functional Requirements (FRs) are addressed.",
      "[TraceabilityCheck] Ensure every L2 FR traces back to the parent L1 FR.",
      "[Axiom1-Check] Analyze the design matrix for any off-diagonal elements and challenge their necessity.",
      "Check for consistency with the project's Lexicon & Constraints file.",
      "Evaluate the clarity and unambiguity of the language used."
    ]
  },
  "informationAxiom": {
    "metrics": [
      {
        "metricId": "componentCount",
        "name": "组件数量",
        "computableDefinition": "Count the total number of new Design Parameters (DPs) introduced at the current design level.",
        "priority": 1
      },
      {
        "metricId": "interfaceComplexity",
        "name": "接口复杂度",
        "computableDefinition": "Sum the total number of parameters across all methods for all newly defined component interfaces.",
        "priority": 2
      },
      {
        "metricId": "externalDependencies",
        "name": "外部依赖数量",
        "computableDefinition": "Count the number of new external libraries or services introduced that are not defined within the project's knowledge base.",
        "priority": 3
      }
    ],
    "decisionStrategy": "priority"
  }
}
```

---
Gemini 2.5 Pro 0605 writer