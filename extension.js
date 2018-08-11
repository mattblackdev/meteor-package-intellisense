// The module 'vscode' contains the VS Code extensibility API
// Import the module and reference it with the alias vscode in your code below
const vscode = require('vscode')
const path = require('path')
const fs = require('fs')
const vm = require('vm')
const merge = require('deepmerge')
const { PackageSpy, Npm, Cordova, Plugin } = require('./Package')

const dontMerge = (destination, source) => source

// this method is called when your extension is activated
// your extension is activated the very first time the command is executed
function activate(context) {
  // Use the console to output diagnostic information (console.log) and errors (console.error)
  // This line of code will only be executed once when your extension is activated

  // The command has been defined in the package.json file
  // Now provide the implementation of the command with  registerCommand
  // The commandId parameter must match the command field in package.json
  let disposable = vscode.commands.registerCommand(
    'extension.meteorPackageIntelliSense',
    function() {
      // The code you place here will be executed every time your command is executed

      // Find all the local package.js files inside /packages folder
      vscode.workspace
        .findFiles('packages/**/package.js')
        .then(packageFileURIs => {
          Promise.all(
            packageFileURIs.map(uri => {
              return new Promise((resolve, reject) => {
                fs.readFile(uri.fsPath, 'utf-8', (err, data) => {
                  if (err) {
                    reject(err)
                  } else {
                    const packagePath = vscode.workspace.asRelativePath(
                      path.parse(uri.fsPath).dir
                    )
                    const code = data.toString()
                    resolve({ code, packagePath })
                  }
                })
              })
            })
          )
            .catch(err => {
              vscode.window.showErrorMessage(err)
              return
            })
            .then(packageCodeAndPaths => {
              if (!packageCodeAndPaths || !packageCodeAndPaths.length) {
                vscode.window.showWarningMessage(
                  'Could not find any local meteor packages in /packages'
                )
                return
              }
              const paths = packageCodeAndPaths
                .map(({ code, packagePath }) => {
                  const sandbox = {
                    Package: new PackageSpy(),
                    Npm,
                    Cordova,
                    Plugin,
                  }

                  vm.createContext(sandbox)
                  vm.runInContext(code, sandbox)

                  const key = `meteor/${sandbox.Package.name}`
                  const value = sandbox.Package.mainModules.map(modulePath =>
                    path.join(packagePath, modulePath)
                  )

                  return {
                    key,
                    value,
                  }
                })
                .filter(({ value }) => value.length > 0)
                .reduce((acc, { key, value }) => {
                  acc[key] = value
                  return acc
                }, {})

              vscode.workspace.findFiles('jsconfig.json').then(uris => {
                let jsconfigPath
                let jsconfigFile
                if (!uris.length) {
                  const workspacePath =
                    vscode.workspace.workspaceFolders[0].uri.fsPath
                  jsconfigPath = path.resolve(workspacePath, 'jsconfig.json')
                  jsconfigFile = '{}'
                } else {
                  jsconfigPath = uris[0].fsPath
                  jsconfigFile = fs.readFileSync(jsconfigPath).toString()
                }

                let jsconfig
                try {
                  jsconfig = JSON.parse(jsconfigFile)
                } catch (e) {
                  vscode.window.showErrorMessage(
                    `Can't parse jsconfig.json. Error: ${e.message}`
                  )
                  return
                }

                const newJsConfig = merge(
                  jsconfig,
                  {
                    compilerOptions: {
                      baseUrl: '.',
                      paths,
                    },
                  },
                  { arrayMerge: dontMerge }
                )

                fs.writeFile(
                  jsconfigPath,
                  JSON.stringify(newJsConfig, null, 2),
                  err => {
                    if (err) {
                      vscode.window.showErrorMessage(
                        'There was a problem writing to the jsconfig file.'
                      )
                    } else {
                      vscode.window.showInformationMessage(
                        'Successfully configured compilerOptions.paths'
                      )
                    }
                  }
                )
              })
            })
        })
    }
  )

  context.subscriptions.push(disposable)
}
exports.activate = activate

// this method is called when your extension is deactivated
function deactivate() {}
exports.deactivate = deactivate
