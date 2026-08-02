# Social-media profile inputs

Social fields are optional. Leave a field completely blank to remove that link. Enter either an `@username` handle or a complete supported HTTPS profile URL. Bare usernames without `@` are rejected so it is always clear whether the value is a handle or URL.

| Platform | Accepted input | Saved canonical form |
| --- | --- | --- |
| X | `@username`, `https://x.com/username`, or `https://twitter.com/username` | `https://x.com/username` |
| Instagram | `@username` or `https://www.instagram.com/username` | `https://www.instagram.com/username` |
| Facebook | `@username`, a named profile/page URL such as `https://www.facebook.com/dentalbio`, `https://www.facebook.com/profile.php?id=123`, `/people/Name/123`, or a legacy `/pages/Page-Name/123` URL | A safe `https://www.facebook.com/...` profile/page URL |
| TikTok | `@username` or `https://www.tiktok.com/@username` | `https://www.tiktok.com/@username` |

Supported mobile and `www` host variants are accepted where applicable. Host names are matched case-insensitively. Trailing slashes, fragments, and unrelated query parameters are removed; Facebook numeric `profile.php?id=...` identifiers are retained.

The validator rejects non-HTTPS and unsafe protocols, lookalike or unsupported hosts, credentials or ports in URLs, post/video/group/share URLs, malformed paths, whitespace-only values, embedded spaces, and values that cannot produce a public profile link.
