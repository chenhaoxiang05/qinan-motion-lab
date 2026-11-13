# QINAN collaboration requirements

- Preserve the application as a usable frontend; keep demo reports visibly labeled and do not invent actual security results.
- Keep previous versions and Git history available. Do not rewrite published tags.
- Every completed update must be pushed to the user’s GitHub repository and synchronized to the existing GPT Site, using the same reviewed commit and build.
- Reuse the project in `.openai/hosting.json`; preserve its audience/access settings. Do not create a replacement site or make the private site public.
- Run the relevant regression tests and production build before publishing. Report browser visual-validation limits accurately; the user has authorized publishing this iteration despite unavailable browser tooling.
- Keep Rare UI source attribution and license, with a visible site credit. Original QINAN code remains MIT; third-party code keeps its own terms.
- File picker activation must remain synchronous with its trusted user click. Never await an animation before opening it.
- Unmount React islands before their vanilla DOM parent is replaced or removed. Keep native dialog transitions separate from live text.
