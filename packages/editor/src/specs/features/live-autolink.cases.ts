import type { EditorSpecFeatureDefinition } from "../types.ts";

export const liveAutolinkSpec = {
  id: "live-autolink",
  title: "Live Autolink",
  cases: [
    {
      id: "live-autolink-basic-source-projection",
      title: "Basic source projection",
      initialMarkdown: "|",
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
            "<p><pending><</pending><link-url>https://example.com</link-url><pending>>|</pending></p>",
          expectedMarkdown: "<https://example.com>",
        },
      ],
    },
    {
      id: "live-autolink-http-source-projects",
      title: "HTTP source projection",
      initialMarkdown: "|",
      keyevents: ["<", "h", "t", "t", "p", ":", "/", "/", "e", ".", "c", "o", ">"],
      checkpoints: [
        {
          step: 13,
          expectedProjection:
            "<p><pending><</pending><link-url>http://e.co</link-url><pending>>|</pending></p>",
          expectedMarkdown: "<http://e.co>",
        },
      ],
    },
    {
      id: "live-autolink-empty-source-stays-text",
      title: "Empty source stays plain text",
      initialMarkdown: "|",
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
      title: "Unfinished valid URL styles URL only",
      initialMarkdown: "|",
      keyevents: ["<", "h", "t", "t", "p", "s", ":", "/", "/", "e", ".", "c", "o"],
      checkpoints: [
        {
          step: 13,
          expectedProjection: "<p><<link-url>https://e.co|</link-url></p>",
          expectedMarkdown: "<https://e.co",
        },
      ],
    },
    {
      id: "live-autolink-invalid-source-stays-text",
      title: "Invalid URL source stays plain text",
      initialMarkdown: "|",
      keyevents: ["<", "f", "t", "p", ":", "/", "/", "e", ".", "c", "o", ">"],
      checkpoints: [
        {
          step: 12,
          expectedProjection: "<p><ftp://e.co>|</p>",
          expectedMarkdown: "<ftp://e.co>",
        },
      ],
    },
    {
      id: "live-autolink-delete-closing-keeps-url-style",
      title: "Deleting closing delimiter keeps URL style",
      initialMarkdown: "|",
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
          expectedProjection: "<p><<link-url>https://e.co|</link-url></p>",
          expectedMarkdown: "<https://e.co",
        },
      ],
    },
    {
      id: "live-autolink-commits-on-space",
      title: "Commit valid autolink on Space",
      initialMarkdown: "|",
      keyevents: ["<", "h", "t", "t", "p", "s", ":", "/", "/", "e", ".", "c", "o", ">", "Space"],
      checkpoints: [
        {
          step: 15,
          expectedProjection: '<p><a href="https://e.co">https://e.co</a> |</p>',
          expectedMarkdown: "<https://e.co>\u00a0",
        },
      ],
    },
    {
      id: "live-autolink-commits-on-cursor-leave",
      title: "Commit valid autolink when cursor leaves",
      initialMarkdown: "|",
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
        "ArrowLeft",
        "ArrowRight",
      ],
      checkpoints: [
        {
          step: 16,
          expectedProjection: '<p><a href="https://e.co">https://e.co|</a></p>',
          expectedMarkdown: "<https://e.co>",
        },
      ],
    },
    {
      id: "live-autolink-reenters-rendered-autolink-as-source-projection",
      title: "Re-enter rendered autolink as source projection",
      initialMarkdown: "<https://e.co>|",
      keyevents: ["ArrowLeft"],
      checkpoints: [
        {
          step: 1,
          expectedProjection:
            "<p><pending><</pending><link-url>https://e.c|o</link-url><pending>></pending></p>",
          expectedMarkdown: "<https://e.co>",
        },
      ],
    },
  ],
} satisfies EditorSpecFeatureDefinition;
