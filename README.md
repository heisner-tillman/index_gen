# LectureSynth 🎓

> Turn complex PDF lectures into atomic knowledge graphs with AI.

**LectureSynth** is a powerful tool designed for students and researchers. It ingests PDF lecture slides, uses Google GeminiAI to analyze both visual and textual content, and synthesizes "knowledge cards"—concise concept/explanation pairs.

**Version**: 1.2.0
**Model**: Gemini 2.5 Flash

## ✨ Key Features

-   **Deep Slide Analysis**: Uses multimodal AI to understand diagrams, charts, and text layout.
-   **Smart Synthesis**: Extracts one core concept per slide, filtering out noise.
-   **API Call Consent**: Check page counts and set processing limits *before* incurring API costs.
-   **Project Persistence**: Includes auto-save to temporary storage and manual "Save Project" for long-term retention.
-   **Exit Protection**: Warns you if you attempt to close the app with unsaved changes.
-   **Dual Export**:
    -   **Obsidian Vault**: A pre-linked Markdown knowledge base ready for your second brain.
    -   **Google Slides**: Generate a clean, synthesized presentation deck automatically.

## 🚀 Quick Start (Docker)

The fastest way to run LectureSynth is with Docker.

### Prerequisites

1.  **Docker Engine** installed and running.
2.  **Google Gemini API Key** (Get one [here](https://aistudio.google.com/app/apikey)).

### Installation

1.  **Clone the repository**:
    ```bash
    git clone https://github.com/yourusername/lecturesynth.git
    cd lecturesynth/module
    ```

2.  **Configure API Key**:
    Copy the example environment file and add your key.
    ```bash
    cp .env.example .env
    ```
    Open `.env` and paste your key:
    ```env
    GEMINI_API_KEY=AIzaSy...YourKeyHere...
    ```

3.  **Run with Docker**:
    make the script executable (only needed once):
    ```bash
    chmod +x run_docker.sh
    ```
    Run the application:
    ```bash
    ./run_docker.sh
    ```

    The application will be available at: **[http://localhost:3000](http://localhost:3000)**

## 📖 User Guide

### 1. Upload & Consent
-   Drag and drop your PDF lecture file onto the dashboard.
-   **Review the Consent Screen**: You will see the total slide count.
-   **Choose**:
    -   *Process All*: Analyze the entire deck.
    -   *Limit Pages*: Set a maximum number (e.g., 5) to save API quota or test quickly.

### 2. Processing
-   Watch as the AI analyzes each slide in real-time.
-   The backend securely handles all API communication.

### 3. Review & Save
-   **Review**: Browse the generated flashcards.
-   **Save Project**: Click the "Save Project" button to permanently store your results on the server.
    -   *Note*: Unsaved projects exist only in temporary storage and may be cleared.
-   **Export**:
    -   Download JSON (Raw data).
    -   Download Obsidian Vault (Zipped Markdown).

### 4. Create Google Slides
To turn your synthesized cards back into a clean presentation:
1.  Download the **Obsidian Vault**.
2.  Unzip it and find `create_slides_script.txt`.
3.  Copy the code.
4.  Go to [script.google.com](https://script.google.com).
5.  New Project -> Paste code -> Run `createPresentation`.

## 🛠️ Configuration

### Environment Variables (.env)
| Variable | Description | Required |
| :--- | :--- | :--- |
| `GEMINI_API_KEY` | Your Google AI Studio API Key. Used by the backend service. | **Yes** |

### Security Note
-   The `.env` file is git-ignored to prevent accidental leaks.
-   The frontend **never** sees your API key; it calls a secure proxy on the backend.

## 🏗️ Architecture

-   **Frontend**: React, Vite, TailwindCSS
-   **Backend**: FastAPI, Python, Google GenAI SDK
-   **Storage**: File-based local storage (Temp/Saved)

---
*Built with ❤️ for lifelong learners.*
