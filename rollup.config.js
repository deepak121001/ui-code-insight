import scss from "rollup-plugin-scss";
import copy from "rollup-plugin-copy";

const plugins = [
  copy({
    targets: [
      {
        src: "src/dashboard-template/*.html",
        dest: "build",
        transform: (content, path) => {
          // Apply the transform only to HTML files
          if (path.endsWith(".html")) {
            return content.toString().replace(/\s+/g, " ");
          }
          return content;
        },
      },
      {
        src: "src/config/**/*",
        dest: "build/config",
        dot: true,
      },
      {
        src: "src/dashboard-template/css/**/*",
        dest: "build/css",
        dot: true,
      },
    ],
  }),
  scss({ fileName: "build/bundle.css" }),
];

export default [
  {
    input: "src/dashboard-template/js/simple-dashboard.js",
    output: {
      file: "build/bundle.js",
      format: "iife",
    },
    plugins: [...plugins],
  },
  {
    input: "src/index.js",
    output: {
      file: "build/code-insight.js",
      format: "es",
    },
    plugins: [...plugins],
  },
];
