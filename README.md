# codeblock

### Textarea with support for multicolor text. ###
**This library requires JQuery!**

Examples:

Just a textarea with no syntax highlighting:
```HTML
<script src="./codeblock.js"></script>
<div class="codeblock"></div>
```

This snippet will show any text between quotation marks in this color: #ABCDEF
```HTML
<script src="./codeblock.js"></script>
<script>
  var name = [{
    'color':'#ABCDEF', 
    'regex':/([\"'])(?:(?=(\\?))\2.)*?\1/g
  }]
</script>
<div syntax="name" class="codeblock">Hello "World"</div>
```
The syntax highlighting will go through the array top to bottom, and any text that is matched by the regex will not be matchable by the next regex.

Here is another example using an included syntax 'java':
```HTML
<script src="./codeblock.js"></script>
<div syntax="java" class="codeblock">public static void main(String[] arg) {}</div>
```

If you don't want the codeblock to be editable, simply add editable="false":
```HTML
<script src="./codeblock.js"></script>
<div editable="false" syntax="json" class="codeblock"> { "id" : 33, "content" : "This is an example", "ready" : false } </div>
```

You can also set the text using JavaScript:
```HTML
<script src="./codeblock.js"></script>
<div id="code" editable="true" syntax="java" class="codeblock"></div>
<script>
  $("#code").setText("String text = \"This text will show up in the codeblock\";");
</script>
```

This is something quick I have thrown together for a project, if you have any suggestions or see anything that can be optimized feel free to contact me. If you have any questions you can find me on Discord @Kaixo#0001
