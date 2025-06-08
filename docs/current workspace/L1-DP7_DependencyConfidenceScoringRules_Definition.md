好的，遵照指示。

我已收到并深入研究了《评审意见：关于<依赖关系置信度评分计算规则定义文档 (V1.0)>》。该评审结论为“批准，附带建议性修订”。

我将依据该评审文档中提出的三项建议性修订意见，对规范进行修订。本次修订的核心是增强算法定义的逻辑完备性和术语精确性。

以下是修订后的完整文档。

---

### **依赖关系置信度评分计算规则定义文档 (V1.1)**

**状态:** 草稿

**版本说明:** 本文档 (V1.1) 是对 V1.0 版本的修订。它依据《评审意见：关于<依赖关系置信度评分计算规则定义文档 (V1.0)>》中提出的建议性意见进行修订，旨在增强文档的逻辑完备性与术语精确性。核心变更包括：
1.  **明确算法前提:** 新增了关于算法有效性前提的说明，明确指出其对“可引用元素必须拥有唯一标识符”这一系统级契约的依赖。
2.  **精化参数分类:** 重构了可配置参数表，将参数分类为更精确的“基准分权重”和“调整系数”，以消除术语上的歧义。
3.  **补充设计说明:** 为“关键词匹配”这一低置信度链接的简化评分模型增加了设计说明，阐明了当前设计的考量并为未来迭代指明了方向。

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

**算法前提说明:** 本算法中“变更范围调整系数”的计算逻辑（步骤2），其有效性严格依赖于一个系统级契约：所有项目文档中可被追溯的元素（如功能需求FR、设计参数DP等）**必须**拥有唯一的、机器可解析的标识符。`ParseReferencedElements` 和 `WasReferencedElementModified` 函数的实现依赖此标识符的存在来进行精确匹配。

算法被设计为一个纯函数，用于评估一个下游文档 (`target_document`) 对一个已变更的源文档 (`source_document`) 的依赖置信度。

**伪代码表示:**

```
// 定义可配置的参数结构
DataStructure ScoringConfig {
  base_score_weights: {
    parent_child: float,        // 父子层级关系权重
    explicit_reference: float,  // 显式引用权重
    keyword_match: float        // 关键词匹配权重
  },
  adjustment_factors: {
    direct_impact: float,       // 变更范围直接命中的乘数
    semantic_factor: float      // 语义相似度得分的缩放系数
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
      base_score = config.base_score_weights.parent_child;
      reason_base = "直接父子层级关系";
      break;
    case "EXPLICIT_REFERENCE":
      base_score = config.base_score_weights.explicit_reference;
      reason_base = "通过结构化标签显式引用";
      break;
    case "SEMANTIC_SIMILARITY":
      // 注意：语义相似度的原始分由外部提供，此处仅应用缩放系数
      base_score = link_info.similarity_score * config.adjustment_factors.semantic_factor;
      reason_base = "通过语义相似性关联";
      break;
    case "KEYWORD_MATCH":
      base_score = config.base_score_weights.keyword_match;
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
      scope_factor = config.adjustment_factors.direct_impact;
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

| 分类             | 参数                 | 类型  | 默认值 | 描述                                                                          |
| :--------------- | :------------------- | :---- | :----- | :---------------------------------------------------------------------------- |
| **基准分权重**   | `parent_child`       | float | 0.9    | 父子层级关系（如 L2 对 L1 分解）的**基准分**。                                  |
| (Base Score Weights) | `explicit_reference` | float | 0.8    | 通过 `[TraceabilityCheck]` 等标签显式引用的**基准分**。                       |
|                  | `keyword_match`      | float | 0.2    | 仅通过关键词匹配的**基准分**。                                                |
| **调整系数**     | `direct_impact`      | float | 1.2    | 当变更直接命中被下游引用的FR/DP时，应用于基准分的**调整乘数**。               |
| (Adjustment Factors) | `semantic_factor`    | float | 0.6    | 应用于外部传入的“语义相似度原始分”的**缩放系数**，用于将其转换为系统内的基准分。 |
| **阈值**         | `high`               | float | 0.75   | 判断为 `HIGH` 置信度的最低分。                                                |
| (Thresholds)     | `medium`             | float | 0.4    | 判断为 `MEDIUM` 置信度的最低分。                                              |

#### **5. 应用场景示例**

##### **场景 A: 高置信度 - L1 文档修改了被分解的 DP**

*   **背景:** `ADD_L1.md` 修改了 `L1-DP5` 的定义。`AD_L2_DP5.md` 是 `L1-DP5` 的下一级分解文档。
*   **输入:**
    *   `link_info`: `{type: "PARENT_CHILD"}`
    *   `source_doc` 变更: 命中了 `L1-DP5` 的定义部分。
*   **计算过程:**
    1.  **基准分:** `base_score = config.base_score_weights.parent_child` = **0.9**
    2.  **调整系数:** 变更命中了作为父子关系核心的 `L1-DP5`。`scope_factor = config.adjustment_factors.direct_impact` = **1.2**
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
    1.  **基准分:** `base_score = 0.85 * config.adjustment_factors.semantic_factor` = `0.85 * 0.6` = **0.51**
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
    1.  **基准分:** `base_score = config.base_score_weights.keyword_match` = **0.2**
    2.  **调整系数:** 关键词匹配不触发范围检查。`scope_factor` = **1.0**
    3.  **最终得分:** `0.2 * 1.0` = **0.2**
*   **输出:**
    *   `score`: 0.2
    *   `category`: `LOW`
    *   `reason`: "通过关键词匹配关联"

**设计说明:** 当前模型为“关键词匹配”提供了一个固定的基准分，这是一种为了实现确定性和简化计算而采取的设计。未来的增强版本可以探索更动态的评分模型，例如：根据匹配关键词的数量、关键词在《项目词汇表》中定义的重要性，或其在文档中的上下文位置，来动态计算此基准分。

---
Gemini 2.5 Pro 0605 writer