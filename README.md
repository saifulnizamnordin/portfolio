# saifulnizam — portfolio

Personal portfolio for Saiful Nizam Nordin, live at **https://llyf.in**.

Built with [Astro](https://astro.build), [React](https://react.dev) and [shadcn/ui](https://ui.shadcn.com) (Tailwind CSS v4).

## Development

```sh
npm install
npm run dev       # http://localhost:4321
npm run build     # output in ./dist
npm run preview
```

All content (about, experience, skills, education, certifications) lives in [`src/data/profile.ts`](src/data/profile.ts). Edit that file to update the site.

Add more shadcn components with:

```sh
npx shadcn@latest add <component>
```

## Deployment

Every push to `main` builds the site and deploys it to GitHub Pages via [`.github/workflows/deploy.yml`](.github/workflows/deploy.yml). You can also run it manually from the **Actions** tab (**Deploy to GitHub Pages → Run workflow**).

### One-time GitHub Pages setup

1. Open the repo on GitHub → **Settings → Pages**.
2. Under **Build and deployment → Source**, choose **GitHub Actions**.
3. Push to `main` (or re-run the workflow) and wait for the **Deploy to GitHub Pages** run to go green.

### Custom domain: `llyf.in`

The file [`public/CNAME`](public/CNAME) (containing `llyf.in`) is copied into the build, which tells GitHub Pages which domain to serve.

**1. DNS records** — at your domain registrar / DNS provider for `llyf.in`:

| Type    | Name / Host | Value                     |
| ------- | ----------- | ------------------------- |
| `A`     | `@`         | `185.199.108.153`         |
| `A`     | `@`         | `185.199.109.153`         |
| `A`     | `@`         | `185.199.110.153`         |
| `A`     | `@`         | `185.199.111.153`         |
| `AAAA`  | `@`         | `2606:50c0:8000::153`     |
| `AAAA`  | `@`         | `2606:50c0:8001::153`     |
| `AAAA`  | `@`         | `2606:50c0:8002::153`     |
| `AAAA`  | `@`         | `2606:50c0:8003::153`     |
| `CNAME` | `www`       | `saifulnizamnordin.github.io` |

Remove any other `A`/`AAAA`/`CNAME` records on `@` and `www` that point elsewhere. If you use Cloudflare, set these records to **DNS only** (grey cloud) until GitHub has issued the certificate.

**2. GitHub settings** — **Settings → Pages → Custom domain**: enter `llyf.in` and click **Save**. GitHub runs a DNS check; this can take from a few minutes up to 24 hours while DNS propagates.

**3. HTTPS** — once the DNS check passes and the certificate is provisioned, tick **Enforce HTTPS**.

**4. (Recommended) Verify the domain** — GitHub profile → **Settings → Pages → Add a domain**, add `llyf.in`, and create the `TXT` record it shows. This stops anyone else from claiming the domain on GitHub Pages.

Check DNS from a terminal:

```sh
nslookup llyf.in
nslookup www.llyf.in
```
