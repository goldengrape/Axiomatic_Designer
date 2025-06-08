好的，遵照指示。

我将根据《项目代办事项列表 (V2.4)》的顺序，开始执行下一项待办工作：**撰写《依赖关系置信度评分计算规则定义文档》**。

这份文档旨在将《软件用户需求文档 (URD) V1.6》§3.2.3.1 中关于“置信度评分”的原则，形式化为一套清晰、无歧义、可直接转化为代码实现的算法。这份规则是 `L1-DP7: 版本控制与变更服务` 在执行变更影响分析时的核心逻辑。

以下是本次工作的产出文档。

---

### **依赖关系置信度评分计算规则定义文档 (V1.0)**

**状态:** 草稿

**版本说明:** 本文档 (V1.0) 是该规范的初版。其目的是对《软件用户需求文档 (URD) V1.6》中定义的“置信度评分”计算原则进行形式化和算法化，为 `L1-DP7: 版本控制与变更服务` 的具体实现提供一个确定性的、可配置的逻辑基础。

#### **1. 引言**

本文档详细定义了在变更管理流程中，用于计算下游文档依赖关系“置信度评分”的具体算法和规则。该评分是系统向用户呈现《变更影响报告》时的关键辅助信息，旨在帮助用户理解不同依赖关系的强度和变更所带来的潜在风险。

`L1-DP7: 版本控制与变更服务` 是本规则的唯一实现者和执行者。

**设计目标:**
*   **可解释性 (Interpretability):** 评分的计算过程必须是透明的，最终的评分和分类应能追溯到其所依据的具体规则。
*   **可配置性 (Configurability):** 算法中的关键参数（如权重、阈值）必须是可配置的，允许在项目模板中根据项目需求进行调整。
*   **确定性 (Determinism):** 对于任何给定的输入（源文档变更、下游文档、链接类型），算法的输出必须是完全可预测和可重复的。

**设计依据:**
*   《软件用户需求文档 (URD) V1.6》 (特别是 §3.2.3.1)
*   《L1-DP7 版本控制与变更服务 API 接口规范 (V1.1)》
*   《项目代办事项列表 (V2.4)》

#### **2. 设计哲学：基准与调整模型**

本算法采用“基准分与调整系数”模型。其核心思想是：
1.  首先根据**链接类型**的强度，确定一个**基准分 (Base Score)**。这是影响置信度的最主要因素。
2.  然后根据**变更范围**是否直接影响下游引用的具体内容，计算出一个**调整系数 (Adjustment Factor)**。
3.  最终得分由基准分和调整系数共同决定，然后根据可配置的阈值进行分类。

这种模型确保了评分的可解释性，每个部分都对应 URD 中的一个明确原则。

#### **3. 评分算法形式化定义**

算法被设计为一个纯函数，用于评估一个下游文档 (`target_document`) 对一个已变更的源文档 (`source_document`) 的依赖置信度。

**伪代码表示:**

```
// 定义可配置的参数结构
DataStructure ScoringConfig {
  weights: {
    parent_child: float,        // 父子层级关系权重
    explicit_reference: float,  // 显式引用权重
    semantic_factor: float,     // 语义相似度权重因子
    keyword_match: float        // 关键词匹配权重
  },
  multipliers: {
    direct_impact: float        // 变更范围直接命中的乘数
  },
  thresholds: {
    high: float,                // 高置信度分类阈值
    medium: float               // 中置信度分类阈值
  }
}

// 主函数：计算置信度
Function CalculateConfidence(source_doc_before: Document, source_doc_after: Document, target_document: Document, link_info: LinkInfo, config: ScoringConfig) -> {score: float, category: string, reason: string} {

  // 步骤 1: 根据链接类型确定基准分 (Base Score)
  base_score = 0.0;
  reason_base = "";
  switch (link_info.type) {
    case "PARENT_CHILD":
      base_score = config.weights.parent_child;
      reason_base = "直接父子层级关系";
      break;
    case "EXPLICIT_REFERENCE":
      base_score = config.weights.explicit_reference;
      reason_base = "通过结构化标签显式引用";
      break;
    case "SEMANTIC_SIMILARITY":
      base_score = link_info.similarity_score * config.weights.semantic_factor;
      reason_base = "通过语义相似性关联";
      break;
    case "KEYWORD_MATCH":
      base_score = config.weights.keyword_match;
      reason_base = "通过关键词匹配关联";
      break;
  }

  // 步骤 2: 计算变更范围调整系数 (Scope Adjustment Factor)
  scope_factor = 1.0;
  reason_scope = "";
  // 仅对高可信度的链接类型检查变更范围
  if (link_info.type == "PARENT_CHILD" || link_info.type == "EXPLICIT_REFERENCE") {
    // 找出 target_document 明确引用的 source_document 中的所有元素ID (如 FR-1, DP-2)
    referenced_element_ids = ParseReferencedElements(target_document);
    
    // 比较 source_doc_before 和 source_doc_after，判断被引用的元素是否被修改
    if (WasReferencedElementModified(source_doc_before, source_doc_after, referenced_element_ids)) {
      scope_factor = config.multipliers.direct_impact;
      reason_scope = "变更内容直接影响了被引用的元素";
    }
  }

  // 步骤 3: 计算最终得分
  // 依赖距离调整：本算法在单次调用中只处理直接依赖，距离为1。
  // 更深层级的依赖由调用方（图遍历算法）处理，因此距离调整系数在此处为1.0。
  final_score = base_score * scope_factor;
  final_score = min(final_score, 1.0); // 得分上限为1.0

  // 步骤 4: 分类并生成说明
  category = "LOW";
  if (final_score >= config.thresholds.high) {
    category = "HIGH";
  } else if (final_score >= config.thresholds.medium) {
    category = "MEDIUM";
  }

  full_reason = reason_base + (reason_scope ? "; " + reason_scope : "");

  return {score: final_score, category: category, reason: full_reason};
}
```

#### **4. 可配置参数定义**

以下参数应由项目模板提供，并传递给 `L1-DP7` 服务。

| 分类        | 参数                 | 类型  | 默认值 | 描述                                                                |
| :---------- | :------------------- | :---- | :----- | :------------------------------------------------------------------ |
| **权重**    | `parent_child`       | float | 0.9    | 父子层级关系（如 L2 对 L1 分解）的基准分。                          |
|             | `explicit_reference` | float | 0.8    | 通过 `[TraceabilityCheck]` 等标签显式引用的基准分。                 |
|             | `semantic_factor`    | float | 0.6    | 语义相似度得分的权重因子。                                          |
|             | `keyword_match`      | float | 0.2    | 仅通过关键词匹配的基准分。                                          |
| **乘数**    | `direct_impact`      | float | 1.2    | 当变更直接命中被下游引用的FR/DP时，应用的调整乘数。                 |
| **阈值**    | `high`               | float | 0.75   | 判断为 `HIGH` 置信度的最低分。                                      |
|             | `medium`             | float | 0.4    | 判断为 `MEDIUM` 置信度的最低分。                                    |

#### **5. 应用场景示例**

##### **场景 A: 高置信度 - L1 文档修改了被分解的 DP**

*   **背景:** `ADD_L1.md` 修改了 `L1-DP5` 的定义。`AD_L2_DP5.md` 是 `L1-DP5` 的下一级分解文档。
*   **输入:**
    *   `link_info`: `{type: "PARENT_CHILD"}`
    *   `source_doc` 变更: 命中了 `L1-DP5` 的定义部分。
*   **计算过程:**
    1.  **基准分:** `base_score = config.weights.parent_child` = **0.9**
    2.  **调整系数:** 变更命中了作为父子关系核心的 `L1-DP5`。`scope_factor = config.multipliers.direct_impact` = **1.2**
    3.  **最终得分:** `0.9 * 1.2 = 1.08`，裁剪后为 **1.0**。
*   **输出:**
    *   `score`: 1.0
    *   `category`: `HIGH`
    *   `reason`: "直接父子层级关系; 变更内容直接影响了被引用的元素"

##### **场景 B: 中等置信度 - 语义相似文档被修改**

*   **背景:** `Best_Practices.md` 与 `API_Design.md` 在语义上高度相关。`Best_Practices.md` 被修改。
*   **输入:**
    *   `link_info`: `{type: "SEMANTIC_SIMILARITY", similarity_score: 0.85}`
    *   `source_doc` 变更: `Best_Practices.md` 内容更新。
*   **计算过程:**
    1.  **基准分:** `base_score = 0.85 * config.weights.semantic_factor` = `0.85 * 0.6` = **0.51**
    2.  **调整系数:** 语义链接不触发范围检查。`scope_factor` = **1.0**
    3.  **最终得分:** `0.51 * 1.0` = **0.51**
*   **输出:**
    *   `score`: 0.51
    *   `category`: `MEDIUM`
    *   `reason`: "通过语义相似性关联"

##### **场景 C: 低置信度 - 关键词匹配但变更无关**

*   **背景:** `Glossary.md` 包含术语 "API"，`Payment_Gateway.md` 也包含此术语但无直接引用关系。`Glossary.md` 修改了另一个术语 "URD" 的定义。
*   **输入:**
    *   `link_info`: `{type: "KEYWORD_MATCH"}`
    *   `source_doc` 变更: 未命中 "API" 术语。
*   **计算过程:**
    1.  **基准分:** `base_score = config.weights.keyword_match` = **0.2**
    2.  **调整系数:** 关键词匹配不触发范围检查。`scope_factor` = **1.0**
    3.  **最终得分:** `0.2 * 1.0` = **0.2**
*   **输出:**
    *   `score`: 0.2
    *   `category`: `LOW`
    *   `reason`: "通过关键词匹配关联"

---
Gemini 2.5 Pro 0605 writer