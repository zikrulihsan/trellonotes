# Contributing to Notis

Thanks for wanting to help. Notis is an open source Notion + Trello alternative for personal notes and progress, and contributions of any size are welcome: bug reports, ideas, copy fixes, and code.

## Ways to help

- **Report a bug.** Open an issue with what you did, what you expected, and what happened. A screenshot or the browser and device you used helps a lot.
- **Suggest an idea.** Open an issue and describe the problem you want solved before the solution, so we can talk about it first.
- **Send a pull request.** Small, focused changes are easiest to review. For anything bigger than a bug fix, open an issue first so the work doesn't go to waste.

## Run it locally

Use Node 22 LTS and npm, then:

```sh
npm ci
npm run dev
```

The app runs without any keys, saving to browser storage only. Cloud sync, Google sign-in and the AI features need their own setup, described in the [README](README.md).

## Before you open a pull request

1. Branch from `develop`, and open the pull request against `develop`.
2. Run the same checks CI runs:

   ```sh
   npm run check
   ```

   That runs the typecheck, lint, tests and build. `npm run format` fixes formatting.

3. Add or update a test when you change behavior.
4. In the description, say what a user sees before and after the change. Screenshots help for anything visual.

## Code style

- TypeScript, React function components, and feature folders under `src/features`.
- Match the code around your change: naming, comment density, and CSS conventions.
- User-facing copy says "Notis". Internal identifiers such as `trellonotes_*` tables keep their names.

## License

By contributing, you agree that your contributions are licensed under the [MIT License](LICENSE).
