# Marketplace release setup

Author: **Erin Steph**. Intended repository:
`https://github.com/ErinSteph/handheld-screen-studio`.

The package uses publisher ID `erinsteph` as the intended identity. This ID
must be registered or confirmed in the Marketplace before public publishing.
The `author` field and MIT copyright name are Erin Steph.

## Prepared in the repository

- Public-facing README, MIT licence, unbranded examples and self-contained tests.
- Locked development dependencies and an allow-listed VSIX packaging setup.
- CI validates and packages the extension on pushes and pull requests.
- A separate manually dispatched publishing workflow uses OIDC Trusted
  Publishing. No PAT or credential is stored in the repository.
- Publishing is not triggered by commits or version tags. The manual workflow
  requires its confirmation input to equal `PUBLISH`.

## Account steps still required

1. Sign in at the [Marketplace publisher management page](https://marketplace.visualstudio.com/manage).
2. Create or select the publisher. Set display name to **Erin Steph** and
   register ID `erinsteph` if available. If you already own a different ID,
   update `package.json` and rebuild before the first release.
3. In that publisher's **Trusted Publishing** settings, create a policy:
   - Repository owner: `ErinSteph`
   - Repository: `handheld-screen-studio`
   - Workflow: `publish.yml`
   - Environment: leave empty (the workflow does not declare one).
4. Review the example layouts and native adapter behaviour in VS Code. Add
   screenshots of Star Post or an existing project to the listing. Existing
   project screenshots do not grant permission to bundle that project, source
   or artwork. Capture only the VS Code window.
5. Verify CI passes. Review the package's file list with `npx vsce ls` and
   install the produced VSIX locally for a final check.
6. When ready to submit publicly, dispatch **Publish to VS Code Marketplace**
   with confirmation `PUBLISH`. It publishes a pre-release preview.

No public Marketplace submission has been made merely by preparing these
files. Do not commit tokens or paste publishing credentials into chat.

## Local packaging and rollback

```sh
npm ci --ignore-scripts
npm test
npm run check
npm run package
```

Install the resulting VSIX with **Extensions: Install from VSIX…**. To roll
back locally, uninstall this extension or install a previous VSIX. Source edits
are separate from extension installation: use Undo or version control to revert
layout/C changes. Published versions cannot be reused for different contents;
increment `package.json` before every later upload.

Setup follows the official [Publishing Extensions guide](https://code.visualstudio.com/api/working-with-extensions/publishing-extension)
and [VSCE Trusted Publishing documentation](https://github.com/microsoft/vscode-vsce#trusted-publishing).
