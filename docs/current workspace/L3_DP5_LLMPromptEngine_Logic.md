好的，遵照指示。

我将开始执行《项目代办事项列表 (V5.1)》中的下一项任务 `TODO-L3-DP5-002`：**撰写《DP2_DP5.3 LLM Prompt引擎 详细逻辑定义》**。

这份 L3 级别的详细设计文档，其核心目的是形式化定义“LLM Prompt 引擎”的行为。它将明确阐述如何将上游 `DP2_DP5.2 上下文聚合器` 输出的 `ContextPackage` 对象，系统性地、策略性地转换为一个或多个高质量的、可供大型语言模型（如 Gemini）执行的 Prompt。本文档将定义核心的 Prompt 构建策略，并明确不同上下文信息在 Prompt 中的映射关系。

以下是本次工作的产出文档。

---

### **DP2_DP5.3 LLM Prompt引擎 详细逻辑定义 (V1.0)**

**状态:** 草稿 (Draft)

**版本说明:** 本文档 (V1.0) 是该组件的初版详细逻辑定义。其目的是将《公理设计辅助系统 L2 公理设计文档 (子系统：内容生成与修订引擎)》中对 `DP2_DP5.3` 的抽象定义，转化为一份具体的、可指导工程实现的详细设计。

#### **1. 引言**

本文档详细定义了“内容生成与修订引擎”子系统内部的 `DP2_DP5.3: LLM Prompt引擎与适配器` 组件。该组件位于内容生成流水线的核心位置，其上游是 `DP2_DP5.2: 上下文聚合器`，下游是 `DP2_DP5.4: 输出文档封装器`。

本组件的核心职责是：**将结构化的 `ContextPackage` 对象，转换为一个或多个高质量的、可供大型语言模型（LLM）执行的提示（Prompts）**。它封装了所有与 Prompt 工程相关的复杂性，包括 Prompt 的构建策略、上下文信息的组织、以及与 LLM 模型的具体交互逻辑。

**设计依据:**
*   《公理设计辅助系统 L2 公理设计文档 (子系统：内容生成与修订引擎) (V1.0)》 (父级设计)
*   《DP2_DP5.2 上下文聚合器 内部接口与逻辑定义 (V1.2)》 (上游组件规范)
*   《软件用户需求文档 (URD) V1.6》

#### **2. 核心设计哲学：三阶段思维链 (Three-Stage Chain-of-Thought)**

为了处理复杂的修订任务，本引擎**不采用**将所有信息简单拼接成单一“巨型Prompt”的策略，因为该策略在面对多重、冲突的修订指令时，可靠性和可控性较差。

取而代之，本引擎**必须**采用一种更健壮、更可控的 **“三阶段思维链 (Three-Stage Chain-of-Thought)”** 策略。该策略将复杂的修订任务分解为三个逻辑上独立的、连续的LLM调用步骤，模拟了专家解决问题的过程：

1.  **阶段一：分析与规划 (Analysis & Planning):** 首先，LLM 扮演“项目经理”角色，分析所有审查意见和用户批注，生成一份清晰、可执行的修订计划。
2.  **阶段二：执行与生成 (Execution & Generation):** 其次，LLM 扮演“系统架构师”角色，依据第一阶段生成的计划，并参考所有背景知识，对文档进行具体修订。
3.  **阶段三：自省与提炼 (Self-Correction & Refinement):** 最后，LLM 扮演“质量保证”角色，对照修订计划和原始要求，检查第二阶段的输出，并进行最终的清理和润色，确保交付质量。

这种设计将一个复杂的任务分解为三个更小、职责更单一的任务，显著提高了最终输出的准确性、一致性和可控性。对于较简单的“从零撰写”任务，流程将被简化。

#### **3. 接口定义 (Internal Interface)**

##### **`generateOrRevise(contextPackage: ContextPackage, generationMode: string, currentContent: string) -> FinalDocument`**
*   **描述:** 这是本组件的唯一入口点。它根据 `generationMode` 决定执行流程。
*   **输入:**
    *   `contextPackage` (`ContextPackage`): 由 `DP2_DP5.2` 聚合的完整上下文包。
    *   `generationMode` (string): `FROM_SCRATCH` 或 `REVISION`。
    *   `currentContent` (string): 待修订的当前文档内容。在 `REVISION` 模式下必需。
*   **输出:**
    *   `FinalDocument` (string): 最终生成或修订后的、干净的 Markdown 文档内容。
*   **异常处理:** 参见第6节“错误处理机制”。

#### **4. 内部数据模型**

*   **`RevisionPlan` (内部数据模型):**
    *   **描述:** 在阶段一生成、在阶段二和三消费的结构化修订计划。
    *   **格式:** 一个 Markdown 格式的字符串，包含一个有序或无序列表。列表中的每一项都应是一个清晰、可操作的修订指令。例如：
        ```markdown
        - **回应批注 prev-001:** 在“设计哲学”部分，增加对“纯函数”概念的阐述。
        - **解决发现 find-001:** 重构L2设计矩阵，引入新的DP以消除FR2对DP3的依赖。
        ```
*   **`InitialDraft` (内部数据模型):**
    *   **描述:** 在阶段二生成的初步修订稿。可能包含LLM的额外注释或未完全清理的格式。
    *   **格式:** 字符串。

#### **5. 核心处理逻辑 (Core Processing Logic)**

以下是 `generateOrRevise` 函数必须遵循的伪代码逻辑。

```
Function generateOrRevise(contextPackage, generationMode, currentContent) -> FinalDocument {

  if (generationMode == "REVISION") {
    // 执行完整的三阶段思维链
    // 阶段一: 分析与规划
    planningPrompt = build_planning_prompt(contextPackage.reviewFeedback, contextPackage.priorityRevisions, currentContent);
    revisionPlan = call_llm_adapter(planningPrompt); // 返回 RevisionPlan 字符串

    // 阶段二: 执行与生成
    executionPrompt = build_execution_prompt(revisionPlan, contextPackage, currentContent);
    initialDraft = call_llm_adapter(executionPrompt); // 返回 InitialDraft 字符串

    // 阶段三: 自省与提炼
    refinementPrompt = build_refinement_prompt(revisionPlan, initialDraft);
    finalDocument = call_llm_adapter(refinementPrompt); // 返回 FinalDocument 字符串
    
    return finalDocument;

  } else if (generationMode == "FROM_SCRATCH") {
    // 简化流程：直接执行生成，然后提炼
    // 阶段二 (变体): 从零撰写
    executionPrompt = build_from_scratch_prompt(contextPackage);
    initialDraft = call_llm_adapter(executionPrompt);

    // 阶段三: 自省与提炼 (可选但推荐)
    refinementPrompt = build_self_correction_prompt_for_scratch(initialDraft, contextPackage);
    finalDocument = call_llm_adapter(refinementPrompt);
    
    return finalDocument;
  }
}
```

#### **6. Prompt 结构模板**

为确保确定性，所有 Prompt 的构建**必须**遵循以下模板。模板中的 `{{...}}` 表示将被替换为实际数据的占位符。

##### **6.1. 阶段一：规划 Prompt (`PLANNING_PROMPT_TEMPLATE`)**
```markdown
# 指令：分析与规划

## 你的角色
你是一名经验丰富的项目经理和技术编辑。你的任务是分析所有针对一份技术文档的审查意见和用户评论，并制定一份清晰、简洁、可执行的修订计划。

## 任务
1.  仔细阅读“当前文档内容”、“结构化审查意见”和“用户即时批注”三个部分。
2.  识别出所有需要修改的关键点。
3.  生成一份 **Markdown 格式的无序列表** 作为修订计划。
4.  计划中的每一项都必须是具体的、可操作的指令。
5.  你的输出 **只能包含** 这份 Markdown 格式的修订计划，不要添加任何额外的解释、问候或总结。

---

## 输入数据

### 当前文档内容
```markdown
{{currentContent}}
```

### 结构化审查意见 (来自 L1-DP6)
```json
{{contextPackage.reviewFeedback | to_json}}
```

### 用户即时批注 (来自 L1-DP8)
```json
{{contextPackage.priorityRevisions | to_json}}
```

---

## 你的输出 (仅修订计划):
```

##### **6.2. 阶段二：执行 Prompt (`EXECUTION_PROMPT_TEMPLATE`)**
```markdown
# 指令：执行与修订

## 你的角色
你是一名专业的系统架构师和技术文档撰写专家。你的任务是严格、精确地执行一份修订计划，以修改一份技术文档。

## 任务
1.  仔细阅读“修订计划”。这是你本次任务必须完成的所有工作。
2.  使用“当前文档内容”作为你的工作基础。
3.  在修订过程中，你 **必须** 遵循“项目词汇与约束”中的所有规则。
4.  你可以参考“上游依赖文档”和“相关知识片段”来获取必要的背景信息。
5.  你的输出 **只能是** 修订后的完整文档内容。不要包含任何关于你如何完成任务的评论、解释或元数据。

---

## 输入数据

### 1. 修订计划 (来自阶段一)
{{revisionPlan}}

### 2. 当前文档内容 (待修订)
```markdown
{{currentContent}}
```

### 3. 项目词汇与约束 (必须遵循)
```json
{{contextPackage.lexiconAndConstraints | to_json}}
```

### 4. 上游依赖文档 (供参考)
{{#each contextPackage.upstreamDocuments}}
#### {{this.uri}}
```markdown
{{this.content}}
```
{{/each}}

### 5. 相关知识片段 (供参考)
{{#each contextPackage.knowledgeFragments}}
- **来源: {{this.source}}**
  {{this.content}}
{{/each}}

---

## 你的输出 (仅修订后的完整文档):
```

##### **6.3. 阶段三：提炼 Prompt (`REFINEMENT_PROMPT_TEMPLATE`)**
```markdown
# 指令：自省与提炼

## 你的角色
你是一名一丝不苟的质量保证专家。你的任务是审查一份刚刚生成的文档草稿，确保它完美地执行了修订计划，并进行最终的清理和润色。

## 任务
1.  仔细阅读“原始修订计划”和“初步修订草稿”。
2.  逐项核对，确保草稿中的修改 **完全且准确** 地回应了计划中的每一点。
3.  检查草稿的格式是否干净、规范，是否存在任何不应出现的元注释或聊天内容。
4.  你的输出 **必须是最终的、完美的、可直接交付的** Markdown 文档内容。不要添加任何其他文字。

---

## 输入数据

### 原始修订计划
{{revisionPlan}}

### 初步修订草稿 (待审查和提炼)
```markdown
{{initialDraft}}
```

---

## 你的输出 (仅最终的、干净的文档):
```

#### **7. 错误处理机制 (Error Handling Mechanism)**

`DP2_DP5.3` 必须能够处理并向其调用者（`DP2_DP0`）抛出特定类型的异常，以便上层进行有效的错误处理。

*   **`LLMServiceException`:**
    *   **触发条件:** 当底层的 `call_llm_adapter` 无法从 LLM 服务获得有效响应时（例如，由于网络错误、API认证失败、服务超时或5xx服务器错误）。
    *   **目的:** 将与外部服务通信相关的问题明确分离出来，允许上层实现重试或熔断等策略。

*   **`MalformedLLMOutputException`:**
    *   **触发条件:** 当 LLM 的输出不符合预期的结构时。例如：
        *   在阶段一，输出不是一个可解析的 Markdown 列表。
        *   在任何阶段，输出包含了大量的对话式“噪音”，并且在提炼阶段后仍然无法被清理。
    *   **目的:** 允许上层调用者识别出这是 LLM 的一次性“幻觉”或不合作行为，可能会触发使用不同参数（如更高温度）的重试，或者在多次失败后将问题上报给用户进行仲裁。

---
Gemini 2.5 Pro 0605 writer