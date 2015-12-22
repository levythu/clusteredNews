var model=require("../model/mongo");
var db=model.db;
var RAWHTML=model.rawhtml;
var TERMMAT=model.terms;
var NETTOPO=model.nettopo;
var LEXINFO=model.lex;

var url=require("url");

var blackListForPath=
[
    /^\/videos?\//i
];

function checkValid(theURL)
{
    for (var i=0; i<blackListForPath.length; i++)
    {
        if (blackListForPath[i].exec((url.parse(theURL)).path)!=null)
            return false;
    }
    return true;
}
function batchRemove(dbname, pName, theList, pos, callback)
{
    if (pos==theList.length)
    {
        callback();
        return;
    }
    var c={};
    c[pName]=theList[pos];
    db[dbname].remove(c,function()
    {
        console.log("Removed from "+dbname+": "+theList[pos]);
        process.nextTick(function()
        {
            batchRemove(dbname, pName, theList, pos+1, callback);
        });
    });
}
function eliminateFromRAWHTML(callback)
{
    db[RAWHTML].find(
    {
        status: {$ne: 999}
    }, {url: true}, function(err, docs)
    {
        if (err || docs.length==0)
        {
            callback();
            return;
        }
        var black=[];
        for (var i=0; i<docs.length; i++)
        {
            if (!checkValid(docs[i].url))
                black.push(docs[i].url);
        }
        batchRemove(RAWHTML, "url", black, 0, callback);
    });
}
function eliminateFromTERM(callback)
{
    db[TERMMAT].find({}, {__url__: true}, function(err, docs)
    {
        if (err || docs.length==0)
        {
            callback();
            return;
        }
        var black=[];
        for (var i=0; i<docs.length; i++)
        {
            if (!checkValid(docs[i].__url__))
                black.push(docs[i].__url__);
        }
        batchRemove(TERMMAT, "__url__", black, 0, callback);
    });
}

eliminateFromRAWHTML(function()
{
    eliminateFromTERM(function()
    {
        process.exit(0);
    });
});
