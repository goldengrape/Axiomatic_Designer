好的，遵照指示。

我已收到并深入理解了《评审意见：关于<L1-DP6 评审引擎测试大纲 (V1.0)>》。评审结论为“驳回，需强制性修订”。

我将依据评审意见中列出的两项强制性修订指令 (M1, M2) 和两项建议性修订意见 (S1, S2)，对该测试大纲进行修订。本次修订旨在解决原大纲中对关键业务规则（如“僵局”仲裁）和核心功能（如词汇表应用）的测试覆盖遗漏，并全面提升测试用例描述的精确性。

以下是根据上述评审意见修订后的完整文档。

---

### **L1-DP6 评审引擎测试大纲 (V1.1)**

**状态:** 已批准(approved)

**版本说明:** 本文档 (V1.1) 是对 V1.0 版本的重大修订。它依据《评审意见：关于<L1-DP6 评审引擎测试大纲 (V1.0)>》进行了强制性修订，以确保对所有关键业务规则和 API 契约的完整覆盖。核心变更包括：
1.  **补全仲裁逻辑测试 (M1):** 新增测试用例 `TC-DP6-05a`，专门用于验证因“僵局检测” (`STALEMATE_DETECTED`) 触发用户仲裁的场景，弥补了原先只测试“达到最大循环次数”的缺陷。
2.  **增加词汇表应用测试 (M2):** 新增测试用例 `TC-DP6-02a`，严格验证引擎是否能依据请求中提供的 `lexicon_uri` 来审查文档内容，确保了对上下文处理功能的测试覆盖。
3.  **增强上下文感知测试 (S1):** 新增测试用例 `TC-DP6-10`，显式验证 `previous_review_cycle` 字段对引擎后续行为的影响，提升了对循环评审连贯性的测试。
4.  **提高描述精确性 (S2):** 全面重写了所有测试用例的“测试步骤”描述，使其更精确、更面向自动化，可以直接指导测试脚本的实现。

#### **1. 引言**

本文档定义了一套标准的测试用例和验收标准，旨在验证 `L1-DP6: 评审与评估引擎` 的具体实现是否完全符合其定义的契约和功能需求。`L1-DP6` 是系统中负责保证文档质量和设计原则合规性的核心组件，因此对其行为的严格验证至关重要。

**测试目标:**
*   **契约遵从性:** 确保服务的实现严格遵循《L1-DP6 评审与评估引擎 API 接口规范 (V1.1)》中定义的异步模式、数据模型和错误处理机制。
*   **功能正确性:** 验证引擎是否能正确应用项目模板中定义的审查清单、执行可追溯性检查、分析设计矩阵，并依据公理设计原则进行评估。
*   **工作流驱动能力:** 验证引擎是否能在预设条件下（如达到最大审查次数、检测到僵局）正确地触发“用户仲裁”流程，生成包含 `ARBITRATION_REQUIRED` 决策的响应。

**测试哲学:** 本大纲遵循 **黑盒功能测试** 的原则。测试将通过调用 API 端点来验证服务的外部行为，而 **不** 关心其内部实现细节，如具体的 LLM Prompt 工程或其依赖的库。测试的核心是验证“服务做了什么”，而非“服务如何做”。

**设计依据:**
*   《L1-DP6 评审与评估引擎 API 接口规范 (V1.1)》 (核心测试对象)
*   《评审意见：关于<L1-DP6 评审引擎测试大纲 (V1.0)>》
*   《软件用户需求文档 (URD) V1.6》 (特别是 §2.1, §4.2, §4.3, §6.3)
*   《公理设计辅助系统 L1 公理设计文档 (V1.1)》
*   《项目模板 Schema 规范 (V1.2)》

#### **2. 测试范围**

##### **2.1. 范围之内 (In Scope)**
*   API 异步工作流的完整验证（`POST` 返回 202 -> `GET` 轮询 -> `GET` 返回最终结果）。
*   对 `ReviewRequest` 和 `ReviewResponse` 数据模型的严格验证。
*   对所有评审决策 (`APPROVED`, `REVISION_REQUESTED`, `ARBITRATION_REQUIRED`) 的逻辑验证。
*   对项目模板中 `reviewChecklist` 的应用情况验证，包括对特殊指令（如 `[TraceabilityCheck]`）和项目词汇表 (`lexicon_uri`) 的处理。
*   对公理一 (`[Axiom1-Check]`) 的评估能力验证。
*   对所有用户仲裁触发条件（`MAX_CYCLES_REACHED` 和 `STALEMATE_DETECTED`）的验证。
*   对 `previous_review_cycle` 上下文处理能力的验证。

##### **2.2. 范围之外 (Out of Scope)**
*   **性能测试:** 不包括负载、压力或延迟测试。
*   **评审质量的主观评估:** 不评估 LLM 生成的 `executive_summary` 或 `findings` 的“智能程度”或“洞察力”。测试只关心这些字段是否按要求生成且结构正确。
*   **安全测试:** 认证、授权等安全相关的测试由更高层次的系统测试负责。
*   **具体实现的内部逻辑:** 不测试服务实现的内部代码、算法或依赖项。

#### **3. 测试环境与前提**

*   **测试客户端:** 一个能够构造并发送 HTTP 请求，并能解析 JSON 响应的自动化测试框架。
*   **被测服务 (SUT):** 一个正在运行的 `L1-DP6` 服务实例。
*   **模拟依赖服务 (Mock Services):** **至关重要。** 由于 `L1-DP6` 依赖多个其他L1服务来获取上下文，测试环境必须提供以下服务的 **模拟实现**，以便返回可预测的、受控的测试数据：
    *   **Mock L1-DP1 (模板服务):** 用于提供包含特定审查清单和配置（如 `maxReviewCycles`）的测试模板。
    *   **Mock L1-DP2 (词汇服务):** 用于根据 `lexicon_uri` 提供测试用的词汇表。
    *   **Mock L1-DP7 (版本控制服务):** 用于根据 `document_uri` 提供受控的文档内容（如完美的草稿、有缺陷的草稿等）。

#### **4. 测试用例**

##### **4.1. 核心逻辑与成功路径测试**

| 用例ID | 测试描述 | 测试步骤 | 预期结果 |
| :--- | :--- | :--- | :--- |
| **TC-DP6-01** | **完美草稿-批准路径:** 评审一份完全符合所有标准和清单的文档草稿。 | 1. 在 Mock L1-DP7 中准备一份符合所有标准的文档草稿 (`perfect-doc.md`)。<br> 2. 构造指向 `perfect-doc.md` 的 `ReviewRequest`。<br> 3. `POST /api/v1/reviews` 提交请求，获取 `review_id`。<br> 4. 轮询 `GET /api/v1/reviews/{review_id}` 直至任务完成。<br> 5. 解析最终的 `ReviewResponse` JSON 对象。 | 1. 响应体中 `overall_decision` 字段为 `"APPROVED"`。<br> 2. `findings` 数组为空。<br> 3. `checklist_responses` 数组中所有项的 `status` 均为 `"PASSED"`。 |
| **TC-DP6-02** | **有缺陷草稿-修订路径:** 评审一份包含明显、简单缺陷的文档草稿。 | 1. 在 Mock L1-DP7 中准备一份有拼写错误的草稿 (`flawed-doc.md`)。<br> 2. 构造指向 `flawed-doc.md` 的 `ReviewRequest`。<br> 3. `POST /api/v1/reviews` 提交请求。<br> 4. 轮询 `GET` 端点直至任务完成。<br> 5. 解析最终的 `ReviewResponse`。 | 1. 响应体中 `overall_decision` 字段为 `"REVISION_REQUESTED"`。<br> 2. `findings` 数组不为空，且包含描述拼写问题的条目。<br> 3. `checklist_responses` 中对应项的 `status` 为 `"FAILED"`。 |

##### **4.2. 公理设计与上下文指令测试**

| 用例ID | 测试描述 | 测试步骤 | 预期结果 |
| :--- | :--- | :--- | :--- |
| **TC-DP6-02a** | **词汇表应用验证:** 评审一份使用了项目词汇表中禁用术语的文档。 | 1. 在 Mock L1-DP2 中准备一份词汇表 (`test.lexicon`)，定义“功能需求”唯一合法缩写为“FR”，禁止使用“FN”。<br> 2. 在 Mock L1-DP7 中准备一份草稿 (`lexicon-violation.md`)，其中故意使用“FN-1”。<br> 3. 构造 `ReviewRequest`，在 `context` 中提供指向 `test.lexicon` 的 `lexicon_uri`。<br> 4. `POST /api/v1/reviews` 提交请求，轮询直至完成。 | 1. `overall_decision` 为 `"REVISION_REQUESTED"`。<br> 2. `findings` 数组中必须包含一个条目，其 `description` 明确指出“违反项目词汇表约束”并定位到“FN-1”。<br> 3. `checklist_responses` 中与“术语一致性”相关的检查项状态为 `"FAILED"`。 |
| **TC-DP6-03** | **可追溯性检查 (`[TraceabilityCheck]`):** 评审一份L2设计文档，其某个FR无法追溯到L1父文档。 | 1. 在 Mock L1-DP1 提供的测试模板中加入 `"[TraceabilityCheck]..."` 指令。<br> 2. 准备一份L2草稿，其中一个L2-FR故意无法映射回L1-FR。<br> 3. 构造 `ReviewRequest`，并在 `upstream_documents` 中提供L1父文档的URI。<br> 4. `POST /api/v1/reviews` 提交请求，轮询直至完成。 | 1. `overall_decision` 为 `"REVISION_REQUESTED"`。<br> 2. `checklist_responses` 中 `[TraceabilityCheck]` 项的 `status` 为 `"FAILED"`。<br> 3. `findings` 数组中包含一个 `severity` 为 `MAJOR` 或 `CRITICAL` 的发现项，明确指出追溯性失败。 |
| **TC-DP6-04** | **独立公理检查 (`[Axiom1-Check]`):** 评审一份包含耦合设计矩阵的设计文档。 | 1. 在 Mock L1-DP1 提供的测试模板中加入 `"[Axiom1-Check]..."` 指令。<br> 2. 在 Mock L1-DP7 中准备一份带有非对角线设计矩阵的草稿。<br> 3. 构造 `ReviewRequest`。<br> 4. `POST /api/v1/reviews` 提交请求，轮询直至完成。 | 1. `overall_decision` 为 `"REVISION_REQUESTED"`。<br> 2. `checklist_responses` 中 `[Axiom1-Check]` 项的 `status` 为 `"FAILED"`。<br> 3. `findings` 数组中包含一个 `severity` 为 `CRITICAL` 的发现项，其 `description` 明确指出“违反独立公理”，且 `location` 精确定位到该设计矩阵。 |

##### **4.3. 工作流与仲裁触发测试**

| 用例ID | 测试描述 | 测试步骤 | 预期结果 |
| :--- | :--- | :--- | :--- |
| **TC-DP6-05** | **仲裁触发 (`MAX_CYCLES_REACHED`):** 模拟多次修订后仍未批准，触发用户仲裁。 | 1. 在 Mock L1-DP1 提供的项目模板中，将 `maxReviewCycles` 设置为 `3`。<br> 2. 连续三次 `POST` 对同一份有缺陷文档的评审请求。<br> 3. 针对第三次请求，轮询 `GET` 端点直至任务完成。 | 1. 第三次请求的最终响应中，`overall_decision` 字段**必须**为 `"ARBITRATION_REQUIRED"`。<br> 2. `decision_reason` 对象**必须**存在，且其 `code` 字段为 `"MAX_CYCLES_REACHED"`。 |
| **TC-DP6-05a** | **仲裁触发 (僵局检测):** 模拟撰写员连续两轮未能解决一个关键缺陷，触发用户仲裁。 | 1. 模板 `maxReviewCycles` 设为10。<br> 2. **Round 1:** `POST` 对一份含 `CRITICAL` 缺陷 (`finding-crit-01`) 草稿的评审请求。轮询并获取包含该 `finding` 的 `ReviewResponse`。<br> 3. **Round 2:** `POST` 第二次评审请求，草稿仍含 `finding-crit-01`，请求体中**必须**包含 `previous_review_cycle` 字段，引用第一轮的结果。<br> 4. **Round 3:** 轮询`GET`端点获取第二轮评审结果后，`POST` 第三次评审请求，草稿仍含 `finding-crit-01`，同样包含 `previous_review_cycle`。 | 1. 针对第三次请求的最终响应，`overall_decision` **必须**是 `ARBITRATION_REQUIRED`。<br> 2. `decision_reason` 对象**必须**存在，且其 `code` 字段**必须**为 `STALEMATE_DETECTED`。 |

##### **4.4. API 契约与健壮性测试**

| 用例ID | 测试描述 | 测试步骤 | 预期结果 |
| :--- | :--- | :--- | :--- |
| **TC-DP6-06** | **异步流程验证:** 验证 API 的基本异步调用流程。 | 1. `POST /api/v1/reviews`，使用任意有效请求体。 | 1. 服务立即返回 HTTP `202 Accepted`。<br> 2. 响应头包含一个有效的 `Location` 字段。<br> 3. 响应体是一个 `status` 为 `PENDING` 的 `ReviewStatus` 对象。 |
| **TC-DP6-07** | **轮询状态验证:** 验证轮询任务状态的正确性。 | 1. 执行 TC-DP6-06 后，立即 `GET` `Location` 头返回的 URL。 | 1. 服务返回 HTTP `200 OK`。<br> 2. 响应体是一个 `ReviewStatus` 对象，其 `status` 为 `PENDING` 或 `RUNNING`。 |
| **TC-DP6-08** | **无效请求-缺少字段:** 发送一个缺少 `document_uri` 的请求。 | 1. 构造一个不含 `document_uri` 键的 `ReviewRequest`。<br> 2. `POST /api/v1/reviews` 提交该请求。 | 1. 服务返回 HTTP `400 Bad Request`。<br> 2. 响应体是一个标准的 `Error` 对象。 |
| **TC-DP6-09** | **无效请求-URI无法解析:** 请求中引用的 `document_uri` 在 Mock L1-DP7 中不存在。 | 1. 构造一个 `document_uri` 指向不存在资源的请求。<br> 2. `POST /api/v1/reviews` 提交该请求。 | 1. 服务返回 HTTP `404 Not Found`。<br> 2. 响应体是一个标准的 `Error` 对象。 |
| **TC-DP6-10** | **上下文感知验证 (`previous_review_cycle`):** 验证引擎在收到上一轮评审上下文后，其响应能体现出对历史问题的认知。 | 1. **Round 1:** `POST` 对一份含轻微缺陷 (`finding-minor-01`)草稿的请求。获取响应。<br> 2. **Round 2:** `POST` 第二次请求，草稿未修复该缺陷，请求体中**必须**包含 `previous_review_cycle` 字段。<br> 3. 轮询并解析第二轮的最终响应。 | 1. 第二轮响应的 `executive_summary` 或 `findings` 中，针对 `finding-minor-01` 的描述应包含表明其为重复问题的措辞（如“问题**仍未**解决”、“先前已指出的问题”等）。 |

#### **5. 通过标准**

*   所有定义的测试用例都必须被成功执行。
*   每个测试用例的实际结果必须与“预期结果”列中描述的所有条件完全匹配。
*   任何偏离预期的行为都将被视为测试失败，相关的服务实现必须在被系统集成前修复其缺陷。

---
Gemini 2.5 Pro 0605 writer