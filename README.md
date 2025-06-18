# Axiomatic Designer

## 📖 Overview

Axiomatic Designer is a web application designed to assist users in iteratively generating, reviewing, and optimizing documents or code through AI-powered agents. It leverages the principles of Axiomatic Design, allowing for a structured approach to complex problem-solving and content creation. Users can configure iteration parameters, track the history of generated drafts, and engage in multiple rounds of AI-driven writing and reviewing to achieve high-quality outputs.

The application uses Google's Gemini AI models for its core generation and review capabilities.

## ✨ Features

*   **Iterative Generation & Refinement:** Employs a loop of AI "Writer" and "Reviewer" agents to progressively improve content.
*   **Configurable Parameters:**
    *   **User Requirements/Background Material:** Provide context or initial requirements for the AI.
    *   **AI Model Selection:** Choose from available Gemini models (e.g., `gemini-2.5-flash-preview-04-17`, `gemini-2.5-pro`).
    *   **Draft Count (N):** Specify the number of draft variations the Writer AI should produce each round.
    *   **Min/Max Iterations:** Define the minimum and maximum number of refinement cycles.
    *   **Target Score:** Set a quality score threshold for the Reviewer AI to aim for.
*   **AI Agents:**
    *   **Writer Agent:** Generates multiple drafts based on instructions, background material, and previous feedback.
    *   **Reviewer Agent:** Evaluates drafts against a defined standard, provides scores, selects the best draft, and offers consolidated feedback.
*   **Iteration History:** Tracks all rounds, including AI outputs, feedback, and selected drafts.
*   **Continue Optimization:** Allows users to take a completed iteration's final draft and continue refining it with new parameters or modified feedback.
*   **Download Drafts:** Users can download the final selected draft or drafts at intermediate stages.
*   **Internationalization (i18n):** Supports multiple languages (English, Chinese, Korean) with an easy-to-use language switcher.
*   **Responsive Design:** Adapts to various screen sizes for usability on different devices.
*   **Token Usage Tracking:** Displays the total input and output tokens used for Gemini API calls.

## 🛠️ Tech Stack

*   **Frontend:** React 19, TypeScript
*   **Styling:** Tailwind CSS
*   **AI:** Google Gemini API (`@google/genai`)
*   **Localization:** Custom i18n solution with JSON-like locale files.

## 🚀 Getting Started

### Prerequisites

*   A modern web browser with JavaScript enabled.
*   An active Google Gemini API Key.

### API Key Configuration

This application requires a Google Gemini API key to function. The API key **must** be available in the execution environment as `process.env.API_KEY`.

*   **IMPORTANT:** The application code directly uses `process.env.API_KEY`. You **must not** attempt to hardcode the key into the application's source files (`services/geminiService.ts` or elsewhere).
*   **Local Development:** If you are running this application locally using a simple static file server, `process.env.API_KEY` will not be directly available. You would typically need:
    1.  A local development server that can inject environment variables into your client-side code (e.g., using a tool like Vite or Next.js, though this project currently uses a simpler setup).
    2.  Alternatively, for very basic local testing *without modifying the core application code*, you might use browser extensions or other methods to define `process.env.API_KEY` in the JavaScript context before the application loads. However, the recommended approach is to use an environment that properly handles `.env` files or server-side environment variable injection.
*   **Deployment:** When deploying this application, ensure your hosting environment (e.g., Vercel, Netlify, a custom Node.js server) is configured to provide the `API_KEY` as an environment variable to the application.

### Running the Application

1.  **Clone/Download Files:** Ensure you have all the project files (`index.html`, `index.tsx`, `App.tsx`, `locales/`, `components/`, `services/`, `constants.ts`, `types.ts`, `metadata.json`).
2.  **Serve Locally:**
    *   Due to the use of ES modules and to avoid CORS issues with local file access (`file:///`), you should serve the `index.html` file using a local HTTP server.
    *   You can use simple tools like `http-server` (Node.js package) or Python's `http.server`:
        *   Using `npx http-server .` (if you have Node.js/npm)
        *   Using `python -m http.server` (if you have Python)
    *   Open your browser and navigate to the local address provided by the server (e.g., `http://localhost:8080`).
3.  **Ensure API Key is Accessible:** As mentioned above, the JavaScript environment running in your browser must have `process.env.API_KEY` defined and accessible.

## ⚙️ How to Use

1.  **Language Selection:** Choose your preferred language using the dropdown menu in the header.
2.  **Configure Parameters (Config Panel):**
    *   **User Requirements:** Input any background material, user stories, or initial content that the AI Writer should use as a basis. You can also upload a `.txt` or `.md` file.
    *   **AI Model:** Select the Gemini model you wish to use from the dropdown.
    *   **AI Drafts (N):** Set how many draft variations the Writer AI should generate in each iteration (1-3).
    *   **Min Iterations:** The minimum number of iterations before the process can auto-complete based on score.
    *   **Max Iterations:** The maximum number of iterations the process will run.
3.  **Start Iteration:** Click the "Start Iteration" button.
4.  **Monitor Progress:**
    *   The system status will update, showing whether the AI is "Writing" or "Reviewing".
    *   Iteration rounds will appear in the "Iteration History & Details" section. Each round will display:
        *   The Writer AI's response to previous feedback and its generated drafts.
        *   The Reviewer AI's individual reviews for each draft, scores, selected draft index, and consolidated feedback.
5.  **Iteration Completion:** The process stops when:
    *   The score for the selected draft meets or exceeds the "Target Score" (default 95) *after* the "Min Iterations" have been completed.
    *   The "Max Iterations" count is reached.
6.  **Review Final Output:** Once completed, the final selected draft and the last reviewer's feedback will be highlighted.
7.  **Actions on Completion:**
    *   **Download Final Draft:** Save the final approved content.
    *   **Continue Optimizing This Result:** If you wish to refine the final draft further, click this. You'll be able to:
        *   Edit the consolidated feedback from the last round.
        *   Adjust configuration parameters (like "Max Iterations" or "Target Score").
        *   Click "Continue Iteration" to start a new cycle based on the current final draft and your modified feedback/settings.
8.  **Reset:** Click "Reset All" at any time (when not actively processing) to clear all settings, history, and start fresh.

## 🧩 Key Concepts

*   **Writer Agent Prompts:** The `DEFAULT_WRITER_INSTRUCTION` in `constants.ts` defines the core behavior and output format expected from the Writer AI.
*   **Reviewer Agent Prompts:** The `DEFAULT_REVIEWER_STANDARD` in `constants.ts` defines the criteria and output format for the Reviewer AI.
*   **JSON Schema:** The application uses `responseSchema` with the Gemini API to attempt to enforce structured JSON output from the AI agents, improving reliability.
*   **System Status:** Indicates the current state of the application (e.g., Idle, Writing, Reviewing, Completed, Error).

## 🌍 Localization

The application supports multiple languages. Translations are managed in the `locales` directory:
*   `locales/en-US.ts`: English
*   `locales/zh-CN.ts`: Chinese (Simplified)
*   `locales/ko-KR.ts`: Korean

The default language is English. User language preference is saved in `localStorage`.

---

This README provides a guide to understanding, setting up, and using the Axiomatic Design Loop Forge application.
