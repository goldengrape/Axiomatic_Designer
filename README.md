# Axiomatic Design Loop Forge

## 📖 Overview

Axiomatic Design Loop Forge is a web application designed to assist users in iteratively generating, reviewing, and optimizing documents or code through AI-powered agents. It leverages the principles of Axiomatic Design, allowing for a structured approach to complex problem-solving and content creation. Users can configure iteration parameters, track the history of generated drafts, and engage in multiple rounds of AI-driven writing and reviewing to achieve high-quality outputs.

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
*   **Dependencies:** Loaded via CDN (esm.sh) using an import map.
*   **Localization:** Custom i18n solution with JSON-like locale files.

## 🚀 Getting Started

### Prerequisites

*   A modern web browser with JavaScript enabled.
*   An active Google Gemini API Key.

### Dependencies & `npm`

*   **No `npm install` Required (Current Setup):** This application, in its current state, loads its main JavaScript dependencies (React, `@google/genai`) directly from a CDN (Content Delivery Network) using an `<script type="importmap">` in `index.html`. Therefore, you **do not** need to run `npm install` or have Node.js installed just to run these files as they are.
*   **Local Development Considerations:** While `npm` isn't needed to serve the files, more advanced local development setups (e.g., for features like hot-reloading or easier API key management via `.env` files) would typically involve Node.js, npm/yarn, and a development server like Vite or Create React App. This project is not currently structured that way. **The main challenge with local development using simple static servers like `http-server` is ensuring `.tsx` and `.jsx` files are served with the correct JavaScript MIME type.** (See "Running the Application" section below).

### API Key Configuration

This application requires a Google Gemini API key to function. The API key **must** be available in the execution environment as `process.env.API_KEY`.

*   **IMPORTANT:** The application code (`services/geminiService.ts`) directly attempts to read `process.env.API_KEY`. You **must not** hardcode your API key into the application's source files. The application will not prompt you for an API key.

*   **Local Development Challenge:**
    *   When you run `index.html` directly in a browser (even via a simple static file server), `process.env.API_KEY` will **not** be defined by default, as `process.env` is a Node.js concept. The application will likely fail to initialize the Gemini API client.
    *   **Solutions for Local Development:**
        1.  **Recommended for robust development:** Use a local development server (e.g., Vite, Next.js, Parcel) that supports environment variables, typically through a `.env` file at the root of your project. These servers also correctly handle transpilation and serving of `.tsx` and `.jsx` files. This kind of setup would usually require Node.js and `npm`.
        2.  **Basic local testing (without code modification):** You might use browser developer tools or extensions to manually define `process.env.API_KEY` in the JavaScript context of the page *before* the application's scripts execute. For example, you could open your browser's developer console and execute `window.process = { env: { API_KEY: 'YOUR_ACTUAL_API_KEY' } };` *before* the page fully loads or any script errors occur. This is a temporary workaround for testing and not a production solution. *Remember to replace `'YOUR_ACTUAL_API_KEY'` with your real key and be cautious about exposing your key.*

*   **Deployment:** When deploying this application, ensure your hosting environment (e.g., Vercel, Netlify, a custom Node.js server) is configured to provide the `API_KEY` as an environment variable to the application's runtime.

### Running the Application

1.  **Clone/Download Files:** Ensure you have all the project files, including the new `mime.types` file.
2.  **Serve Locally with Correct MIME Types:**
    *   Due to the use of ES modules and `.tsx` files, you must serve `index.html` using a local HTTP server that correctly identifies `.tsx` files as JavaScript.
    *   **Using `npx http-server` (Recommended for this setup):**
        *   Open your terminal in the root directory of the project (where `index.html` and `mime.types` are).
        *   Run the following command:
            ```bash
            npx http-server . --mimetypes mime.types
            ```
        *   This command tells `http-server` to use the `mime.types` file to correctly set the `Content-Type` header for `.tsx`, `.ts`, and `.jsx` files to `application/javascript`.
        *   Open your browser and navigate to the local address provided by the server (e.g., `http://localhost:8080`).
    *   **Other static servers:** If you use a different server (like `python -m http.server`), it might not serve `.tsx` files with the correct MIME type by default, leading to the "Expected a JavaScript-or-Wasm module script" error. Using a proper development server (like Vite or Parcel) or configuring your static server for custom MIME types is essential.
3.  **Hard Refresh Browser:** After starting the server, or if you still see issues, do a hard refresh in your browser (e.g., Ctrl+Shift+R or Cmd+Shift+R) to clear any cached files or incorrect MIME types.
4.  **Ensure API Key is Accessible (Crucial for Local Running):** As detailed in the "API Key Configuration" section, `process.env.API_KEY` must be defined in the JavaScript environment where the app runs.

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