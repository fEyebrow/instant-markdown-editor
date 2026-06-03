import type { EditorSpecFeatureDefinition } from "../types.ts";

export const liveAutolinkSpec = {
  id: "live-autolink",
  title: "Live Autolink",
  cases: [
    {
      id: "live-autolink-https-source-projects",
      title: "HTTPS autolink projects as a link source and serializes as Markdown",
      initialMarkdown: "",
      keyevents: [
        "<",
        "h",
        "t",
        "t",
        "p",
        "s",
        ":",
        "/",
        "/",
        "e",
        "x",
        "a",
        "m",
        "p",
        "l",
        "e",
        ".",
        "c",
        "o",
        "m",
        ">",
      ],
      checkpoints: [
        {
          step: 21,
          expectedProjection:
            '<p><pending><</pending><a href="https://example.com">https://example.com</a><pending>></pending>|</p>',
          expectedMarkdown: "<https://example.com>",
        },
      ],
    },
    {
      id: "live-autolink-hides-source-on-space",
      title: "Typing Space after an autolink hides source and preserves Markdown",
      initialMarkdown: "",
      keyevents: ["<", "h", "t", "t", "p", "s", ":", "/", "/", "e", ".", "c", "o", ">", " "],
      checkpoints: [
        {
          step: 15,
          expectedProjection: '<p><a href="https://e.co">https://e.co</a> |</p>',
          expectedMarkdown: "<https://e.co> ",
        },
      ],
    },
    {
      id: "live-autolink-http-source-projects",
      title: "HTTP source projection",
      initialMarkdown: "",
      keyevents: ["<", "h", "t", "t", "p", ":", "/", "/", "e", ".", "c", "o", ">"],
      checkpoints: [
        {
          step: 13,
          expectedProjection:
            '<p><pending><</pending><a href="http://e.co">http://e.co</a><pending>></pending>|</p>',
          expectedMarkdown: "<http://e.co>",
        },
      ],
    },
    {
      id: "live-autolink-empty-source-stays-text",
      title: "Empty source stays plain text",
      initialMarkdown: "",
      keyevents: ["<", ">"],
      checkpoints: [
        {
          step: 2,
          expectedProjection: "<p><>|</p>",
          expectedMarkdown: "<>",
        },
      ],
    },
    {
      id: "live-autolink-unfinished-valid-url-styles-url-only",
      title: "Unfinished valid URL stays plain text",
      initialMarkdown: "",
      keyevents: ["<", "h", "t", "t", "p", "s", ":", "/", "/", "e", ".", "c", "o"],
      checkpoints: [
        {
          step: 13,
          expectedProjection: "<p><https://e.co|</p>",
          expectedMarkdown: "<https://e.co",
        },
      ],
    },
    {
      id: "live-autolink-scheme-source-projects",
      title: "Scheme autolink source projects",
      initialMarkdown: "",
      keyevents: ["<", "f", "t", "p", ":", "/", "/", "e", ".", "c", "o", ">"],
      checkpoints: [
        {
          step: 12,
          expectedProjection:
            '<p><pending><</pending><a href="ftp://e.co">ftp://e.co</a><pending>></pending>|</p>',
          expectedMarkdown: "<ftp://e.co>",
        },
      ],
    },
    {
      id: "live-autolink-delete-closing-keeps-url-style",
      title: "Deleting closing delimiter breaks the source mark",
      initialMarkdown: "",
      keyevents: [
        "<",
        "h",
        "t",
        "t",
        "p",
        "s",
        ":",
        "/",
        "/",
        "e",
        ".",
        "c",
        "o",
        ">",
        "Backspace",
      ],
      checkpoints: [
        {
          step: 15,
          expectedProjection: "<p><https://e.co|</p>",
          expectedMarkdown: "<https://e.co",
        },
      ],
    },
    {
      id: "live-autolink-reveals-rendered-source-projection",
      title: "Reveal rendered autolink source projection",
      initialMarkdown: "<https://e.co>",
      keyevents: ["ArrowLeft"],
      checkpoints: [
        {
          step: 1,
          expectedProjection:
            '<p><pending><</pending><a href="https://e.co">https://e.co</a>|<pending>></pending></p>',
          expectedMarkdown: "<https://e.co>",
        },
      ],
    },
  ],
} satisfies EditorSpecFeatureDefinition;
