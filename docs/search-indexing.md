# Search indexing policy

The owner requested that the public playtest page not be search indexed.

Both HTML entry points (`index.html` and the custom `404.html`) include a robots meta tag with `noindex, nofollow, noimageindex`. The build copies both tags unchanged. No sitemap is published.

Do not block the game with robots.txt: compliant crawlers need to fetch the HTML to discover its noindex instruction. Also, a project-subdirectory robots.txt would not control the origin. Do not modify another repository's root-site robots.txt for this project.

These directives apply to compliant search crawlers; they are not access control. The now-public GitHub repository, raw files, and directly accessible images cannot be made private by an HTML tag on the Pages game. GitHub Pages does not provide a per-project custom X-Robots-Tag response-header configuration here. If strict non-discoverability of every asset is required, use authenticated hosting rather than a public site.

Reference: https://developers.google.com/search/docs/crawling-indexing/block-indexing

Deployment verification: fetch the actual published root and index.html; confirm status 200 and the robots meta tag in the initial HTML response. Fetch an unknown path and confirm the custom noindex 404 page. Do not equate a successful build with a verified deployment.
