// init the db. create db term, setup index

var conf=require("../conf/configure");

var model=require("../model/mongo");
var db=model.db;
var RAWHTML=model.rawhtml;
var TERMMAT=model.terms;
var NETTOPO=model.nettopo;
var LEXINFO=model.lex;

function eIndex(collection, indexContent, callback)
{
    db[collection].ensureIndex(indexContent, function(err)
    {
        if (err)
        {
            console.log((new Date()).toUTCString(), ">\tFail to ensure index for "+collection+"."+JSON.stringify(indexContent));
            process.exit(1);
        }
        console.log((new Date()).toUTCString(), ">\tSucceed ensuring index for "+collection+"."+JSON.stringify(indexContent));
        process.nextTick(callback);
    });
}

eIndex(RAWHTML, {url: 1}, function()
{
    eIndex(RAWHTML, {status: 1}, function()
    {
        eIndex(RAWHTML, {fetchtime: 1}, function()
        {
            eIndex(TERMMAT, {__url__: 1}, function()
            {
                eIndex(TERMMAT, {__id__: 1}, function()
                {
                    eIndex(NETTOPO, {fromurl: 1}, function()
                    {
                        eIndex(NETTOPO, {tourl: 1}, function()
                        {
                            eIndex(LEXINFO, {original: 1}, function()
                            {
                                eIndex(LEXINFO, {stemmed: 1}, function()
                                {
                                    console.log((new Date()).toUTCString(), ">\tAll done. Now exiting...");
                                    process.exit(0);
                                });
                            });
                        });
                    });
                });
            });
        });
    });
});
