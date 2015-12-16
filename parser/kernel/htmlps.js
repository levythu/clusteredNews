var htmlparser=require("htmlparser2");
var request=require("./request");

var Hierarchy=
{
    "MAX_H": 9,

    "title": 0,
    "h1": 1,
    "h2": 2,
    "h3": 3,
    "h4": 4,
    "h5": 5,
    "h6": 6,
    "h7": 7,
    "h8": 8,
    "others": 9
};
function parse(content, callback)
{
    hStack=[];
    result=[];
    for (var i=0; i<=Hierarchy.MAX_H; i++)
        result.push("");
    var parser = new htmlparser.Parser(
    {
    	onopentag: function(name, attribs)
        {
            var lcName=name.toLowerCase();
    		if (lcName in Hierarchy)
            {
                hStack.push(Hierarchy[lcName]);
            }
            else if (lcName=="a")
            {
                // URL crawled!
                // TODO: insert.
            }
    	},
    	ontext: function(text)
        {
            var h=hStack.length==0?Hierarchy.MAX_H:hStack[hStack.length-1];
            result[h]+=" "+text;
    	},
    	onclosetag: function(tagname)
        {
            var lcName=tagname.toLowerCase();
    		if (lcName in Hierarchy)
            {
                var t=hStack.pop();
                if (t!=Hierarchy[lcName])
                {
                    console.warn((new Date()).toUTCString(), ">\tOut of order when parsing: "+tagname);
                    if (t!=null)
                        hStack.push(t);
                }
            }
    	},
        onend: function()
        {
            callback(result);
        }
    }, {decodeEntities: true});
    parser.write(content);
    parser.end();
};

request.GET("http://www.levy.at/me?lang=en-us", function(isCon, data)
{
    console.log("stparse");
    parse(data, function(res)
    {
        console.log(res);
    });
});
