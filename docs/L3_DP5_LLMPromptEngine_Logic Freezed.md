好的，遵照指示。

我将根据我们刚刚达成的共识，对《DP2_DP5.3 LLM Prompt引擎 详细逻辑定义》进行修订。本次修订的核心是采纳关于为不同阶段的LLM角色设定差异化专业知识背景的建议，以进一步优化输出质量和流程的健壮性。

以下是本次工作的产出文档 V1.3。

---

### **DP2_DP5.3 LLM Prompt引擎 详细逻辑定义 (V1.3)**

**状态:** 已批准(Approved)

**版本说明:** 本文档 (V1.3) 是对 V1.2 版本的进一步优化。核心变更如下：
1.  **优化角色设定 (Persona Optimization):** 依据对不同阶段任务特性的分析，为阶段一（规划）和阶段二（执行）的LLM角色显式注入了“精通公理设计和函数式编程”的专业知识背景，旨在提升LLM对专业术语的理解能力和内容生成的专业质量。为确保流程的确定性与收敛性，阶段三（提炼）的角色定义保持不变，继续强调其“质量保证”而非“领域专家”的职责。
2.  **(继承自V1.2)** **强化验证逻辑 (M-4):** 依据评审指令，对 `validate_and_parse_plan` 函数进行了彻底的细化。原先的 `TODO` 注释已被替换为明确的**“两步验证”**逻辑。该函数现在**必须**先执行JSON解析，再执行严格的**Schema验证**。任何一步的失败都将导致抛出 `MalformedLLMOutputException` 异常。

#### **1. 引言**

本文档详细定义了“内容生成与修订引擎”子系统内部的 `DP2_DP5.3: LLM Prompt引擎与适配器` 组件。该组件位于内容生成流水线的核心位置，其上游是 `DP2_DP5.2: 上下文聚合器`，下游是 `DP2_DP5.4: 输出文档封装器`。

本组件的核心职责是：**将结构化的 `ContextPackage` 对象，转换为一个或多个高质量的、可供大型语言模型（LLM）执行的提示（Prompts）**。它封装了所有与 Prompt 工程相关的复杂性，包括 Prompt 的构建策略、上下文信息的组织、以及与 LLM 模型的具体交互逻辑。

**设计依据:**
*   《公理设计辅助系统 L2 公理设计文档 (子系统：内容生成与修订引擎) (V1.0)》 (父级设计)
*   《评审意见报告：关于<DP2_DP5.3 LLM Prompt引擎 详细逻辑定义 (V1.1)>》
*   《DP2_DP5.2 上下文聚合器 内部接口与逻辑定义 (V1.2)》 (上游组件规范)

#### **2. 核心设计哲学：三阶段思维链 (Three-Stage Chain-of-Thought)**

为了处理复杂的修订任务，本引擎**必须**采用一种健壮的 **“三阶段思维链 (Three-Stage Chain-of-Thought)”** 策略。该策略将复杂的修订任务分解为三个逻辑上独立的、连续的LLM调用步骤：

1.  **阶段一：分析与规划 (Analysis & Planning):** LLM分析所有输入，生成一份**结构化的JSON修订计划**。
2.  **阶段二：执行与生成 (Execution & Generation):** LLM依据该JSON计划，对文档进行修订。
3.  **阶段三：自省与提炼 (Self-Correction & Refinement):** LLM对照JSON计划，检查并润色草稿，确保交付质量。

这种设计将一个复杂的任务分解为三个更小、职责更单一的任务，并通过在步骤间传递结构化数据，显著提高了最终输出的准确性、一致性和可控性。

#### **3. 接口定义 (Internal Interface)**

##### **`generateOrRevise(contextPackage: ContextPackage, generationMode: string, currentContent: string) -> FinalDocument`**
*   **描述:** 这是本组件的唯一入口点。它根据 `generationMode` 决定执行流程。
*   **输入:**
    *   `contextPackage` (`ContextPackage`): 由 `DP2_DP5.2` 聚合的完整上下文包。
    *   `generationMode` (string): `FROM_SCRATCH` 或 `REVISION`。
    *   `currentContent` (string): 待修订的当前文档内容。在 `REVISION` 模式下必需。
*   **输出:**
    *   `FinalDocument` (string): 最终生成或修订后的、干净的 Markdown 文档内容。
*   **异常处理:** 参见第8节“错误处理机制”。

#### **4. 内部数据模型**

*   **`StructuredRevisionPlan` (内部数据模型):**
    *   **描述:** 在阶段一生成、在后续阶段消费的结构化修订计划。
    *   **格式:** 一个必须符合以下结构的JSON对象：
        ```json
        {
          "plan": [
            {
              "instruction_id": "string",
              "instruction_text": "string"
            }
          ]
        }
        ```
*   **`InitialDraft` (内部数据模型):**
    *   **描述:** 在阶段二生成的初步修订稿。
    *   **格式:** 字符串。

#### **5. 核心处理逻辑 (Core Processing Logic)**

以下是 `generateOrRevise` 函数必须遵循的伪代码逻辑。

```
Function generateOrRevise(contextPackage, generationMode, currentContent) -> FinalDocument {

  if (generationMode == "REVISION") {
    // 执行完整的三阶段思维链
    // 阶段一: 分析与规划
    planningPrompt = build_planning_prompt(contextPackage.reviewFeedback, contextPackage.priorityRevisions, currentContent);
    rawPlanningOutput = call_llm_adapter(planningPrompt, LLM_CONFIG_STAGE_1);
    
    // 验证与解析步骤
    structuredPlan = validate_and_parse_plan(rawPlanningOutput); // Throws MalformedLLMOutputException on failure

    // 阶段二: 执行与生成
    executionPrompt = build_execution_prompt(structuredPlan, contextPackage, currentContent);
    initialDraft = call_llm_adapter(executionPrompt, LLM_CONFIG_STAGE_2);

    // 阶段三: 自省与提炼
    refinementPrompt = build_refinement_prompt(structuredPlan, initialDraft);
    finalDocument = call_llm_adapter(refinementPrompt, LLM_CONFIG_STAGE_3);
    
    return finalDocument;

  } else if (generationMode == "FROM_SCRATCH") {
    // 执行确定的两阶段流程
    // 阶段一 (变体): 从零撰写
    executionPrompt = build_from_scratch_prompt(contextPackage);
    initialDraft = call_llm_adapter(executionPrompt, LLM_CONFIG_STAGE_2); // Re-use Stage 2 config for creative writing

    // 阶段二 (变体): 自省与提炼
    refinementPrompt = build_self_correction_prompt_for_scratch(initialDraft, contextPackage);
    finalDocument = call_llm_adapter(refinementPrompt, LLM_CONFIG_STAGE_3); // Re-use Stage 3 config for refinement
    
    return finalDocument;
  }
}

Function validate_and_parse_plan(rawOutput: string) -> StructuredRevisionPlan {
  
  // 步骤 0 (可选但推荐): 清理常见LLM输出包裹
  let cleanedOutput = rawOutput.trim().replace(/^```json\n/, '').replace(/\n```$/, '');

  // 步骤 1: JSON 解析
  let parsedJson;
  try {
    parsedJson = JSON.parse(cleanedOutput);
  } catch (parseError) {
    throw new MalformedLLMOutputException("LLM输出解析失败：无法将原始输出解析为合法的JSON对象。原因: " + parseError.message);
  }

  // 步骤 2: Schema 验证
  // 假设 `structuredRevisionPlanSchema` 是一个预定义的、符合JSON Schema规范的对象，
  // 并且 `validator` 是一个实现了标准JSON Schema验证逻辑的库实例。
  const isValid = validator.validate(parsedJson, structuredRevisionPlanSchema);
  if (!isValid) {
    // 将验证器的详细错误信息打包，以提供更具诊断价值的异常报告
    const validationErrors = validator.errors.map(e => `${e.instancePath || 'root'} ${e.message}`).join('; ');
    throw new MalformedLLMOutputException("LLM输出验证失败：JSON对象结构不符合 StructuredRevisionPlan 的既定Schema。错误详情: " + validationErrors);
  }

  return parsedJson;
}
```

#### **6. LLM 调用配置 (LLM Call Configuration)**

为了确保行为的确定性，对 `call_llm_adapter` 的调用**必须**传递明确的超参数配置。

##### **6.1 `LLMCallParameters` 数据结构**
```json
{
  "modelId": "string",
  "temperature": "number (0.0 to 1.0)",
  "top_p": "number",
  "max_output_tokens": "integer"
}
```

##### **6.2 各阶段固定配置**
*   **`LLM_CONFIG_STAGE_1` (分析与规划):**
    *   **目标:** 确保输出是结构严谨、逻辑清晰的JSON。
    *   **配置:** `{ "modelId": "gemini-1.5-pro-latest", "temperature": 0.1, "top_p": 0.8, "max_output_tokens": 2048 }`
*   **`LLM_CONFIG_STAGE_2` (执行与生成):**
    *   **目标:** 在严格遵循计划的前提下，保证生成文本的流畅和自然。
    *   **配置:** `{ "modelId": "gemini-1.5-pro-latest", "temperature": 0.6, "top_p": 0.9, "max_output_tokens": 8192 }`
*   **`LLM_CONFIG_STAGE_3` (自省与提炼):**
    *   **目标:** 精确地进行自我修正和格式清理，避免引入新的创意。
    *   **配置:** `{ "modelId": "gemini-1.5-pro-latest", "temperature": 0.2, "top_p": 0.8, "max_output_tokens": 8192 }`

#### **7. Prompt 结构模板**

为确保确定性，所有 Prompt 的构建**必须**遵循以下模板。

##### **7.1. 阶段一：规划 Prompt (`PLANNING_PROMPT_TEMPLATE`)**
```markdown
# 指令：分析与规划

## 你的角色
你是一名精通公理设计和函数式编程的、经验丰富的项目经理与技术编辑。你的任务是分析所有针对一份技术文档的审查意见和用户评论，并制定一份结构化的JSON修订计划。

## 任务
1.  仔细阅读“当前文档内容”、“结构化审查意见”和“用户即时批注”三个部分。
2.  识别出所有需要修改的关键点。
3.  生成一份 **严格符合以下JSON Schema的JSON对象** 作为修订计划。
4.  你的输出 **只能包含** 这份JSON对象，不要添加任何额外的解释、问候、总结或Markdown代码块标记。

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

## 输出JSON Schema
```json
{
  "plan": [
    {
      "instruction_id": "一个唯一的字符串，例如 'response_to_find-001' 或 'response_to_prev-002'",
      "instruction_text": "一个清晰、可操作的修订指令，例如 '重构L2设计矩阵，引入新的DP以消除FR2对DP3的依赖。'"
    }
  ]
}
```

## 你的输出 (仅JSON对象):
```

##### **7.2. 阶段二：执行 Prompt (`EXECUTION_PROMPT_TEMPLATE`)**
```markdown
# 指令：执行与修订

## 你的角色
你是一名精通公理设计和函数式编程的、专业的系统架构师和技术文档撰写专家。你的任务是严格、精确地执行一份JSON格式的修订计划，以修改一份技术文档。

## 任务
1.  仔细阅读JSON格式的“修订计划”。这是你本次任务必须完成的所有工作。
2.  使用“当前文档内容”作为你的工作基础。
3.  在修订过程中，你 **必须** 遵循“项目词汇与约束”中的所有规则。
4.  你可以参考“上游依赖文档”和“相关知识片段”来获取必要的背景信息。
5.  你的输出 **只能是** 修订后的完整文档内容。不要包含任何关于你如何完成任务的评论、解释或元数据。

---

## 输入数据

### 1. 修订计划 (来自阶段一)
```json
{{structuredRevisionPlan | to_json}}```

### 2. 当前文档内容 (待修订)
```markdown
{{currentContent}}
```

### 3. 项目词汇与约束 (必须遵循)
#### 术语表
- **Design Matrix:** A matrix that maps Functional Requirements (FRs) to Design Parameters (DPs).
- **Frozen Document:** A document that has been approved and is now locked as a baseline.
#### 命名约定
- L2设计文档必须以 `AD_L2_` 开头。

### 4. 上游依赖文档 (供参考)
...

### 5. 相关知识片段 (供参考)
...

---

## 你的输出 (仅修订后的完整文档):
```

##### **7.3. 阶段三：提炼 Prompt (`REFINEMENT_PROMPT_TEMPLATE`)**
```markdown
# 指令：自省与提炼

## 你的角色
你是一名一丝不苟的质量保证专家。你的任务是审查一份刚刚生成的文档草稿，确保它完美地执行了JSON格式的修订计划，并进行最终的清理和润色。

## 任务
1.  仔细阅读“原始修订计划”和“初步修订草稿”。
2.  逐项核对，确保草稿中的修改 **完全且准确** 地回应了计划中的每一点。
3.  检查草稿的格式是否干净、规范，是否存在任何不应出现的元注释或聊天内容。
4.  你的输出 **必须是最终的、完美的、可直接交付的** Markdown 文档内容。不要添加任何其他文字。

---

## 输入数据

### 原始修订计划
```json
{{structuredRevisionPlan | to_json}}
```

### 初步修订草稿 (待审查和提炼)
```markdown
{{initialDraft}}
```

---

## 你的输出 (仅最终的、干净的文档):
```

#### **8. 错误处理机制 (Error Handling Mechanism)**

`DP2_DP5.3` 必须能够处理并向其调用者（`DP2_DP0`）抛出特定类型的异常。

*   **`LLMServiceException`:**
    *   **触发条件:** 当底层的 `call_llm_adapter` 无法从 LLM 服务获得有效响应时（网络错误、API认证失败、服务超时等）。
*   **`MalformedLLMOutputException`:**
    *   **触发条件:** 当 LLM 的输出不符合预期的结构时。**特别是，在阶段一，如果其输出在 `validate_and_parse_plan` 函数中发生以下任一情况，则必须抛出此异常：1) 无法被解析为有效的JSON对象；2) 解析成功但未能通过针对 `StructuredRevisionPlan` Schema 的结构验证。**
    *   **目的:** 允许上层调用者识别出这是 LLM 的一次性“幻觉”或不合作行为，可触发重试或上报用户仲裁。

---
Gemini 2.5 Pro 0605 writer