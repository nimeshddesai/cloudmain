module.exports = function (eleventyConfig) {
  // Static files are copied as-is into build/
  eleventyConfig.addPassthroughCopy({
    "src/images": "images",
    "src/assets": "assets",
    "src/_redirects": "_redirects",
    "src/robots.txt": "robots.txt",
  });
  eleventyConfig.addWatchTarget("src/assets/");

  return {
    dir: {
      input: "src",
      output: "build",
      includes: "_includes",
      data: "_data",
    },
    templateFormats: ["njk"],
    htmlTemplateEngine: "njk",
  };
};
