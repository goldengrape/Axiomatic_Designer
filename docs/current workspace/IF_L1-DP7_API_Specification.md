好的，遵照指示。

我已收到并深入理解了《评审意见：关于<L1-DP7 版本控制与变更服务 API 接口规范 (V1.0)>》中下达的强制性修订指令。评审结论为“驳回，需强制性修订”。

我将依据评审意见中列出的两项强制性修订指令和两项建议性修订意见，对该 API 规范进行重大修订。本次修订旨在解决原设计中存在的、关于核心功能缺失和架构抽象泄漏的重大缺陷。

以下是根据上述评审意见修订后的完整文档。

---

### **L1-DP7 版本控制与变更服务 API 接口规范 (V1.1)**

**状态:** 修订

**版本说明:** 本文档 (V1.1) 是对 V1.0 版本的重大修订。它依据《评审意见：关于<L1-DP7 版本控制与变更服务 API 接口规范 (V1.0)>》进行了强制性修订，以解决核心功能缺失和架构抽象泄漏的问题。核心变更包括：
1.  **新增文档层级关系管理:** 新增了 `/metadata` 端点和 `DocumentMetadata` 数据模型，用于管理文档间的父子层级关系。此项变更是为了满足 URD §2.4.c 中对“之字形分解”可追溯性的核心需求，解决了 V1.0 中最重大的功能缺失。
2.  **封装实现细节 (消除抽象泄漏):** 重构了 `PUT .../state` 端点，从请求体中移除了 `tag_name` 字段。调用方现在只需声明“冻结”的业务意图，而无需关心底层的 Git 标签实现，这加强了服务的抽象和解耦。
3.  **增强 API 响应一致性:** 采纳了建议，将 `POST /api/v1/commits` 的响应更新为返回 `Location` 头和完整的 `VersionSummary` 对象，使其更符合 RESTful 实践。
4.  **明确临时分支生命周期:** 采纳了建议，在文档中明确指出用于变更管理的临时分支将在流程结束后被自动清理。

#### **1. 引言**

本文档详细定义了 `L1-DP7: 版本控制与变更服务` 的应用程序编程接口（API）。根据《公理设计辅助系统 L1 公理设计文档 (V1.1)》，`L1-DP7` 的核心职责是提供与外部 Git 仓库交互的标准接口，并实现文档状态管理和变更管理的核心逻辑。

本 API 的设计哲学是 **抽象化** 和 **面向资源**。它将 Git 的底层概念（如 commit, tree, blob, ref, tag）抽象为系统更高层级的业务概念，如 **文档 (Document)**、**版本 (Version)**、**元数据 (Metadata)**、**状态 (State)** 和 **变更提议 (Change Proposal)**。这使得调用方（如 `L1-DP0`, `L1-DP5`）可以不关心底层的 Git 实现细节。

**设计依据:**
*   《公理设计辅助系统 L1 公理设计文档 (V1.1)》
*   《软件用户需求文档 (URD) V1.6》 (特别是 §2.1, §2.4.c, §3.2, §7.1)
*   《评审意见：关于<L1-DP7 版本控制与变更服务 API 接口规范 (V1.0)>》

#### **2. API 通用约定**

*   **主机地址 (Base URL):** 本规范不定义具体的主机地址。在实际部署中，应通过服务发现机制或配置文件来提供。所有路径均基于此 Base URL。
*   **API 版本:** API 版本通过 URL 路径进行标识。本规范定义的版本为 `v1`。
    *   示例: `https://<hostname>/api/v1/...`
*   **数据格式:** 所有请求体（`Request Body`）和响应体（`Response Body`）均使用 `application/json` 格式，并采用 `UTF-8` 编码。
*   **认证与授权:** 本 API 要求所有请求**必须**同时包含**身份标识**和**认证凭据**。
    *   **认证方式 (Authentication):** 请求方必须在 HTTP Header 中提供一个承载秘密信息的 `Authorization` 字段。
        *   **值格式示例:** `Bearer <system_component_token>`
    *   **身份标识 (Identification):** 请求方必须在 HTTP Header 中提供 `X-System-Component-ID` 字段，其值为调用方组件的标识符（例如 `L1-DP0`）。
*   **路径编码:** 文档路径 `document_path` 在 URL 中必须进行标准的百分号编码（Percent-encoding）。
*   **错误处理:** API 使用标准的 HTTP 状态码。错误响应体应包含一个标准化的错误对象。

#### **3. 核心资源与数据模型**

##### **3.1. DocumentContent (文档内容)**
代表一个特定版本的文档内容。
```json
{
  "document_path": "string",
  "content": "string",
  "version_id": "string",
  "last_modified": "string (ISO 8601)"
}
```

##### **3.2. VersionSummary (版本摘要)**
代表版本历史中的一个节点。
```json
{
  "version_id": "string",
  "message": "string",
  "author": "string",
  "timestamp": "string (ISO 8601)"
}
```

##### **3.3. DocumentMetadata (文档元数据)**
存储与文档内容分离的、用于描述文档结构关系的元数据。
```json
{
  "document_path": "string",
  "parent_document_uri": "string (optional)",
  "associated_dp": "string (optional)"
}
```
*   `parent_document_uri` (string, 可选): 指向上游父文档的版本化 URI。
*   `associated_dp` (string, 可选): 指明本文档是上游父文档中哪个设计参数 (DP) 的分解。

##### **3.4. DocumentState (文档状态)**
代表一个文档的生命周期状态。
```json
{
  "document_path": "string",
  "state": "string",
  "version_id": "string"
}
```
*   `state` (string, enum): 枚举值：`DRAFT` (草稿), `FROZEN` (已冻结), `ARCHIVED` (已归档)。

##### **3.5. CommitRequest (提交请求)**
用于向版本库提交一次或多次文件变更的原子操作。
```json
{
  "commit_message": "string",
  "author_component_id": "string",
  "file_changes": [
    {
      "path": "string",
      "new_content": "string"
    }
  ],
  "change_impact_report_uri": "string (optional)"
}
```
*   `commit_message` (string, 必需): 提交信息的主体，服务会根据 URD §7.1 在其基础上添加标准前缀。
*   `author_component_id` (string, 必需): 触发本次提交的组件标识。
*   `file_changes` (array, 必需): 一个包含所有文件变更的数组。
*   `change_impact_report_uri` (string, 可选): 如果本次提交与一次变更管理流程相关，则必须引用《变更影响报告》的 URI。

#### **4. 文档与版本端点 (Document & Version Endpoints)**

##### **GET /api/v1/documents/{document_path}**
*   **描述:** 获取指定文档的最新版本内容。默认从主工作流分支 (e.g., `main`) 获取。
*   **成功响应:** `200 OK`，响应体为 `DocumentContent` 对象。
*   **错误响应:** `404 Not Found`。

##### **GET /api/v1/documents/{document_path}?version={version_id}**
*   **描述:** 获取指定文档的特定版本内容。
*   **成功响应:** `200 OK`，响应体为 `DocumentContent` 对象。
*   **错误响应:** `404 Not Found` (文档或版本不存在)。

##### **GET /api/v1/documents/{document_path}/versions**
*   **描述:** 获取指定文档的版本历史。
*   **成功响应:** `200 OK`，响应体为 `VersionSummary` 对象数组。
*   **错误响应:** `404 Not Found`。

##### **POST /api/v1/commits**
*   **描述:** 提交一次原子性的文件变更。这是系统主要的写入操作，由自动化系统代理 (`Operator`) 调用。
*   **请求体:** `CommitRequest` 对象。
*   **成功响应:**
    *   **状态码:** `201 Created`
    *   **Headers:** `Location: /api/v1/documents/{document_path}?version={new_version_id}`
    *   **响应体:** 一个完整的 `VersionSummary` 对象。
*   **错误响应:** `400 Bad Request`, `409 Conflict` (如发生编辑冲突)。

#### **5. 文档元数据管理端点 (Metadata Management Endpoints)**

此组端点用于管理文档的层级关系，是实现“之字形分解”可追溯性的关键。

##### **GET /api/v1/documents/{document_path}/metadata**
*   **描述:** 获取文档的元数据（如父文档引用）。
*   **成功响应:** `200 OK`，响应体为 `DocumentMetadata` 对象。
*   **错误响应:** `404 Not Found` (文档存在但元数据尚未设置)。

##### **PUT /api/v1/documents/{document_path}/metadata**
*   **描述:** 创建或完整替换文档的元数据。此操作通常在文档首次提交后，由工作流控制器 (`L1-DP0`) 调用以建立其与父文档的链接。
*   **请求体:** `DocumentMetadata` 对象（`document_path` 字段可省略）。
*   **成功响应:** `200 OK`，响应体为更新后的 `DocumentMetadata` 对象。
*   **错误响应:** `400 Bad Request`, `404 Not Found`。

#### **6. 文档状态管理端点 (State Management Endpoints)**

##### **GET /api/v1/documents/{document_path}/state**
*   **描述:** 获取文档的当前生命周期状态。服务通过检查是否存在特定的状态标签（如 `frozen-v1.1`）来确定。
*   **成功响应:** `200 OK`，响应体为 `DocumentState` 对象。
*   **错误响应:** `404 Not Found`。

##### **PUT /api/v1/documents/{document_path}/state**
*   **描述:** 更新文档的生命周期状态。主要用于“冻结”文档。此接口封装了底层的 Git 标签实现细节。
*   **请求体:**
    ```json
    {
      "state": "FROZEN",
      "version_id": "string"
    }
    ```
*   **成功响应:** `200 OK`，响应体为更新后的 `DocumentState` 对象。
*   **错误响应:** `400 Bad Request`, `404 Not Found`, `409 Conflict` (如该版本已被冻结)。

#### **7. 变更管理端点 (Change Management Endpoints)**

此组端点严格遵循 URD §3.2 中定义的变更管理流程。

##### **7.1. 临时分支生命周期**
为变更提议创建的隔离分支是临时性的。在变更流程结束（无论是被执行还是被放弃）后，服务将**自动清理并删除**该临时分支，以保持版本库的整洁。

##### **POST /api/v1/change-proposals**
*   **描述:** 为一个已冻结的文档发起一个变更提议。服务将在后端为此创建一个隔离的变更分支。
*   **请求体:** `{ "source_document_uri": "string" }`
*   **成功响应:** `202 Accepted`，响应体包含新提议的ID和可操作的URL：
    ```json
    {
      "proposal_id": "string",
      "status": "PROPOSED",
      "expires_at": "string (ISO 8601)",
      "actions": {
        "update_content": "/api/v1/change-proposals/{id}/document",
        "analyze": "/api/v1/change-proposals/{id}/analyze"
      }
    }
    ```

##### **PUT /api/v1/change-proposals/{proposal_id}/document**
*   **描述:** 在变更提议的隔离分支中，更新文档内容。
*   **请求体:** `{ "content": "string" }`
*   **成功响应:** `200 OK`。

##### **POST /api/v1/change-proposals/{proposal_id}/analyze**
*   **描述:** 触发对变更的依赖分析。这是一个异步操作。
*   **成功响应:** `202 Accepted`。

##### **GET /api/v1/change-proposals/{proposal_id}/analysis-report**
*   **描述:** 获取依赖分析的结果。客户端应轮询此端点。
*   **成功响应:**
    *   当分析正在进行时: `200 OK`, `{ "status": "ANALYZING" }`。
    *   当分析完成时: `200 OK`，响应体为结构化的依赖报告，包含置信度评分 (URD §3.2.3.1)。
*   **错误响应:** `404 Not Found`。

##### **POST /api/v1/change-proposals/{proposal_id}/confirm**
*   **描述:** 用户确认分析报告，并最终决定需要作废的下游文档清单。服务在此步骤生成并存储《变更影响报告》。
*   **请求体:** `{ "invalidated_documents": ["uri1", "uri2"] }`
*   **成功响应:** `200 OK`，响应体包含已生成的《变更影响报告》的URI。
*   **错误响应:** `409 Conflict` (如果分析尚未完成)。

##### **POST /api/v1/change-proposals/{proposal_id}/execute**
*   **描述:** 执行最终的变更。服务将合并变更分支，并使用《变更影响报告》的URI作为提交信息的一部分来创建一个新的提交。成功执行后，临时分支将被自动删除。
*   **成功响应:** `200 OK`，响应体包含新的 `version_id`。
*   **错误响应:** `409 Conflict` (如果确认步骤未完成)。

---
Gemini 2.5 Pro 0605 writer