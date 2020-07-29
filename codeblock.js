// CSS properties
let css = `
.codeblock-text, .codeblock-overlay {
    box-sizing: border-box;
    width: 100%;
    flex: none;
    padding: 5px;
    
    background-color: #00000000;
    font-size: 14px;
    font-family: monospace;

    tab-size: 4;

    border: none;
    overflow: visible;
    outline: none;
    line-height: 1.3em;

    -webkit-box-shadow: none;
    -moz-box-shadow: none;
    box-shadow: none;
}

.codeblock-text,
.codeblock-text div {
    color: #00000000 !important;
    caret-color: white;
}

.codeblock-text::selection,
.codeblock-text ::selection {
    color: #00000000;
    background-color: #fff;
}

.codeblock-overlay {
    margin-left: -100%;
    z-index: 9;
    pointer-events: none;
    color: black;
    opacity: 1;
    user-select: none;
}
.codeblock {
    display: flex;
    flex-flow: row nowrap;
    padding: 0px;
    background-color: #444;
    overflow: auto;
}`;

// The code for in the webworker
let blobtext = `
function convert(string) {
    return string.replace(/&/g, "&amp;").replace(/</g, "&lt;");
}

let syntax;
self.addEventListener('message', function (e) {
    // Send the message back.
    syntax = e.data.syntax;
    self.postMessage( {text: dostuff(e.data.text), id: e.data.id});
}, false);

function dostuff(actualtext) {
    // Get the innertext from the contenteditable span and replace any double enters, 
    // that happens sometimes and messes with offsets.
    actualtext = actualtext.replace(/\\n\\n/g, "\\n");

    // Split the content into lines and add the color
    let lines = actualtext.split(/(?:\\n)/g);
    let out = "";
    lines.forEach(line => out += addColors(line, "#ffffff", syntax) + "<br>");

    // Replace tab characters to work in the html
    out = out.replace(/\\t/g, "<span style=\\"white-space:pre\\">&#9;</span>");
    return out;
}

// Converts a normal line of code into color formatted html
function addColors(string, normal, syntax) {

    // Get all the indice where to split, and the color at each of those indice
    let splits = [];
    splits[0] = normal;
    splits[string.length] = normal;

    // Go through all the syntax rules
    let copy = string;
    syntax.forEach((rule) => {

        // Find the matches
        let re = rule.regex;
        let cc = copy;
        while ((match = re.exec(cc)) != null) {
            let start = match.index;
            let end = match.index + match[0].length;
            let color = rule.color;

            // Add splits, set the color of the split
            splits[start] = color;
            if (typeof splits[end] === 'undefined') splits[end] = normal;

            // Replace the found string so we cant match it later with other SyntaxRules
            copy = copy.substring(0, start) + new Array(match[0].length + 1).join(" ") + copy.substring(
                end);
        }
    });

    let prev = 0;
    let out = "";
    let pcol = normal;
    splits.forEach((color, l) => {

        // Insert span with the color
        let between = string.substring(prev, l);
        between = convert(between);
        out += "<color style=\\"color: " + pcol + "\\">" + between + "</color>";

        // Set the prev
        prev = l;
        pcol = color;
    });

    // Return the output
    return out;
}
`;

// Add a blob webworker to handle updating colors since it is slow with big texts
window.URL = window.URL || window.webkitURL;
var blob;
try {
    blob = new Blob([blobtext], {
        type: 'application/javascript'
    });
} catch (e) { // Backwards-compatibility
    window.BlobBuilder = window.BlobBuilder || window.WebKitBlobBuilder || window.MozBlobBuilder;
    blob = new BlobBuilder();
    blob.append(blobtext);
    blob = blob.getBlob();
}
var worker = new Worker(URL.createObjectURL(blob));

// Add event listener
worker.addEventListener('message', function a(e) {

    // Add the colored text to the overlay
    overlays[e.data.id].html(e.data.text);
}, false);

// Determines if given variable is a valid syntax
function isSyntax(s) {
    try {
        let a = typeof s === "object" && s[0].color != 'undefined' && s[0].regex != 'undefined';
        return {
            'valid': a,
            'syntax': s
        };
    } catch (a) {
        return {
            'valid': false,
            'syntax': s
        };
    }
}

// Sets the text of the codeblock
$.fn.setText = function (input) {
    this.each(function () {
        if (!$(this).hasClass("codeblock")) {
            return; // do nothing
        }

        let text = $(this).find(".codeblock-text");
        text.html(input.replace(/\n/g, "<br>").replace(/\ /g, "&nbsp;"));
        $(this).refreshColors();
    });
    return $(this);
};

// Refreshes the colors of the text
let overlays = []; // overlay is global since we need it in the 'message' event listener for the webworker
$.fn.refreshColors = function () {
    this.each(function () {
        if (!$(this).hasClass("codeblock")) return;

        // Get the targeted codeblock text and overlay span
        let codeblock = $(this);
        let text = codeblock.find(".codeblock-text");
        let overlay = codeblock.find(".codeblock-overlay").eq(0);

        // Set the syntax to the standard and check if another was given
        let syntax = [];
        if (codeblock.is("[syntax]")) {
            let vname = codeblock.attr("syntax");
            let evalu = eval("try {isSyntax(" + vname + ")} catch(e) { console.log(\"couldn't load " + vname + "\"); false }");
            if (evalu.valid) {
                syntax = evalu.syntax;
            }
        }

        // Stuff that makes it work
        id = Math.random();
        overlays[id] = overlay;

        // handle the color adding using a webworker
        worker.postMessage({
            text: text[0].innerText,
            syntax: syntax,
            id: id
        });
    });
};

$.fn.loadCodeblock = function () {
    this.each(function () {
        if (!$(this).hasClass("codeblock")) return;
        let codeblock = this;
        let editable = $(this).attr("editable") === "true";

        // Make contenteditable span
        var text = document.createElement('span');
        text.spellcheck = false;
        text.contentEditable = editable;
        text.classList.add("codeblock-text");

        // Make span for the color overlay
        var overlay = document.createElement('span');
        overlay.spellcheck = false;
        overlay.classList.add("codeblock-overlay");

        // Add the spans to the codeblock div
        text.innerText = codeblock.innerText;
        codeblock.innerHTML = "";
        codeblock.appendChild(text);
        codeblock.appendChild(overlay);
        $(codeblock).refreshColors();
        $(codeblock).on('keydown', function (e) {

            // For some reason stuff breaks when you press these keys, so just ignore them
            if (e.keyCode == 13 && (e.ctrlKey || e.shiftKey)) {
                return false;
            }
            if (e.keyCode === 9) {
                document.execCommand('insertText', false, '\t');
                return false;
            }
        });
        $(codeblock).on('input', e => {
            $(e.target.parentNode).refreshColors();
        });
    });
};

$(() => {
    // Add styles
    var styles = document.createElement('style');
    styles.innerHTML = css;
    document.head.appendChild(styles);

    // Add actual textarea and color overlay to the codeblocks
    let codeblocks = $('.codeblock');
    for (let i = 0; i < codeblocks.length; i++) {
        codeblocks.eq(i).loadCodeblock();
    }
});

var java = [{
        'color': "rgb(128, 128, 128)",
        'regex': /(\/\/.*)/g
    },
    {
        'color': "rgb(36, 175, 145)",
        'regex': /([\"'])(?:(?=(\\?))\2.)*?\1/g
    },
    {
        'color': "rgb(160, 160, 160)",
        'regex': /(@\w*)/g
    },
    {
        'color': "rgb(204, 108, 29)",
        'regex': /(\bnull\b|\bsynchronized\b|\bthrow\b|\bthrows\b|\btransient\b|\bvolatile\b|\bdo\b|\benum\b|\bfinally\b|\bgoto\b|\blong\b|\bnative\b|\bprotected\b|\bshort\b|\bstrictfp\b|\bswitch\b|\bdefault\b|\bcontinue\b|\bconst\b|\bassert\b|\bbreak\b|\bbyte\b|\bcase\b|\bsuper\b|\btry\b|\bcatch\b|\babstract\b|\belse\b|\binstanceof\b|\bfinal\b|\bextends\b|\bimplements\b|\binterface\b|\btrue\b|\bfalse\b|\bboolean\b|\breturn\b|\bthis\b|\bchar\b|\bvoid\b|\bprivate\b|\bpublic\b|\bclass\b|\bint\b|\bwhile\b|\bfor\b|\bif\b|\bstatic\b|\bfloat\b|\bdouble\b)/g
    },
    {
        'color': "rgb(167, 236, 33)",
        'regex': /(?<=\bnew)\s+(\w+)\s*(?=\()/g
    },
    {
        'color': "rgb(255, 255, 255)",
        'regex': /(?<=import|package).*/g
    },
    {
        'color': "rgb(204, 108, 29)",
        'regex': /(\bimport\b|\bpackage\b|\bnew\b)/g
    },
    {
        'color': "rgb(177, 102, 218)",
        'regex': /(?<=<.*)\w+(?=[^<]*>)(?=.*>.*)/g
    },
    {
        'color': "rgb(36, 181, 59)",
        'regex': /(\w+)\s*(?=\()/g
    },
    {
        'color': "rgb(18, 144, 195)",
        'regex': /\b[A-Z]\w*\b/g
    },
    {
        'color': "rgb(104, 151, 187)",
        'regex': /\b\d+\b/g
    },
    {
        'color': "rgb(243, 236, 121)",
        'regex': /\b\w+\b/g
    }
];
var html = [{
    'color': "#CE9178",
    'regex': /([\"'])(?:(?=(\\?))\2.)*?\1/g
}, {
    'color': "#569CD6",
    'regex': /(?<=<\/|<)\w+/g
}, {
    'color': "#9CDCFE",
    'regex': /(?<=<.*)\w+(?=[^<]*>)(?=.*>.*)/g
}, ];

var json = [{
    'color': "#9CDCFE",
    'regex': /(?:(?<=,\s*|{\s*|[^:]\s+))["].+?["](?=\s*:)/g
}, {
    'color': "#CE9178",
    'regex': /([\"'])(?:(?=(\\?))\2.)*?\1/g
}, {
    'color': "#569CD6",
    'regex': /\btrue\b|\bfalse\b/g
}, {
    'color': "#B5CEA8",
    'regex': /\b[0-9]+\b/g
}, ];