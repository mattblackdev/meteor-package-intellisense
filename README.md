# meteor-package-intellisense

A VS Code extension that enables IntelliSense for local meteor packages by teaching VS Code where your 'meteor/package-name' imports are coming from.

## Commands

```Meteor Package IntelliSense```
 will modify your jsconfig.json file with required mapping of imports to file location. For example:

```js
// packages/vulcan-forms/package.js
Package.describe({
  name: "vulcan:forms",
});

Package.onUse(function(api) {
  api.mainModule("lib/client/main.js", ["client"]);
  api.mainModule("lib/server/main.js", ["server"]);
});
```

Will generate:
```json
// jsconfig.json
{
  "compilerOptions": {
    "baseUrl": ".",
    "paths": {
      "meteor/vulcan:forms": [
        "packages/vulcan-forms/lib/client/main.js",
        "packages/vulcan-forms/lib/server/main.js"
      ]
    }
  }
}
```

## Requirements

Must have a jsconfig.json file.
Anytime you modify packages' names, folder names or mainModule paths, you should re-run the command.

## Known Issues

None yet

## Release Notes

Users appreciate release notes as you update your extension.

### 1.0.0

Initial release