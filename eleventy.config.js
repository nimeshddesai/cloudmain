module.exports = function (eleventyConfig) {
  // Static files are copied as-is into build/
  eleventyConfig.addPassthroughCopy({
    "src/images": "images",
    "src/assets": "assets",
    "src/_redirects": "_redirects",
    "src/robots.txt": "robots.txt",
  });
  eleventyConfig.addWatchTarget("src/assets/");

  // Article dates: "November 12, 2026" for readers, "2026-11-12" for <time datetime>
  eleventyConfig.addFilter("readableDate", (date) =>
    new Intl.DateTimeFormat("en-US", { dateStyle: "long", timeZone: "UTC" }).format(date));
  eleventyConfig.addFilter("isoDate", (date) => date.toISOString().slice(0, 10));
  eleventyConfig.addFilter("head", (items, n) => items.slice(0, n));

  // Published articles, newest first (drafts are left out of production builds)
  eleventyConfig.addCollection("posts", (collectionApi) =>
    collectionApi
      .getFilteredByGlob("src/engineering/posts/*.md")
      .filter((post) => post.data.permalink !== false)
      .sort((a, b) => b.date - a.date));

  return {
    dir: {
      input: "src",
      output: "build",
      includes: "_includes",
      data: "_data",
    },
    templateFormats: ["njk", "md"],
    htmlTemplateEngine: "njk",
    // Plain Markdown in posts, so code samples with {{ }} aren't treated as template tags
    markdownTemplateEngine: false,
  };
};
