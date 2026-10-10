---
title: "Setting up this portfolio: Astro, React, shadcn/ui and GitHub Pages"
description: "How I built llyf.in with Astro, React and shadcn/ui, deployed it to GitHub Pages with GitHub Actions, and pointed my own domain at it — plus the small gotchas along the way."
pubDate: 2026-10-10
tags: ["astro", "react", "shadcn", "github-actions", "github-pages"]
---

I finally set up a proper portfolio site. I wanted something fast, easy to update, and deployed the same way I'd deploy anything else at work: push to `main`, let CI build it, and have it go live automatically.

This post walks through the stack, the setup, and the few things that tripped me up.

## The stack

- **[Astro](https://astro.build)** — builds the whole site to static HTML. Pages ship with no JavaScript unless a component actually needs it.
- **[React](https://react.dev)** — for the interactive parts, like the CI/CD runner simulation in the portfolio section and the theme toggle.
- **[shadcn/ui](https://ui.shadcn.com)** — copy-in components (button, card, badge, tabs) on top of Tailwind CSS v4. The code lives in my repo, so I can change anything.
- **GitHub Actions + GitHub Pages** — free hosting, deployed on every push.
- **Markdown** — for this blog. Every post is just a `.md` file.

## 1. Scaffold Astro

Everything was set up with `npx`, so there's nothing to install globally:

```sh
npx create-astro@latest portfolio --template minimal
cd portfolio
```

Then add React and Tailwind with Astro's own integration command, which installs the packages and updates the config for you:

```sh
npx astro add react tailwind
```

## 2. Add shadcn/ui

shadcn needs an `@/*` import alias first. In `tsconfig.json`:

```json
{
  "compilerOptions": {
    "baseUrl": ".",
    "paths": { "@/*": ["./src/*"] }
  }
}
```

Then initialise it and pull in the components I needed:

```sh
npx shadcn@latest init
npx shadcn@latest add button card badge separator tabs
```

The components land in `src/components/ui/` as plain source files.

## 3. Islands: only hydrate what's interactive

This is what I like most about Astro. React components render to static HTML by default. To make one interactive in the browser, you opt in with a `client:` directive:

```astro
<ThemeToggle client:load />
<Experience client:visible items={experience} />
<DevOpsShowcase client:visible />
```

`client:visible` waits until the component scrolls into view before loading its JavaScript, so the first page load stays light.

## 4. Content as data

I didn't want to edit JSX every time I change jobs or learn something new, so all the portfolio content lives in one typed file, `src/data/profile.ts`: about, experience, skills, education and certifications. The components just render it.

The blog works the same way, using an Astro **content collection**. Every Markdown file in `src/content/blog/` becomes a post:

```ts
// src/content.config.ts
const blog = defineCollection({
  loader: glob({ pattern: "**/*.md", base: "./src/content/blog" }),
  schema: z.object({
    title: z.string(),
    description: z.string(),
    pubDate: z.coerce.date(),
    tags: z.array(z.string()).default([]),
    draft: z.boolean().default(false),
  }),
})
```

The schema validates frontmatter at build time, so a typo in a date fails the build instead of quietly publishing a broken post.

## 5. Deploy with GitHub Actions

The workflow at `.github/workflows/deploy.yml` builds on every push to `main` and publishes `dist/` to GitHub Pages:

```yaml
on:
  push:
    branches: [main]

permissions:
  contents: read
  pages: write
  id-token: write

jobs:
  build:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: 22
          cache: npm
      - run: npm ci
      - run: npm run build
      - uses: actions/upload-pages-artifact@v3
        with:
          path: ./dist

  deploy:
    needs: build
    runs-on: ubuntu-latest
    environment:
      name: github-pages
      url: ${{ steps.deployment.outputs.page_url }}
    steps:
      - id: deployment
        uses: actions/deploy-pages@v4
```

In the repo settings, **Settings → Pages → Source** has to be set to **GitHub Actions**.

## 6. Custom domain

To serve the site from `llyf.in` instead of `username.github.io`:

1. Add a `public/CNAME` file containing just `llyf.in`. Astro copies everything in `public/` into the build output, so it ships with every deploy.
2. Point the DNS at GitHub Pages. That means four `A` records on the apex:

   ```text
   185.199.108.153
   185.199.109.153
   185.199.110.153
   185.199.111.153
   ```

   (plus the matching `AAAA` records for IPv6), and a `CNAME` record from `www` to `<username>.github.io`.
3. Enter the domain under **Settings → Pages → Custom domain**, wait for the DNS check, then tick **Enforce HTTPS**.

Because the site is served from the root of a custom domain, Astro doesn't need a `base` path. Setting `site: "https://llyf.in"` in `astro.config.mjs` is enough.

## Gotchas I hit

**A Python `.gitignore`.** The repo was created on GitHub with the Python `.gitignore` template. It doesn't ignore `node_modules/`, but it *does* ignore `lib/`, which is exactly where shadcn puts `src/lib/utils.ts`. I replaced it with a proper Node/Astro one before the first commit.

**Radix Avatar renders only the fallback without JavaScript.** shadcn's `Avatar` waits for the image to load in the browser before showing it. In an Astro component that isn't hydrated, that code never runs, so the static page only ever showed my initials. A plain `<img>` fixed it.

**Lockfiles across operating systems.** I generate `package-lock.json` on Windows, but CI runs on Linux. Tools like Tailwind v4 and Lightning CSS ship native binaries per platform. Before pushing, it's worth checking that the lockfile lists the `linux-x64-gnu` packages too, or `npm ci` fails on the runner.

**Cloudflare proxy in front of GitHub Pages.** My domain's DNS lives on Cloudflare, and a proxied (orange-cloud) record pointing to the wrong origin gives a `523 Origin is unreachable`. Keep the records **DNS only** until GitHub has issued its certificate.

## Writing a new post

Writing here is now just:

```sh
# create src/content/blog/my-new-post.md with frontmatter, then
git add . && git commit -m "New post" && git push
```

A minute later it's live at `/blog/my-new-post/`. That's the workflow I wanted.
