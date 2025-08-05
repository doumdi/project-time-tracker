# Release Process Documentation

This project uses an automated GitHub Actions workflow to create draft releases when code is merged into the main branch.

## How It Works

### Version Management

The project version is managed through the `version.json` file in the root directory:

```json
{
  "major": 1,
  "minor": 0,
  "micro": 1
}
```

The version format follows semantic versioning: `v{major}.{minor}.{micro}` (e.g., `v1.0.1`)

### Automatic Release Creation

When you merge a pull request or push directly to the `main` branch, the GitHub Actions workflow will:

1. **Read the current version** from `version.json`
2. **Check if a tag already exists** for that version
3. **Check for new commits** since the last tag
4. **Generate a changelog** from git commits
5. **Create a git tag** with the current version
6. **Create a draft release** with the generated changelog
7. **Build distribution packages** for Windows, macOS, and Linux
8. **Upload all packages** to the draft release

### Changelog Generation

The workflow automatically generates a changelog by:
- Looking at all commits since the last tag (or all commits if no previous tags exist)
- Formatting each commit as `- {commit message} ({short hash})`
- Including download information for all supported platforms

## Creating a New Release

### Step 1: Update the Version

Before merging to main, update the version in `version.json`:

```json
{
  "major": 1,
  "minor": 1,
  "micro": 0
}
```

### Step 2: Merge to Main

When you merge your pull request to `main`, the workflow will automatically:
- Create tag `v1.1.0`
- Generate a changelog
- Build distribution packages for all platforms
- Create a draft release with all packages attached

### Step 3: Publish the Release

1. Go to the [Releases page](https://github.com/doumdi/project-time-tracker/releases)
2. Find your draft release
3. Review and edit the changelog if needed
4. Verify all distribution packages are attached
5. Click "Publish release"

## Version Numbering Guidelines

Follow semantic versioning principles:

- **Major**: Increment for breaking changes or major new features
- **Minor**: Increment for new features that are backward compatible
- **Micro/Patch**: Increment for bug fixes and small improvements

## Workflow Features

### Multi-Platform Build

The workflow builds distribution packages for all supported platforms:
- **Windows**: NSIS installer (`.exe`)
- **macOS**: DMG disk image (`.dmg`)
- **Linux**: AppImage (`.AppImage`)

### Safety Checks

- **Duplicate Prevention**: Won't create a release if a tag already exists for the current version
- **Empty Release Prevention**: Won't create a release if there are no new commits since the last tag
- **Error Handling**: Validates `version.json` format and handles missing dependencies

### Changelog Format

The generated changelog includes:
- Section header with version number
- List of changes (one per commit)
- Download information with platform-specific distribution packages

### Example Generated Changelog

```markdown
# Changes in v1.1.0

- Add new time tracking feature (abc123)
- Fix database migration issue (def456)
- Update UI styling (ghi789)

## Distribution Packages

### Windows
- **Installer**: `Project Time Tracker Setup 1.1.0.exe`

### macOS
- **App Bundle**: `Project Time Tracker-1.1.0.dmg`

### Linux
- **AppImage**: `Project Time Tracker-1.1.0.AppImage`

## Source Code

- **Source Archive**: `project-time-tracker-v1.1.0-source.zip`
- **GitHub automatically provides**: `Source code (zip)` and `Source code (tar.gz)`
```

## Troubleshooting

### No Release Created

If no release is created after merging to main:
1. Check the [Actions tab](https://github.com/doumdi/project-time-tracker/actions) for workflow runs
2. Verify `version.json` format is correct
3. Ensure there are new commits since the last tag
4. Check that the tag doesn't already exist

### Workflow Fails

Common issues:
- **Invalid JSON**: Check `version.json` syntax
- **Permission Error**: Ensure the repository has write permissions for the workflow
- **Missing Fields**: Ensure `major`, `minor`, and `micro` fields exist in `version.json`
- **Build Failures**: Check that all dependencies are properly specified in `package.json`
- **Platform-specific Issues**: Each platform builds on its native runner, check logs for platform-specific errors

### Build Issues

If distribution builds fail:
- **Windows**: Check for proper NSIS installer dependencies
- **macOS**: Ensure code signing and notarization are properly configured (if required)
- **Linux**: Verify AppImage dependencies are available

## Manual Release Creation

If you need to create a release manually:

```bash
# Create and push a tag
git tag -a v1.1.0 -m "Release v1.1.0"
git push origin v1.1.0

# Use GitHub CLI to create a release
gh release create v1.1.0 --title "Release v1.1.0" --notes "Release notes here" --draft
```