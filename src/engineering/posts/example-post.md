---
draft: true
title: Example post title
description: One or two sentences that appear in the article list and in search results.
date: 2026-11-12
author: Fabriant
# Optional main image, shown under the title and used when the article is shared
# image: /images/posts/example-post.jpg
# imageAlt: What the image shows, for screen readers
# imageCaption: Optional caption under the image
---

This is a draft template for writing articles. It shows up when you run `npm start`, but it is never published because of `draft: true` at the top.

To write a new article, copy this file, rename it (the file name becomes the URL, for example `safer-aks-upgrades.md` becomes `/engineering/safer-aks-upgrades/`), fill in the details at the top, and remove the `draft: true` line when it is ready to publish.

## Headings, lists and links

Use `##` for section headings. The post title is already the page's main heading.

- Bullet points work like this
- [Links](https://learn.microsoft.com/azure/) work like this

1. Numbered steps
2. Work like this

## Code and quotes

```bash
az aks get-upgrades --resource-group my-rg --name my-cluster
```

> Quotes look like this.
