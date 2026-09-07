# Working on this site

This is a Quarkus Roq static site. Keep it that way.

- Content lives in `content/` (front matter + Markdown or HTML), layouts and partials in
  `templates/`, styles in `public/css/main.css`, images in `public/images/`.
- Links between pages use `{=site.url('path')}`; images use `{=site.image('name.png')}`
  or `{=site.url('images/name.png')}`. Never hard-code the domain: the site is served
  under a repository path on GitHub Pages and later under a custom domain.
- `quarkus.qute.alt-expr-syntax=true` is on: Qute expressions are `{=expr}`. Wrap
  inline `<script>` and `<style>` bodies in `{| ... |}` so braces are left alone.
- Every page must render well at 360px wide. Tap targets at least 44px. Respect
  `prefers-reduced-motion`.
- Brand colours are CSS custom properties at the top of `main.css`. Dark theme tokens
  live in the two `data-theme` blocks; if the site has no dark theme, both blocks and the
  `theme-toggle` partial are gone.
- Verify before you finish: `QUARKUS_HTTP_PORT=8765 QUARKUS_ROQ_GENERATOR_BATCH=true mvn -q -B package quarkus:run`
  must succeed and `target/roq/index.html` must exist.
- Do not add build tooling (npm, bundlers), server code, or third-party scripts beyond
  the embeds the site already relies on (maps, video, booking widgets, social feeds).
- Writing style: plain Australian English, no em or en dashes, no marketing filler, no
  exclamation marks, no emoji, nothing the business did not say. The elf hands you the
  full list as STYLE.md when it asks for work.

## News posts

Posts live in `content/posts/YYYY-MM-DD-slug.md` (front matter `title`, `description`,
optional `image`; layout `post` comes from the collection config). The listing page is
`content/posts.html`:

```
---
title: "News"
description: "News and updates from BUSINESS NAME."
layout: default
---
{@io.quarkiverse.roq.frontmatter.runtime.model.Page page}
{@io.quarkiverse.roq.frontmatter.runtime.model.Site site}
<section class="page-banner">
  <div class="container">
    <h1>{=page.title}</h1>
    <p class="lead">{=page.description}</p>
  </div>
</section>
<section class="section">
  <div class="container prose">
    {#for post in site.collections.posts}
    <article class="change">
      <p class="muted"><time datetime="{=post.date.isoDate}">{=post.date.format('d MMMM yyyy')}</time></p>
      <h3><a href="{=post.url}">{=post.title}</a></h3>
      <p>{=post.description ?: post.contentAbstract(40)}</p>
    </article>
    {/for}
  </div>
</section>
```

The newest three on the home page: the same `{#for}` over `site.collections.posts` with
`{#if post_count < 3}` or by slicing in the template, whichever Roq version supports.
