// Requires.
const { promises: fs } = require("fs")
const cheerio = require("cheerio")
const path = require("path")
const commandLineArgs = require('command-line-args')
const UglifyJs = require("uglify-js")
const CleanCss = require("clean-css")
const minify = require("html-minifier").minify

// Define and process command line args.
const optionDefinitions = [
    { name: "inputfile", alias: "i", type: String, defaultOption: true, defaultValue: "index.html" },
    { name: "help", alias: "h" },
]
const args = commandLineArgs(optionDefinitions)

if ("help" in args) {
    // Output little help synopsis.
    console.log("Merge an HTML and multiple linked CSS and JS files into one minified html file.\n"
        + "Usage:\n"
        + "   node app.js [path to inputfile]\n"
        + "Command line options:\n"
        + "   --help                prints this help message.\n"
        + "   --inputfile [path]    Allows to specify path to a source html file. Default value: static/index.html")
    return
}

// Set up folder and file paths depending on parameters.
let folder = "static/"
if (path.dirname(args["inputfile"]) !== ".") {
    folder = path.dirname(args["inputfile"]) + "/"
}
let inputFile = folder + path.basename(args["inputfile"])
let basename = path.basename(inputFile, path.extname(inputFile))
let outputFile = folder + basename + ".custom.min.html"


processFile(inputFile, outputFile, folder)


async function processFile(input, output, folder) {
    try {
        let html = await fs.readFile(inputFile, "utf8")
        const $ = cheerio.load(html)

        let stylesheets = $("link[rel=stylesheet]")
        let scripts = $("script")

        // Inline stylesheets.
        for (linkNode of stylesheets) {
            let path = folder + $(linkNode).attr("href")
            /*if (path.contains(".min.")) {
                continue;
            }*/
            let css = await fs.readFile(path, "utf8")
            let cleanedCss = new CleanCss().minify(css).styles;
            let styleNode = $("<style>" + cleanedCss + "</style>")
            $(linkNode).replaceWith(styleNode)
        }

        // Inline scripts.
        for (scriptNode of scripts) {
            let path = folder + $(scriptNode).attr("src")
            $(scriptNode).removeAttr("src")
            let script = await fs.readFile(path, "utf8")
            let result = UglifyJs.minify(script)
            $(scriptNode).empty().append(result.code)
        }

        // Minify the resulting file.
        var result = await minify($.html(), {
            collapseWhitespace: true,
            removeComments: true,
            removeOptionalTags: true,
            removeAttributeQuotes: true,
            removeRedundantAttributes: true,
            removeScriptTypeAttributes: true,
            removeTagWhitespace: true,
            useShortDoctype: true,
            minifyCSS: true,
            minifyJS: true,
        })
        await fs.writeFile(outputFile, result)
        console.log(`Wrote result to ${outputFile}.`);
    } catch (error) {
        console.error(error);
    }
}
