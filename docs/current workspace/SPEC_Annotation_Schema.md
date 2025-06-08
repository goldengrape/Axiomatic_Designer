好的，遵照指示。

我将根据《项目代办事项列表 (V2.6)》中的下一个待办任务，开始撰写《即时反馈批注 (priority_revisions.md) 数据结构与锚点机制规范》。

本次工作的目标是定义一个标准化的文件格式，用于存储用户通过“即时反馈接口”提交的批注。这份规范将详细阐述其数据结构，并重点说明在《软件用户需求文档 (URD) V1.6》§7.3中强制要求的、用于保证定位鲁棒性的“上下文片段锚点”机制。这份文件将作为“撰写员”(L1-DP5) 执行高优先级修订任务的核心输入。

---

### **即时反馈批注 (priority_revisions.md) 数据结构与锚点机制规范 (V1.0)**

**状态:** 草案

**版本说明:** 本文档 (V1.0) 是该规范的初版。其目的是为用户通过“即时反馈接口”提交的批注内容，定义一个标准化的、可被机器解析的、基于 Markdown 的文件格式 (`priority_revisions.md`)。

#### **1. 引言**

本文档详细定义了“即时反馈批注”文件 (`priority_revisions.md`) 的标准结构。该文件由 `L1-DP8: 用户命令与控制` 模块根据用户的即时反馈操作动态生成，并作为具有最高优先级的输入，提供给 `L1-DP5: 内容生成与修订引擎` 来指导其修订工作。

**设计目标:**
*   **鲁棒定位 (Robust Positioning):** 核心设计目标是实现 URD §7.3 中要求的、不依赖于脆弱的行号的鲁棒定位机制。本规范通过“上下文片段锚点”来实现此目标。
*   **机器可解析性 (Machine-Parsable):** 文件必须具有清晰的结构，以便 `L1-DP5` 能够确定性地解析出每一条批注及其关联的上下文。
*   **人类可读性 (Human-Readable):** 文件格式应足够清晰，以便于开发者或审计人员进行调试和审查。

本规范将 `L1-DP8` API (`POST /api/v1/annotations`) 捕获的单条批注数据，聚合到一个单一的 Markdown 文件中。文件结构通过 **YAML Front Matter** 和 **标准化的 Markdown 块** 来实现。

**设计依据:**
*   《软件用户需求文档 (URD) V1.6》 (特别是 §7.3 对锚点机制的要求, §2.1 对 `priority_revisions.md` 的定义)
*   《L1-DP8 用户命令与控制 API 接口规范 (V1.0)》 (本规范是其 `Annotation` 数据模型的持久化格式)
*   《项目代办事项列表 (V2.6)》

#### **2. 文件结构定义**

`priority_revisions.md` 文件由两部分组成：一个 YAML Front Matter 块和一个 Markdown 正文。

##### **2.1. YAML Front Matter**

此部分包含了适用于文件中所有批注的通用元数据。它必须位于文件的最顶部，并由三条短划线 (`---`) 包围。

| 键 (Key) | 类型 | 是否必需 | 描述 |
| :--- | :--- | :--- | :--- |
| `schema_version` | string | 是 | 本批注文件 Schema 的版本号。本文档定义为 "1.0"。 |
| `target_document_uri` | string | 是 | 所有批注所针对的目标文档的唯一版本化URI。 |
| `generated_at` | string | 是 | 本批注文件的生成时间戳 (ISO 8601格式)。 |

##### **2.2. Markdown 正文 (Body)**

正文部分使用标准的 Markdown 语法，以列表的形式组织一条或多条批注。每一条批注都是一个独立的、结构化的内容块。

*   **一级标题 (`#`):** `即时反馈批注`

*   **批注条目 (Annotation Item):**
    *   每一条批注都由一个二级标题 (`##`) 开始，并包含一个唯一的、顺序生成的ID，便于引用和追踪。
    *   **二级标题 (`##`):** `批注: <annotation_id>` (例如: `## 批注: annotation-001`)

*   **批注详情 (Annotation Details):**
    *   在二级标题下，使用定义列表或键值对的形式展示批注的具体信息。
        *   **作者 (Author):** 提交此批注的用户ID。
        *   **批注内容 (Comment):** 用户输入的具体批注文本。

*   **定位锚点 (Context Anchor):**
    *   这是实现鲁棒定位的核心机制。它通过一个引用块 (`>`) 和一个代码块 (` ``` `) 来清晰地展示用户批注时所选中的上下文片段。
    *   `L1-DP5` 在执行修订时，**必须**使用此处的上下文片段，在 `target_document_uri` 指向的文档内容中进行模糊或精确匹配，以定位需要修订的具体位置。这种方法使得即使原文的行号发生变化，定位依然有效。
    *   **结构:**
        ```markdown
        > [!NOTE] 定位锚点 (Context Anchor)
        >
        > ```<language>
        > <target_context_snippet>
        > ```
        ```
        *   `<language>`: 上下文片段的语言类型 (如 `markdown`, `json`)，用于语法高亮，可选。
        *   `<target_context_snippet>`: `L1-DP8` API 捕获的、作为“锚点”的原始上下文片段。

#### **3. 完整示例**

以下是一个完整的 `priority_revisions.md` 文件示例。该文件包含了针对一份 L2 设计文档的两条不同批注。

```markdown
---
schema_version: "1.0"
target_document_uri: "vcs://project-gamma/docs/AD_L2_DP5.md?commit=b4e3a2f1"
generated_at: "2025-06-08T18:00:00Z"
---

# 即时反馈批注

## 批注: annotation-001

*   **作者 (Author):** `user-jane.doe`
*   **批注内容 (Comment):** 这里的“适配器”模式描述得不够清晰。请明确说明它要适配的是什么，以及它如何解决不同LLM接口的差异。

> [!NOTE] 定位锚点 (Context Anchor)
>
> ```markdown
> **DP3: LLM Prompt 引擎与适配器 (LLM Prompt Engine & Adapter)**
> *   职责：封装与具体LLM模型交互的全部复杂性。它接收“上下文包”，动态构建最优的Prompt，处理API调用、重试和错误处理逻辑，并返回LLM的原始响应。这是一个适配器，可以为不同的LLM（如Gemini, GPT等）提供不同的实现。
> ```

## 批注: annotation-002

*   **作者 (Author):** `user-john.smith`
*   **批注内容 (Comment):** “数据耦合”这个术语在这里使用可能不准确。这看起来更像是一个顺序处理的流水线（Pipeline），请确认术语的正确性，并与项目词汇表保持一致。

> [!NOTE] 定位锚点 (Context Anchor)
>
> ```markdown
> **数据耦合 (`O_d`):** 矩阵中的非对角线元素均为数据耦合，形成了一个清晰的、单向的数据流或“流水线”（Pipeline）。DP2依赖DP1的输出，DP3依赖DP2的输出，以此类推。
> ```

---
Gemini 2.5 Pro 0605 writer
```