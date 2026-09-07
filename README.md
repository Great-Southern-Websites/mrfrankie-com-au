# Website

Static site built with [Quarkus Roq](https://iamroq.dev/) and published on GitHub Pages
by [Great Southern Websites](https://greatsouthernwebsites.com.au).

## Local development

Requires Java 21+.

```bash
./mvnw quarkus:dev          # or: mvn quarkus:dev  -> http://localhost:8080
```

## Generate the static site

```bash
QUARKUS_HTTP_PORT=8765 QUARKUS_ROQ_GENERATOR_BATCH=true mvn -B package quarkus:run
```

Output lands in `target/roq/`.

## Editing content

| What | Where |
| --- | --- |
| Pages | `content/*.md` and `content/*.html` (front matter + Markdown/HTML) |
| News posts | `content/posts/YYYY-MM-DD-slug.md` |
| Layouts and partials | `templates/` |
| Styles | `public/css/main.css` |
| Images | `public/images/` |
| Site config | `config/application.properties` |

## Deployment

Pushing to `main` runs `.github/workflows/deploy.yml`, which builds the site with the Roq
GitHub Action and publishes it to GitHub Pages. The workflow also runs daily so
future-dated posts publish on time.
