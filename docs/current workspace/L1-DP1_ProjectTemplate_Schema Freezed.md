
---

### **项目模板 Schema 规范 (V1.2)**

**状态:** 批准 (Approved)

**版本说明:** 本文档 (V1.2) 是对 V1.1 版本的修订。此次修订旨在响应《评审意见：关于<项目模板 Schema 规范 (V1.1)>》中提出的强制性修订指令。核心变更包括：1) 增强了对 `informationAxiom` 中 `metrics` 优先级唯一性约束的描述，以消除不确定性风险；2) 禁止在 `componentSettings` 中使用未在 Schema 中定义的属性，以提高配置的健壮性。

#### **1. 引言**

本文档使用 JSON Schema 格式，详细定义了“项目模板”文件（推荐使用 `.project.json` 作为文件扩展名）的数据结构。项目模板允许用户预设项目的核心参数，从而确保项目在创建时具有一致的基线配置。

V1.2 的核心设计哲学依然是“配置随组件走”。所有配置项均被归类到其所属的系统组件（设计参数 DP）之下，实现了关注点分离，并遵循了公理设计的独立公理原则。所有与本项目模板管理器 (`L1-DP1`) 交互的组件，都应遵循此 Schema 来读取或生成模板文件。

设计依据包括：
*   《公理设计辅助系统 L1 公理设计文档 (V1.1)》中定义的系统架构。
*   《评审意见：关于<项目模板 Schema 规范 (V1.1)>》中的强制性修订指令。
*   《软件用户需求文档 (URD) V1.6》。

#### **2. JSON Schema 定义**

以下是项目模板文件的完整 JSON Schema 定义 (V1.2)。

```json
{
  "$schema": "http://json-schema.org/draft-07/schema#",
  "title": "Axiomatic Design Assistant Project Template",
  "description": "Defines a modular structure for a project template, mirroring the system's component architecture (DPs). It includes settings for workflow control, content generation, review, and evaluation.",
  "type": "object",
  "required": [
    "templateSchemaVersion",
    "projectName",
    "componentSettings"
  ],
  "properties": {
    "templateSchemaVersion": {
      "description": "The version of this template schema itself. Ensures compatibility.",
      "type": "string",
      "const": "1.2"
    },
    "projectName": {
      "description": "A user-friendly name for the project this template configures.",
      "type": "string",
      "minLength": 1
    },
    "componentSettings": {
      "description": "A container for component-specific settings, mapping directly to the system's Design Parameters (DPs). This structure ensures configuration modularity.",
      "type": "object",
      "properties": {
        "dp0": {
          "description": "Settings for DP0: Workflow & State Controller.",
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
        "dp5": {
          "description": "Settings for DP5: Content Generation & Revision Engine.",
          "type": "object",
          "properties": {
            "llmConfig": {
              "description": "Configuration for the LLM used by the Writer role in this component.",
              "type": "object",
              "properties": {
                "modelId": { "type": "string", "description": "Identifier for the LLM model." },
                "behavioralStyle": { "type": "string", "description": "A detailed prompt describing the desired writing style and personality." }
              },
              "required": ["modelId", "behavioralStyle"]
            }
          },
          "required": ["llmConfig"]
        },
        "dp6": {
          "description": "Settings for DP6: Review & Assessment Engine.",
          "type": "object",
          "properties": {
            "llmConfig": {
              "description": "Configuration for the LLM used by the Reviewer role in this component.",
              "type": "object",
              "properties": {
                "modelId": { "type": "string", "description": "Identifier for the LLM model." },
                "behavioralStyle": { "type": "string", "description": "A detailed prompt describing the desired reviewing style and critical perspective." }
              },
              "required": ["modelId", "behavioralStyle"]
            },
            "reviewChecklist": {
              "description": "A list of standard checks for the Reviewer. Items are natural language instructions. Items enclosed in `[...]` are special directives that may be parsed by dedicated logic within DP6.",
              "type": "array",
              "items": { "type": "string" }
            },
            "documentStructure": {
                "description": "Defines structural rules or templates for documents. (Placeholder for future expansion)",
                "type": "object",
                "properties": {}
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
                      "priority": {
                        "description": "关键约束：此优先级在数组内必须唯一。当前 Schema 无法在语法层面强制此约束，依赖于模板创建者和审查工具来保证。重复的优先级将导致系统在决策时产生不确定的、不可靠的行为。",
                        "type": "integer"
                       }
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
          },
          "required": ["llmConfig", "reviewChecklist", "informationAxiom"]
        }
      },
      "additionalProperties": false
    }
  }
}
```

#### **3. 关键字段说明**

*   **`templateSchemaVersion` (string, 必需):** 模式版本。用于确保模板文件的兼容性。本文档定义的版本为 "1.2"。
*   **`projectName` (string, 必需):** 项目名称。用于在用户界面中识别模板。
*   **`componentSettings` (object, 必需):** **核心结构**。这是一个容器，其下的每个键都直接对应一个需要配置的 L1 设计参数（DP）。这种结构将配置项与其所属的组件绑定，确保了配置的模块化和解耦。**V1.2 更新：** 此对象不再接受任何未在 `properties` 中明确定义的键（如`"dp0"`, `"dp5"`, `"dp6"`），以防止因拼写错误等导致的配置静默失败。
    *   **`dp0` (object):** `DP0: 工作流与状态控制器` 的专属配置。
        *   `maxReviewCycles`: 定义了在强制进入“用户仲裁”前，系统自动执行“审查-修订”循环的最大次数。
        *   `maxArbitrationResets`: 定义了在单次用户仲裁中，用户可以重置审查循环的最大次数。
    *   **`dp5` (object):** `DP5: 内容生成与修订引擎` 的专属配置。
        *   `llmConfig`: 定义了“撰写员”角色的LLM模型和行为风格。
    *   **`dp6` (object):** `DP6: 评审与评估引擎` 的专属配置。
        *   `llmConfig`: 定义了“审查员”角色的LLM模型和行为风格。
        *   `reviewChecklist`: 审查员必须遵循的审查清单。
        *   `documentStructure`: 用于定义文档结构规则的占位符。
        *   `informationAxiom`: 应用信息公理的完整框架。**V1.2 更新：** 其 `metrics` 数组中 `priority` 字段的描述已更新，明确强调其唯一性是保证系统决策确定性的关键，并警示了当前 Schema 的局限性。

#### **4. 示例 (`example.project.json`)**

以下是一个符合 V1.2 Schema 规范的完整项目模板文件示例。

```json
{
  "templateSchemaVersion": "1.2",
  "projectName": "Default Engineering Design Template (Modular & Robust)",
  "componentSettings": {
    "dp0": {
      "maxReviewCycles": 5,
      "maxArbitrationResets": 2
    },
    "dp5": {
      "llmConfig": {
        "modelId": "gemini-1.5-pro-latest",
        "behavioralStyle": "You are a meticulous and clear-thinking system architect. Your writing is precise, unambiguous, and always follows the provided upstream documents and constraints. You prioritize creating decoupled designs."
      }
    },
    "dp6": {
      "llmConfig": {
        "modelId": "gemini-1.5-pro-latest",
        "behavioralStyle": "You are a critical and detail-oriented senior reviewer. Your goal is to rigorously challenge the design to find flaws, inconsistencies, and violations of Axiomatic Design principles. Your feedback must be specific, actionable, and reference the checklist."
      },
      "reviewChecklist": [
        "Verify all Functional Requirements (FRs) are addressed.",
        "[TraceabilityCheck] Ensure every L2 FR traces back to the parent L1 FR.",
        "[Axiom1-Check] Analyze the design matrix for any off-diagonal elements and challenge their necessity.",
        "Check for consistency with the project's Lexicon & Constraints file.",
        "Evaluate the clarity and unambiguity of the language used."
      ],
      "documentStructure": {},
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
  }
}
```

---
Gemini 2.5 Pro 0605 writer