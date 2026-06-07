import { editorPath, specsPath } from "./routes.ts";

const repositoryUrl = "https://github.com/fEyebrow/instant-markdown-editor";

export function renderTopbar(active: "editor" | "specs"): string {
  return `
    <header class="topbar">
      <div class="brandrow">
        <div class="brandnav">
          <a class="brandmark" href="${editorPath}">Typora</a>
          <nav class="topnav" aria-label="Sections">
            <a class="navlink${active === "editor" ? " active" : ""}" href="${editorPath}">Editor</a>
            <a class="navlink${active === "specs" ? " active" : ""}" href="${specsPath}">Specs</a>
          </nav>
        </div>
        <a
          class="iconlink github-link"
          href="${repositoryUrl}"
          target="_blank"
          rel="noreferrer"
          aria-label="Open GitHub repository"
          title="GitHub repository"
        >
          <svg aria-hidden="true" viewBox="0 0 24 24" focusable="false">
            <path d="M12 2C6.48 2 2 6.58 2 12.22c0 4.5 2.87 8.32 6.84 9.67.5.09.68-.22.68-.49v-1.9c-2.78.62-3.37-1.22-3.37-1.22-.45-1.19-1.11-1.5-1.11-1.5-.91-.64.07-.63.07-.63 1 .07 1.53 1.05 1.53 1.05.9 1.56 2.35 1.11 2.92.85.09-.66.35-1.11.63-1.37-2.22-.26-4.55-1.14-4.55-5.05 0-1.12.39-2.03 1.03-2.75-.1-.26-.45-1.3.1-2.71 0 0 .84-.28 2.75 1.05A9.32 9.32 0 0 1 12 6.88c.85 0 1.7.12 2.5.34 1.9-1.33 2.74-1.05 2.74-1.05.55 1.41.2 2.45.1 2.71.64.72 1.03 1.63 1.03 2.75 0 3.92-2.34 4.78-4.57 5.04.36.32.68.94.68 1.9v2.83c0 .27.18.59.69.49A10.05 10.05 0 0 0 22 12.22C22 6.58 17.52 2 12 2Z" />
          </svg>
        </a>
      </div>
    </header>
  `;
}
