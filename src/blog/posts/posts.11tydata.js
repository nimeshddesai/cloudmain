// Settings shared by every blog post in this folder
const isProductionBuild = process.env.ELEVENTY_RUN_MODE === "build";

module.exports = {
  layout: "layouts/post.njk",
  author: "Fabriant",
  eleventyComputed: {
    metaTitle: (data) => `${data.title} | Fabriant Blog`,
    // Posts with `draft: true` show in `npm start` but are not published
    permalink: (data) => {
      if (data.draft && isProductionBuild) return false;
      return `/blog/${data.page.fileSlug}/`;
    },
    eleventyExcludeFromCollections: (data) => Boolean(data.draft && isProductionBuild),
  },
};
