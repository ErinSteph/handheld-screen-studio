# Release guide

This document describes release maintenance for Handheld Screen Studio.
The official Marketplace publisher is **Erin Steph** (`ErinSteph`).

## Validate and package

Use Node.js 22 or newer. From the repository root:

```sh
npm ci --ignore-scripts
npm test
npm run check
npm run package
```

The package command produces a versioned `.vsix` archive. Review its contents
with `npx vsce ls` and install it in VS Code using **Extensions: Install from
VSIX…** before publishing. Check the original Star Post layouts and, when
changing the C adapter, a compatible GBA or DS renderer project.

Development dependencies, tests, development configuration and release tooling are
excluded from the VSIX. Documentation screenshots are hosted in the repository;
the example layouts contain no external game source or artwork.

## Versioning

Every Marketplace upload requires a unique version. Update `package.json`,
`package-lock.json` and `CHANGELOG.md` together. A published version must never
be reused for different package contents.

## Manual publishing

Maintainers with publisher access can upload the validated VSIX through the
[Marketplace publisher dashboard](https://marketplace.visualstudio.com/manage/publishers/ErinSteph).
Use **New extension → Visual Studio Code** for an initial submission, or
**Update** on the existing extension for a subsequent version. Confirm that
Marketplace validation succeeds and the public listing shows the new version.

## Automated publishing

The `Publish to VS Code Marketplace` workflow runs only through a manual
workflow dispatch. Its `confirmation` input must equal `PUBLISH`. It validates
the source and publishes a pre-release package using OIDC Trusted Publishing.

This workflow requires a matching trust policy configured by a publisher owner:

| Setting | Value |
| --- | --- |
| Repository owner | `ErinSteph` |
| Repository | `handheld-screen-studio` |
| Workflow | `publish.yml` |
| Environment | Empty; the workflow does not declare an environment |

The workflow configuration alone does not grant publishing access. Tokens and
other publishing credentials must not be committed to the repository.

## Rollback

For a local installation, install a retained earlier VSIX or uninstall the
extension. To restore an earlier implementation on the Marketplace, package it
with a new version and publish it through the normal release process.
Extension installation does not revert edited layout or C files; those changes
are managed through VS Code Undo or the project's version control.

See the official [Publishing Extensions guide](https://code.visualstudio.com/api/working-with-extensions/publishing-extension)
and [VSCE Trusted Publishing documentation](https://github.com/microsoft/vscode-vsce#trusted-publishing).
