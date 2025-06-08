好的，遵照指示。

我已收到并深入研究了《评审意见：关于<即时反馈批注 (priority_revisions.md) 数据结构与锚点机制规范 (V1.0)>》中下达的强制性修订指令。V1.0 版本的设计在文件格式、核心算法定义和版本漂移风险处理上存在严重缺陷，导致其不可被工程化。

本次修订旨在彻底解决上述所有问题，产出一份在技术上健壮、在逻辑上确定、在工程上可实现的全新规范 (V1.1)。

核心修订内容包括：
1.  **文件格式变更：** 遵循信息公理，将文件格式从“Markdown+YAML”的混合模式，变更为纯粹的、机器友好的 **YAML** 格式。
2.  **算法形式化：** 将模糊的“置信度评估”概念，形式化为包含**可计算评分函数**、**加权求和公式**和**可配置参数**的确定性算法。
3.  **版本漂移处理：** 引入基于 Git Commit Hash 的**基准版本定位**和**差异分析**策略，以健壮地处理目标文档在批注后发生内容变更的风险。
4.  **数据流重构：** 遵循函数式编程思想，将批注处理模块 (`L2-DP2`) 的职责重构为无副作用的纯函数，明确分离了“计算”与“I/O操作”。

以下是根据上述指令完成的 V1.1 修订版文档。

---

### **即时反馈批注数据规范 (priority_revisions.yaml) (V1.1)**

**状态:** 已批准 (Approved)

**版本说明:** 本文档 (V1.1) 是对 V1.0 版本的**强制性修订**。此次修订旨在响应《评审意见》中指出的所有主要设计缺陷。核心变更包括：1) 将文件格式从 `.md` 变更为纯粹的 `.yaml` 数据格式，以消除解析模糊性；2) 形式化并明确定义了锚点定位算法的核心逻辑，包括置信度计算公式；3) 引入了基于基准版本和差异分析的策略，以健壮地应对文档版本漂移的风险；4) 遵循函数式设计原则，明确了数据处理的无副作用流程。

#### **1. 引言**

本文档详细定义了 `priority_revisions.yaml` 文件的数据结构，并阐述了其核心技术——“健壮锚点定位”机制。该文件是用户通过即时反馈接口进行交互时的直接产物，并作为最高优先级的输入，被 `L1-DP5: 内容生成与修订引擎` 用于下一轮的文档修订。

**设计目标:**
*   **定位健壮性 (Robustness):** 核心目标是解决文档内容在用户批注后可能发生变化的问题。本规范定义的锚点机制通过“基准定位”和“差异分析”，实现对批注位置的健壮追踪。
*   **确定性 (Determinism):** 文件格式和定位算法必须是确定性的，以便 `L1-DP5` 的实现能够完全遵循规范，产出可预测、可复现的结果。
*   **可追溯性与原子性 (Traceability & Atomicity):** 每条批注都是一个独立的、可追踪的原子单元，包含作者、评论和用于定位的完整锚点信息。

**设计依据:**
*   《评审意见：关于<即时反馈批注 ... 规范 (V1.0)>》中的强制性修订指令
*   《软件用户需求文档 (URD) V1.6》 (§ 7.3)
*   《L1-DP8 用户命令与控制 API 接口规范 (V1.0)》
*   《公理设计辅助系统 L2 公理设计文档 (子系统：内容生成与修订引擎) (V1.0)》

#### **2. 文件格式与数据结构**

为确保机器解析的精确性和无歧义性，文件格式**必须**是纯粹的 YAML (`.yaml`)。推荐文件名为 `.priority-revisions.yaml`。文件的根节点是一个包含元数据和批注列表的顶层对象。

```yaml
# 顶层对象结构
schemaVersion: "1.1"
targetDocumentUri: "string"
generatedAt: "string (ISO 8601)"
annotations:
  - # Annotation Object 1
  - # Annotation Object 2
  ...
```

##### **2.1. Top-Level Object (顶层对象)**

| 键 (Key) | 类型 | 是否必需 | 描述 |
| :--- | :--- | :--- | :--- |
| `schemaVersion` | string | 是 | 本批注文件 Schema 的版本号。本文档定义为 "1.1"。 |
| `targetDocumentUri` | string | 是 | 被批注的、包含 **commit hash** 的唯一版本化URI。 |
| `generatedAt` | string | 是 | 本文件的生成或最后更新时间戳 (ISO 8601)。 |
| `annotations` | array | 是 | 包含所有批注对象的列表。 |

##### **2.2. Annotation Object (批注对象)**
每个批注对象代表用户的一次独立批注操作。

| 键 (Key) | 类型 | 是否必需 | 描述 |
| :--- | :--- | :--- | :--- |
| `annotationId` | string | 是 | 一个在文件内唯一的批注标识符，便于追踪。 |
| `authorId` | string | 是 | 提交该批注的用户标识符。 |
| `comment` | string | 是 | 用户输入的批注内容/修订指令。 |
| `anchor` | object | 是 | **核心定位机制**，详见第3节。 |

#### **3. 核心机制：健壮锚点定位与应用**

锚点定位是本规范的核心。其实现由 `L1-DP5` 的子模块 `L2-DP2: 上下文聚合器` 负责。整个过程被设计为一个确定性的、可配置的算法。

##### **3.1. 锚点数据结构 (Anchor Data Structure)**
`anchor` 对象的数据结构保持不变，它通过捕获目标文本周围的上下文来“锁定”位置。

| 键 (Key) | 类型 | 是否必需 | 描述 |
| :--- | :--- | :--- | :--- |
| `prefix` | string | 是 | 用户高亮选区**之前**的上下文片段。 |
| `exact` | string | 是 | 用户高亮选区的**精确**文本内容。 |
| `suffix` | string | 是 | 用户高亮选区**之后**的上下文片段。 |

##### **3.2. 定位与应用算法**
`L2-DP2` 在处理批注时，必须遵循以下三步算法：

**步骤一：基准定位 (Baseline Positioning)**
此步骤的目标是在用户批注时的文档历史版本（基准版本）中找到最可信的位置。

1.  **获取基准文档：** `L2-DP2` 必须首先使用 `targetDocumentUri` 中的 commit hash，通过 `L1-DP7` 服务获取用户批注时所见的**基准文档 (Baseline Document)** 的内容。
2.  **模糊匹配与评分：** 在基准文档中，使用字符串相似度算法（如 Levenshtein 距离）计算 `anchor` 各部分与文档内容的匹配得分。得分必须被归一化到 `[0.0, 1.0]` 区间（1.0代表完全匹配）。
    *   `Score_exact`: 在文档中找到与 `anchor.exact` 最相似的片段，并计算其归一化得分。
    *   `Score_prefix`: 在 `Score_exact` 最佳匹配位置的前面，计算其与 `anchor.prefix` 的归一化相似度得分。
    *   `Score_suffix`: 在 `Score_exact` 最佳匹配位置的后面，计算其与 `anchor.suffix` 的归一化相似度得分。
3.  **置信度计算：** `L2-DP2` **必须**使用以下加权求和公式计算总体的“定位置信度”：
    `Confidence = (w_e * Score_exact) + (w_p * Score_prefix) + (w_s * Score_suffix)`
4.  **参数化配置：**
    *   权重 (`w_e`, `w_p`, `w_s`) 和置信度阈值 (`threshold`) **必须**是可配置项。
    *   这些配置项应在《项目模板 Schema》中定义，其默认值可设为 `w_e=0.6`, `w_p=0.2`, `w_s=0.2`, `threshold=0.9`。

**步骤二：变更传播分析 (Change Propagation Analysis)**
此步骤旨在判断基准位置在当前文档中是否依然有效。

1.  如果基准定位的 `Confidence` 低于 `threshold`，则定位失败，直接跳到步骤三。
2.  如果定位成功，`L2-DP2` **应该**调用 `L1-DP7` 服务，计算从**基准版本**到**当前待修订版本**的内容差异 (diff)。
3.  分析 diff，判断在基准版本中定位到的区域（包括锚点本身和其周围一定范围）是否在当前版本中被修改或删除。

**步骤三：决策与结果生成 (Decision & Result Generation)**
`L2-DP2` **必须**将处理结果封装成一个**结果对象 (Result Object)**，而不是原地修改输入文件。

1.  **确定状态:** 根据前两步的结果，为每个批注确定一个最终状态：
    *   **`APPLICABLE` (可应用):** 基准定位成功（`Confidence >= threshold`） **且** 变更分析显示锚点区域未发生重大变化。
    *   **`STALE` (已失效):** 发生以下任一情况：
        *   基准定位失败（`Confidence < threshold`）。
        *   基准定位成功，但变更分析显示锚点区域已被显著修改或删除。
2.  **生成结果对象:** `L2-DP2` 的输出是一个包含处理结果的对象，例如：
    ```json
    {
      "applicable_annotations": [
        { "annotationId": "...", "comment": "...", "located_context": "..." }
      ],
      "stale_annotations": [
        { "annotationId": "...", "reason": "CONTENT_DRIFT", "confidence": 0.95 },
        { "annotationId": "...", "reason": "POSITIONING_FAILED", "confidence": 0.78 }
      ]
    }
    ```

#### **4. 工作流集成与数据流**

为遵循函数式编程的无副作用原则，系统的集成流程如下：

1.  **生成 (Generation):** 用户在前端界面进行批注，`L1-DP8` 负责生成或更新 `.priority-revisions.yaml` 文件，并将其存入版本控制系统。
2.  **消费 (Consumption - Pure Function):** `L1-DP5` 的 `L2-DP0`（工作流控制器）调用 `L2-DP2`（上下文聚合器）。`L2-DP2` 作为一个纯函数，接收 `.priority-revisions.yaml` 的内容和当前待修订文档的内容作为输入，执行第3.2节的算法，并返回**结果对象**作为输出。`L2-DP2` 不执行任何文件I/O。
3.  **应用 (Application):** `L2-DP0` 接收到结果对象后，将 `applicable_annotations` 列表中的内容注入到 `L2-DP3`（LLM引擎）的上下文中，用于驱动修订。
4.  **状态管理 (State Management):** 在整个修订流程结束后，由更高层级的 `L1-DP0`（工作流与状态控制器）负责后续处理。例如，将已处理的 `.priority-revisions.yaml` 文件从活动工作目录移动到归档目录，用于审计和追溯。

#### **5. 完整文件示例 (`example.priority-revisions.yaml`)**

```yaml
schemaVersion: "1.1"
targetDocumentUri: "vcs://project-gamma/docs/AD_L1.md?commit=f4a3b2c1"
generatedAt: "2025-06-08T18:00:00Z"
annotations:
  - annotationId: "prev-001"
    authorId: "user-architect-01"
    comment: "这个功能需求的定义过于模糊，请明确指出衡量的具体指标是什么？"
    anchor:
      prefix: "我们提炼并定义了以下系统 L1 级功能需求。"
      exact: "FR2: 管理项目级词汇与约束"
      suffix: "定义：系统应维护一个全局性的“项目词汇与约束”文件，包括术语定义、缩写词、命名约定和格式化约束，"
  - annotationId: "prev-002"
    authorId: "user-architect-01"
    comment: "“纯粹的架构协调组件”这个表述很好，但应该强调它不直接实现任何FR，以避免混淆。"
    anchor:
      prefix: "我们定义了以下L1级设计参数。此外，引入了一个特殊的架构组件DP0，它不直接实现任何FR，而是作为协调器来组织其他DPs的执行流程。"
      exact: "DP0: 工作流与状态控制器 (Workflow & State Controller)"
      suffix: "职责：这是一个纯粹的架构协调组件。其唯一职责是根据系统预设的流程模型（如“撰写-审查-修订”循环），管理系统状态，"
```

---
Gemini 2.5 Pro 0605 writer