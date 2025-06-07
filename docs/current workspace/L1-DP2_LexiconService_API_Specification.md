好的，遵照指示。

我已收到并仔细研究了《评审意见：关于<L1-DP2 词汇服务 API 接口规范 (V1.1)>》。评审结论为“驳回，需强制性修订”。

我将严格依据评审意见中列出的强制性修订指令和建议性修订意见，对该 API 规范进行修订，以解决其与系统内其他核心服务接口行为不一致的关键问题，并提升规范的精确性。本次修订的核心目标是：统一写入操作的成功响应模式，并明确认证细节，以确保系统级的一致性和减少客户端的实现模糊性。

以下是根据上述评审意见修订后的完整文档。

---

### **L1-DP2 词汇服务 API 接口规范 (V1.2)**

**状态:** 已修订 (Revised)

**版本说明:** 本文档 (V1.2) 是对 V1.1 版本的修订，旨在响应并解决《评审意见：关于<L1-DP2 词汇服务 API 接口规范 (V1.1)>》中指出的设计缺陷。核心变更包括：
1.  **统一 `PUT` 操作的成功响应模式 (指令1):** 重构了 `PUT /api/v1/lexicon` 端点的成功响应逻辑。为解决与 `L1-DP1` 模板服务 API 的行为不一致问题，对于资源更新操作，状态码已从 `204 No Content` 更改为 `200 OK`，并且响应体**必须**返回一个 `LexiconSummary` 对象。这确保了系统内核心服务接口行为的一致性，并为客户端提供了更新后的资源元数据，避免了额外查询。
2.  **明确认证头格式 (建议1):** 在“API 通用约定”中增加了 `Authorization` 头的格式示例，消除了客户端实现的模糊性，与系统内其他高质量 API 规范保持一致。

#### **1. 引言**

本文档详细定义了 `L1-DP2: 项目词汇服务` 对外提供服务的应用程序编程接口（API）。此 API 的核心职责是为系统提供一个管理和查询“项目词汇与约束”文件的标准化接口。根据 L1 设计，该服务是确保全项目术语、命名和格式一致性的唯一权威来源。

本规范将 API 分为两类：
1.  **管理接口:** 提供对整个词汇文件进行创建、替换和删除（CRUD）的能力，主要供管理工具或授权用户界面使用。
2.  **查询接口:** 提供高效、细粒度的查询能力，供其他系统组件（如 `L1-DP4`, `L1-DP5`, `L1-DP6`）在执行任务时按需获取特定规则或定义。该类接口包含一个批量查询端点，以避免 N+1 查询问题。

**设计依据:**
*   《公理设计辅助系统 L1 公理设计文档 (V1.1)》
*   《项目词汇与约束文件 Schema 规范 (V1.2)》
*   《软件用户需求文档 (V1.6)》
*   《评审意见：关于<L1-DP2 词汇服务 API 接口规范 (V1.1)>》

#### **2. API 通用约定**

*   **主机地址 (Base URL):** 本规范不定义具体的主机地址。在实际部署中，应通过服务发现机制或配置文件来提供。所有路径均基于此 Base URL。
*   **API 版本:** API 版本通过 URL 路径进行标识。本规范定义的版本为 `v1`。
    *   示例: `https://<hostname>/api/v1/...`
*   **数据格式:** 所有请求体（`Request Body`）和响应体（`Response Body`）均使用 `application/json` 格式，并采用 `UTF-8` 编码。
*   **认证与授权:** 本 API 要求所有请求**必须**同时包含**身份标识**和**认证凭据**。
    *   **认证方式 (Authentication):** 请求方必须在 HTTP Header 中提供一个承载秘密信息的 `Authorization` 字段。
        *   **值格式示例:** `Bearer <token>`
    *   **身份标识 (Identification):** 请求方必须在 HTTP Header 中提供 `X-System-Component-ID` 字段，其值为调用方组件的标识符（例如 `L1-DP6`）。
    *   **授权逻辑 (Authorization):** 服务实现层应包含一个可配置的访问控制列表（ACL）。查询操作（`GET`, `POST /query`）通常允许更广泛的组件访问，而写入操作（`PUT`, `DELETE`）的权限应被严格限制。
*   **错误处理:** API 使用标准的 HTTP 状态码。错误响应体应包含一个标准化的错误对象。

##### **2.1. 资源范围与部署假设 (Resource Scope & Deployment Assumption)**

本服务被设计为单租户模式，每个服务实例仅管理一个项目的词汇与约束文件。因此，词汇被建模为作用于根路径 `/lexicon` 的单例资源 (Singleton Resource)。在需要支持多个项目的环境中，应为每个项目部署独立的服务实例。此设计决策旨在简化 API 接口，并将多租户的复杂性交由更高层次的部署架构处理，从而确保本服务职责的单一性。

#### **3. 数据模型 (Data Models)**

##### **3.1. Lexicon (词汇与约束)**

完整的词汇数据结构由《项目词汇与约束文件 Schema 规范 (V1.2)》定义。管理接口接收和返回的词汇对象 **必须** 严格遵循该 Schema。

##### **3.2. Error (错误响应)**

```json
{
  "error": {
    "code": "string",
    "message": "string",
    "details": "string (optional)"
  }
}
```
*   `code` (string): 机器可读的错误代码（例如：`LEXICON_NOT_FOUND`, `SCHEMA_VALIDATION_FAILED`）。
*   `message` (string): 人类可读的错误信息。
*   `details` (string, 可选): 详细技术信息。

##### **3.3. BatchQueryResponse (批量查询响应)**

用于 `POST /lexicon/query` 端点的响应。它返回一个包含所有找到的条目的结构化对象。其结构保持不变。

##### **3.4. LexiconSummary (词汇摘要)**

用于在创建或更新操作成功后返回的轻量级响应体。

```json
{
  "schemaVersion": "string",
  "lastModified": "string"
}
```
*   `schemaVersion` (string): 被创建或更新的词汇文件所遵循的 Schema 版本号，例如 "1.2"。
*   `lastModified` (string): 资源最后被修改的时间戳，采用 ISO 8601 格式 (例如 `2024-06-08T10:00:00Z`)。

#### **4. 管理接口定义 (Management Endpoints)**

##### **GET /api/v1/lexicon**
*   **描述:** 检索完整的项目词汇与约束文件。
*   **成功响应:**
    *   **状态码:** `200 OK`
    *   **响应体:** 符合《项目词汇与约束文件 Schema 规范 (V1.2)》的完整 JSON 对象。
*   **错误响应:** `401 Unauthorized`, `403 Forbidden`, `404 Not Found`。

##### **PUT /api/v1/lexicon**
*   **描述:** 创建或完整替换项目词汇与约束文件。这是一个幂等操作。服务器在接受前**必须**对请求体执行完整的 Schema 验证。
*   **请求体:** 一个符合《项目词汇与约束文件 Schema 规范 (V1.2)》的完整 JSON 对象。
*   **成功响应:**
    *   **状态码:** `201 Created` (当资源首次被创建时)
        *   **Headers:** `Location: /api/v1/lexicon`
        *   **响应体:** `LexiconSummary` 对象。
    *   **状态码:** `200 OK` (当现有资源被成功替换时)
        *   **响应体:** `LexiconSummary` 对象。
*   **错误响应:**
    *   `400 Bad Request`: 请求体为空、非法的 JSON 格式或未能通过 Schema 验证。
    *   `401 Unauthorized`, `403 Forbidden`, `500 Internal Server Error`。

##### **DELETE /api/v1/lexicon**
*   **描述:** 删除项目词汇与约束文件。
*   **成功响应:**
    *   **状态码:** `204 No Content`
*   **错误响应:** `401 Unauthorized`, `403 Forbidden`, `404 Not Found`。

#### **5. 查询接口定义 (Query Endpoints)**

本服务同时提供全量获取和批量/细粒度查询两种接口。`GET /lexicon` 适用于客户端希望一次性获取并缓存整个词汇表的场景（例如，在应用启动时）。而批量与细粒度查询接口则为那些在运行时仅需少数特定规则、希望最小化网络传输和客户端解析开销的组件（如评审引擎 `L1-DP6`）提供了高效的按需访问方式。

##### **5.1. 细粒度查询 (Granular Queries)**
（此部分无变化）
###### **GET /api/v1/lexicon/glossary/{term}**
###### **GET /api/v1/lexicon/acronyms/{acronym}**
###### **GET /api/v1/lexicon/naming-conventions/{id}**
###### **GET /api/v1/lexicon/formatting-constraints/{id}**

##### **5.2. 批量查询 (Batch Query)**
（此部分无变化）
###### **POST /api/v1/lexicon/query**

#### **6. 示例：调用流程与cURL**

**场景1: `L1-DP6` (评审引擎) 批量校验文档中的术语和规则**
```bash
# L1-DP6 在审查文档前，一次性获取所有需要的定义和规则
curl -X POST \
  -H "Authorization: Bearer <component_token>" \
  -H "X-System-Component-ID: L1-DP6" \
  -H "Content-Type: application/json" \
  -d '{
    "glossary": ["Design Matrix", "Frozen Document"],
    "acronyms": ["URD", "DP"],
    "namingConventionIds": ["ARTIFACT_TYPE_AD_L2_DOC"],
    "formattingConstraintIds": ["DATA_TYPE_ISO_DATE"]
  }' \
  'https://<hostname>/api/v1/lexicon/query'

# 成功时返回 200 OK 和 BatchQueryResponse JSON 对象
```

**场景2: 管理员上传并替换整个词汇文件**
```bash
# 管理员通过UI代理组件，上传一个新的词汇文件内容
# 注意：请求体必须是完整的、符合 V1.2 Schema 的 JSON
curl -i -X PUT \
  -H "Authorization: Bearer <admin_user_token>" \
  -H "X-System-Component-ID: Admin-UI-Proxy" \
  -H "Content-Type: application/json" \
  -d @/path/to/new_lexicon.lexicon.json \
  'https://<hostname>/api/v1/lexicon'

# 场景 2a: 如果是创建新文件，成功时返回 201 Created 和 LexiconSummary
# HTTP/1.1 201 Created
# Location: /api/v1/lexicon
# Content-Type: application/json
#
# {
#   "schemaVersion": "1.2",
#   "lastModified": "2024-06-08T10:00:00Z"
# }

# 场景 2b: 如果是替换旧文件，成功时返回 200 OK 和 LexiconSummary
# HTTP/1.1 200 OK
# Content-Type: application/json
#
# {
#   "schemaVersion": "1.2",
#   "lastModified": "2024-06-08T10:15:30Z"
# }
```

---
Gemini 2.5 Pro 0605 writer