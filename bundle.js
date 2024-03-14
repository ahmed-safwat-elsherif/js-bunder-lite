import fs from "node:fs";
import path from "node:path";
import babylon from "babylon";
import babelTraverse from "babel-traverse";
import babel from "@babel/core";
import babalHighlight from "@babel/highlight";
import beautify from "js-beautify";

const traverse = babelTraverse.default;
const highlight = babalHighlight.default;

let ID = 0;

const createAsset = (filename) => {
  const content = fs.readFileSync(filename, "utf-8");
  const ast = babylon.parse(content, {
    sourceType: "module",
  });
  const dependencies = [];
  traverse(ast, {
    ImportDeclaration: ({ node }) => {
      dependencies.push(node.source.value);
    },
  });

  const id = ID++;

  const { code } = babel.transformFromAst(ast, null, {
    presets: ["@babel/preset-env"],
  });
  return {
    id,
    filename,
    dependencies,
    code,
  };
};

const createGraph = (entry) => {
  const mainAsset = createAsset(entry);
  const queue = [mainAsset];
  for (const asset of queue) {
    const dirname = path.dirname(asset.filename);
    asset.mapping = {};
    asset.dependencies.forEach((relativePath) => {
      const absolutePath = path.join(dirname, relativePath);
      const child = createAsset(absolutePath);
      asset.mapping[relativePath] = child.id;
      queue.push(child);
    });
  }
  return queue;
};

const bundle = (graph) => {
  let modules = "";
  graph.forEach((mod) => {
    modules += `${mod.id}:[
            function (require, module, exports) {
                ${mod.code}
            },
            ${JSON.stringify(mod.mapping)}
        ],`;
  });
  const result = `
        (function(modules) {
            function require(id) {
                const [fn, mapping] = modules[id];
                function localRequire(relativePath){
                    return require(mapping[relativePath]);
                }
                const module = { exports: {} };
                fn(localRequire, module, module.exports);
                return module.exports;
            }
            require(0)
        })({${modules}})
    `;

  return result;
};

const createBundleOutput = (bundledText) => {
  try {
    fs.readdirSync("./build");
  } catch (error) {
    fs.mkdirSync("./build");
  }
  fs.writeFileSync("./build/main.js", bundledText, { encoding: "utf-8" });
};

const graph = createGraph("./index.js");
const result = bundle(graph);
const formattedOut = beautify.js(result);
createBundleOutput(formattedOut);

// console.log(highlight(beautify.js(result)));
