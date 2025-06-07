好的，遵照指示。

我将依据《项目代办事项列表 (V1.2)》中的排序，执行下一个待办任务。当前的首要任务是为 `L1-DP1: 项目模板管理器` 撰写其服务接口规范。

此文档旨在定义系统的其他组件（如 L1-DP5, L1-DP6）如何通过一个标准化的、稳定的接口来获取项目模板的配置数据。这将是继《项目模板 Schema 规范》之后，完成 `L1-DP1` 设计的第二个关键步骤。

以下是本次工作的完整文档。

---

### **L1-DP1 模板服务 API 接口规范 (V1.0)**

**状态:** 草稿 (Draft)

**版本说明:** 本文档 (V1.0) 是该 API 接口规范的初版草稿。它依据已批准的《公理设计辅助系统 L1 公理设计文档 (V1.1)》和《项目模板 Schema 规范 (V1.2)》进行撰写，旨在定义一个清晰、稳定且遵循 RESTful 设计原则的服务接口。

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
*   **认证与授权:** 本服务部署于受信任的内部网络环境。本规范层面不定义复杂的认证机制。调用方服务的身份验证与授权由部署环境的基础设施（如服务网格、API 网关）负责。
*   **错误处理:** API 使用标准的 HTTP 状态码来指示请求的成功或失败。当发生错误时，响应体应包含一个标准化的错误对象。

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
  "templateName": "string",
  "projectName": "string"
}
```

*   `templateName` (string): 模板的唯一标识符，用作 API 路径参数。
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
| `template_name` | `string` | 项目模板的唯一标识符（例如，`default-engineering-v1`）。此名称应遵循安全的 URL 命名约定。 | 是 |

**成功响应 (Success Response):**

*   **状态码:** `200 OK`
*   **响应体:** 一个完整的 JSON 对象，其结构 **必须** 符合《项目模板 Schema 规范 (V1.2)》。

**错误响应 (Error Responses):**

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

提供模板发现功能，允许调用方查询当前系统中所有可用的模板列表。

*   **HTTP 方法:** `GET`
*   **路径:** `/api/v1/templates`
*   **描述:** 返回一个包含所有可用模板摘要信息的数组。

**成功响应 (Success Response):**

*   **状态码:** `200 OK`
*   **响应体:** 一个 JSON 数组，其中每个元素都是一个 `TemplateSummary` 对象。
    ```json
    [
      {
        "templateName": "default-engineering-v1.2",
        "projectName": "Default Engineering Design Template (Modular & Robust)"
      },
      {
        "templateName": "ur-capture-template-v1.0",
        "projectName": "User Requirement Capture Template"
      }
    ]
    ```

**错误响应 (Error Responses):**

*   **状态码:** `500 Internal Server Error`
    *   **描述:** 当服务器在访问模板库时发生内部错误。

#### **5. 示例：调用流程**

一个典型的调用场景（例如 `L1-DP5` 需要获取配置）：

1.  **可选步骤 - 发现模板:** `L1-DP5` 向 `GET /api/v1/templates` 发送请求，获取所有可用模板列表，以确定需要使用的 `template_name`。

2.  **核心步骤 - 获取模板:** `L1-DP5` 根据任务指令，向 `GET /api/v1/templates/default-engineering-v1.2` 发送请求。

3.  **处理响应:**
    *   如果收到 `200 OK` 响应，`L1-DP5` 解析响应体中的 JSON 对象，并使用其中的 `componentSettings.dp5` 部分来配置其内部的 LLM 行为。
    *   如果收到 `404 Not Found` 或 `500 Internal Server Error` 响应，`L1-DP5` 将向上游（`L1-DP0`）报告一个配置失败的错误，并中止当前任务。

**cURL 示例:**

```bash
# 请求获取名为 'default-engineering-v1.2' 的模板
curl -X GET 'https://<hostname>/api/v1/templates/default-engineering-v1.2'

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