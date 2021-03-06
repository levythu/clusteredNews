// html utilities including a parser and a url generator.

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
var blackList=
{
    "script": 0,
    "style": 0
};
var whiteList=
{
    "title": 0,
    "h1": 0,
    "h2": 0,
    "h3": 0,
    "h4": 0,
    "h5": 0,
    "h6": 0,
    "h7": 0,
    "h8": 0,
    "p":  0
}
function parse(content, callback, onerror)
{
    var hStack=[];
    var result=[];
    var hrefList=[];
    var pContent="";
    var scriptTags=0;
    var whiteTags=0;
    for (var i=0; i<=Hierarchy.MAX_H; i++)
        result.push("");
    var parser = new htmlparser.Parser(
    {
    	onopentag: function(name, attribs)
        {
            var lcName=name.toLowerCase();
            if (lcName in blackList)
                scriptTags++;
            if (lcName in whiteList)
                whiteTags++;
    		if (lcName in Hierarchy)
            {
                hStack.push(Hierarchy[lcName]);
            }
            else if (lcName=="a")
            {
                if (attribs.href!=null)
                {
                    // URL crawled!
                    hrefList.push(attribs.href);
                }
            }
    	},
    	ontext: function(text)
        {
            if (scriptTags>0)
                return;
            if (whiteTags<=0)
                return;
            var h=hStack.length==0?Hierarchy.MAX_H:hStack[hStack.length-1];
            pContent+="\n"+text;
            result[h]+=" "+text;
    	},
    	onclosetag: function(tagname)
        {
            var lcName=tagname.toLowerCase();
            if (lcName in blackList)
                scriptTags--;
            if (lcName in whiteList)
                whiteTags--;
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
            callback(result, hrefList, pContent);
        },
        onerror: function(err)
        {
            onerror(err);
        }
    }, {decodeEntities: true});
    parser.write(content);
    parser.end();
};

exports.parse=parse;
exports.Hierarchy=Hierarchy;


(function()
{
    request.GET("http://www.cnn.com/2015/12/16/arts/gallery/nassim-rouchiche-ghost-migrants-ca-va/index.html", function(isCon, data)
    {
        parse(data, function(r, h, c)
        {
            console.log(c);
        });
    });
});
