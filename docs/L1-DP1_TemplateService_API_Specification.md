好的，我已收到并仔细研读了所有输入文件，特别是《关于<L1-DP1 模板服务 API 接口规范 (V1.1)>的评审意见与强制性修订指令》。

我将严格依据该评审意见中列出的三条强制性修订指令，对 `V1.1` 版本的API规范进行修订。本次修订的核心是纠正认证机制的根本性缺陷，并补全缺失的错误处理契约，以使规范达到工程上要求的健壮性与安全性标准。

以下是根据指令修订后的完整文档。

---

### **L1-DP1 模板服务 API 接口规范 (V1.2)**

**状态:** 修订稿 (Revised Draft)

**版本说明:** 本文档 (V1.2) 是对 V1.1 版本的修订版。它依据《关于<L1-DP1 模板服务 API 接口规范 (V1.1)>的评审意见与强制性修订指令》（日期：2024-06-07）进行了强制性修订。核心变更包括：1) 引入了基于 `Authorization` Header 的真实认证机制，与 `X-System-Component-ID` 的身份标识功能分离；2) 补充了缺失的 `401 Unauthorized` 和 `403 Forbidden` 错误响应定义；3) 明确了列表端点在无可用模板时的响应行为。

#### **1. 引言**

本文档详细定义了 `L1-DP1: 项目模板管理器` 对外提供服务的应用程序编程接口（API）。此 API 的核心职责是向系统内其他需要配置信息的组件（如 `L1-DP5: 内容生成与修订引擎` 和 `L1-DP6: 评审与评估引擎`）提供一个标准化的、只读的模板数据访问方式。

本规范遵循公理设计原则，确保 `L1-DP1` 作为一个独立的服务，通过稳定的接口与其他设计参数（DPs）进行解耦的交互。所有调用方应遵循此规范来与模板服务进行通信。

**设计依据:**
*   《公理设计辅助系统 L1 公理设计文档 (V1.1)》
*   《项目模板 Schema 规范 (V1.2)》
*   《软件用户需求文档 (URD) V1.6》

#### **2. API 通用约定**

*   **主机地址 (Base URL):** 本规范不定义具体的主机地址。在实际部署中，应通过服务发现机制或配置文件来提供。所有路径均基于此 Base URL。
*   **API 版本:** API 版本通过 URL 路径进行标识。本规范定义的版本为 `v1`。
    *   示例: `https://<hostname>/api/v1/...`
*   **数据格式:** 所有请求体（`Request Body`）和响应体（`Response Body`）均使用 `application/json` 格式，并采用 `UTF-8` 编码。
*   **认证与授权:** 本 API 要求所有请求**必须**同时包含**身份标识**和**认证凭据**。缺少任何一项或验证失败都将导致请求被拒绝。部署时，凭据验证可由 API 网关或服务网格等基础设施代理。
    *   **认证方式 (Authentication):** 请求方必须在 HTTP Header 中提供一个承载秘密信息的 `Authorization` 字段，用于验证请求的合法性。
        *   **HTTP Header:** `Authorization`
        *   **值格式:** `Bearer <token>` 或 `ApiKey <key>`。具体的令牌（token）或密钥（key）由系统统一分发和管理。
    *   **身份标识 (Identification):** 请求方必须在 HTTP Header 中提供 `X-System-Component-ID` 字段，其值为调用方组件的标识符（例如 `L1-DP5`）。此标识符用于日志记录、追踪和授权决策。
    *   **授权逻辑 (Authorization):** 服务实现层应包含一个可配置的访问控制列表（ACL），用于验证 `X-System-Component-ID` 所标识的组件是否有权访问所请求的资源。此检查在认证成功后执行。
*   **错误处理:** API 使用标准的 HTTP 状态码来指示请求的成功或失败。当发生错误时，响应体应包含一个标准化的错误对象。

##### **2.1. 模板标识符 (`template_name`) 规范**

`template_name` 是项目模板物理文件名的基本名称（即不含 `.project.json` 扩展名）。它必须遵循 URL-safe 字符集（例如 `[a-zA-Z0-9_-]`），且在模板库中必须唯一。

#### **3. 数据模型 (Data Models)**

##### **3.1. Template (模板)**

完整的模板数据结构由《项目模板 Schema 规范 (V1.2)》定义。本 API 返回的模板对象 **必须** 严格遵循该 Schema。

##### **3.2. Error (错误响应)**

当 API 调用返回错误时（如 `4xx` 或 `5xx` 状态码），响应体应为一个包含以下字段的 JSON 对象：

```json
{
  "error": {
    "code": "string",
    "message": "string",
    "details": "string (optional)"
  }
}
```

*   `code` (string): 一个机器可读的错误代码（例如：`TEMPLATE_NOT_FOUND`）。
*   `message` (string): 一个易于人类理解的错误信息摘要。
*   `details` (string, 可选): 关于错误的更详细的技术信息。

##### **3.3. TemplateSummary (模板摘要)**

用于在列表中展示模板的核心信息，避免传输完整的模板文件。

```json
{
  "template_name": "string",
  "projectName": "string"
}
```

*   `template_name` (string): 模板的唯一标识符，用作 API 路径参数。其定义见章节 2.1。
*   `projectName` (string): 模板中定义的、对用户友好的项目名称。

#### **4. 端点定义 (Endpoint Definitions)**

##### **4.1. 获取指定模板的详细信息**

此端点是本 API 的核心，允许其他服务按需获取一个完整的项目模板配置。

*   **HTTP 方法:** `GET`
*   **路径:** `/api/v1/templates/{template_name}`
*   **描述:** 根据提供的唯一模板名称，检索并返回完整的项目模板 JSON 对象。

**路径参数 (Path Parameters):**

| 参数名 | 类型 | 描述 | 是否必需 |
| :--- | :--- | :--- | :--- |
| `template_name` | `string` | 项目模板的唯一标识符（例如，`default-engineering-v1-2`）。其定义见章节 2.1。 | 是 |

**成功响应 (Success Response):**

*   **状态码:** `200 OK`
*   **响应体:** 一个完整的 JSON 对象，其结构 **必须** 符合《项目模板 Schema 规范 (V1.2)》。

**错误响应 (Error Responses):**

*   **状态码:** `401 Unauthorized`
    *   **描述:** 当请求未提供认证凭据（如 `Authorization` Header 丢失或格式错误）时返回。
    *   **响应体:**
        ```json
        {
          "error": {
            "code": "AUTHENTICATION_CREDENTIALS_MISSING",
            "message": "Authentication credentials were not provided."
          }
        }
        ```
*   **状态码:** `403 Forbidden`
    *   **描述:** 当请求提供了有效的认证凭据，但凭据对应的组件没有权限访问该资源时返回。
    *   **响应体:**
        ```json
        {
          "error": {
            "code": "PERMISSION_DENIED",
            "message": "The requesting component does not have permission to access this resource."
          }
        }
        ```
*   **状态码:** `404 Not Found`
    *   **响应体:**
        ```json
        {
          "error": {
            "code": "TEMPLATE_NOT_FOUND",
            "message": "The requested template could not be found."
          }
        }
        ```
*   **状态码:** `409 Conflict`
    *   **描述:** 当模板文件存在，但其内容不符合《项目模板 Schema 规范 (V1.2)》时返回。
    *   **响应体:**
        ```json
        {
          "error": {
            "code": "TEMPLATE_SCHEMA_VALIDATION_FAILED",
            "message": "The template file is present but fails schema validation.",
            "details": "Validation error details provided by the schema validator library..."
          }
        }
        ```
*   **状态码:** `500 Internal Server Error`
    *   **描述:** 当服务器在读取或解析模板文件时发生内部错误。
    *   **响应体:**
        ```json
        {
          "error": {
            "code": "INTERNAL_SERVER_ERROR",
            "message": "An unexpected error occurred on the server."
          }
        }
        ```

##### **4.2. 列出所有可用的模板**

提供模板发现功能，允许调用方查询当前系统中所有可用的模板列表。为生成此列表，服务将扫描模板存储库，从每个文件的文件名派生 `template_name`，并解析每个文件以提取 `projectName`。

**性能提示:** 注意：此操作涉及文件 I/O 和 JSON 解析，调用方应避免高频轮询。

*   **HTTP 方法:** `GET`
*   **路径:** `/api/v1/templates`
*   **描述:** 返回一个包含所有可用模板摘要信息的数组。

**成功响应 (Success Response):**

*   **状态码:** `200 OK`
*   **响应体:** 一个 JSON 数组，其中每个元素都是一个 `TemplateSummary` 对象。若系统当前无任何可用模板，API应返回一个空的 JSON 数组 (`[]`)。
    ```json
    [
      {
        "template_name": "default-engineering-v1-2",
        "projectName": "Default Engineering Design Template (Modular & Robust)"
      },
      {
        "template_name": "ur-capture-template-v1-0",
        "projectName": "User Requirement Capture Template"
      }
    ]
    ```

**错误响应 (Error Responses):**

*   **状态码:** `401 Unauthorized`
    *   **描述:** 当请求未提供认证凭据（如 `Authorization` Header 丢失或格式错误）时返回。
    *   **响应体:**
        ```json
        {
          "error": {
            "code": "AUTHENTICATION_CREDENTIALS_MISSING",
            "message": "Authentication credentials were not provided."
          }
        }
        ```
*   **状态码:** `403 Forbidden`
    *   **描述:** 当请求提供了有效的认证凭据，但凭据对应的组件没有权限访问该资源时返回。
    *   **响应体:**
        ```json
        {
          "error": {
            "code": "PERMISSION_DENIED",
            "message": "The requesting component does not have permission to access this resource."
          }
        }
        ```
*   **状态码:** `500 Internal Server Error`
    *   **描述:** 当服务器在访问模板库时发生内部错误。

#### **5. 示例：调用流程**

一个典型的调用场景（例如 `L1-DP5` 需要获取配置）：

1.  **可选步骤 - 发现模板:** `L1-DP5` 向 `GET /api/v1/templates` 发送请求，获取所有可用模板列表，以确定需要使用的 `template_name`。

2.  **核心步骤 - 获取模板:** `L1-DP5` 根据任务指令，向 `GET /api/v1/templates/default-engineering-v1-2` 发送请求。

3.  **处理响应:**
    *   如果收到 `200 OK` 响应，`L1-DP5` 解析响应体中的 JSON 对象，并使用其中的 `componentSettings.dp5` 部分来配置其内部的 LLM 行为。
    *   如果收到 `4xx` 或 `5xx` 响应，`L1-DP5` 将向上游（`L1-DP0`）报告一个配置失败的错误，并中止当前任务。

**cURL 示例:**

```bash
# 请求获取名为 'default-engineering-v1-2' 的模板
# -H "Authorization" 用于安全认证
# -H "X-System-Component-ID" 用于身份标识和授权
curl -X GET \
  -H "Authorization: Bearer <your_secure_token>" \
  -H "X-System-Component-ID: L1-DP5" \
  'https://<hostname>/api/v1/templates/default-engineering-v1-2'

# 预期的成功响应 (200 OK) - 内容为完整的模板JSON
# (此处省略完整内容，其结构与《项目模板 Schema 规范 (V1.2)》中的示例完全一致)
# {
#   "templateSchemaVersion": "1.2",
#   "projectName": "Default Engineering Design Template (Modular & Robust)",
#   "componentSettings": { ... }
# }
```

---
Gemini 2.5 Pro 0605 writer