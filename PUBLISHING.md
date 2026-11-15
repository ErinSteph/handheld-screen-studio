# Marketplace release setup

Author: **Erin Steph**. Repository:
`https://github.com/ErinSteph/handheld-screen-studio`.

The registered Marketplace publisher is **Erin Steph**, ID `ErinSteph`.
The package uses that confirmed publisher ID.
The `author` field and MIT copyright name are Erin Steph.

## Prepared in the repository

- Public-facing README, MIT licence, unbranded examples and self-contained tests.
- Locked development dependencies and an allow-listed VSIX packaging setup.
- CI validates and packages the extension on pushes and pull requests.
- A separate manually dispatched publishing workflow uses OIDC Trusted
  Publishing. No PAT or credential is stored in the repository.
- Publishing is not triggered by commits or version tags. The manual workflow
  requires its confirmation input to equal `PUBLISH`.

## Future automated releases

1. Sign in at the [Marketplace publisher management page](https://marketplace.visualstudio.com/manage).
2. Select the registered publisher **Erin Steph** (`ErinSteph`).
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

Version 0.2.0 was uploaded through the Marketplace publisher UI on
15 November 2026; the service initially reported **Verifying**.
Trusted Publishing remains optional setup for future automated releases.
Do not commit tokens or paste publishing credentials into chat.

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
