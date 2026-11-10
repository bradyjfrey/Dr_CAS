import fs from "node:fs";
import path from "node:path";
import matter from "gray-matter";
import yaml from "js-yaml";
import markdownIt from "markdown-it";

const md = markdownIt({ html: true });
const CONTENT = "content";

function readEntries(dir) {
  const full = path.join(CONTENT, dir);
  return fs
    .readdirSync(full)
    .filter((file) => /\.(md|ya?ml)$/.test(file))
    .sort()
    .map((file) => {
      const raw = fs.readFileSync(path.join(full, file), "utf8");
      const slug = file.replace(/\.[^.]+$/, "");
      if (file.endsWith(".md")) {
        const parsed = matter(raw);
        return { ...parsed.data, body: parsed.content, slug };
      }
      return { ...yaml.load(raw), slug };
    });
}

const sortKey = (title) => String(title ?? "").replace(/^[^\p{L}\p{N}]+/u, "").toLowerCase();
const byTitle = (a, b) => sortKey(a.title).localeCompare(sortKey(b.title));
const time = (value) => (value ? new Date(value).getTime() : 0);

function books() {
  return readEntries("books").sort((a, b) => (b.year ?? 0) - (a.year ?? 0) || byTitle(a, b));
}

function site() {
  return yaml.load(fs.readFileSync(path.join(CONTENT, "site.yml"), "utf8"));
}

function featuredBook() {
  const ref = String(site().featured_book ?? "");
  const key = path.basename(ref).replace(/\.[^.]+$/, "");
  return books().find((book) => book.slug === key || book.title === ref);
}

export default function (eleventyConfig) {
  eleventyConfig.addPassthroughCopy("style.css");
  eleventyConfig.addPassthroughCopy("images");
  eleventyConfig.addPassthroughCopy("fonts");
  eleventyConfig.addWatchTarget(CONTENT);

  eleventyConfig.addFilter("md", (value) => md.render(String(value ?? "")));

  eleventyConfig.addGlobalData("site", site);
  eleventyConfig.addGlobalData("featured", featuredBook);
  eleventyConfig.addGlobalData("books", () => {
    const featured = featuredBook();
    return books().filter((book) => book.slug !== featured?.slug);
  });
  eleventyConfig.addGlobalData("academic", () =>
    readEntries("academic").sort((a, b) => (b.year ?? 0) - (a.year ?? 0) || byTitle(a, b))
  );
  eleventyConfig.addGlobalData("media", () =>
    readEntries("media").sort(
      (a, b) => Number(!!b.pinned) - Number(!!a.pinned) || time(b.date) - time(a.date) || byTitle(a, b)
    )
  );
  eleventyConfig.addGlobalData("cv", () => matter(fs.readFileSync(path.join(CONTENT, "cv.md"), "utf8")).content);

  return {
    dir: { input: "src", output: "_site" },
    htmlTemplateEngine: "njk",
    markdownTemplateEngine: "njk",
  };
}
