var conf=require("../conf/configure");
var html=require("./html");

var model=require("../model/mongo");
var db=model.db;
var RAWHTML=model.rawhtml;
var NETTOPO=model.nettopo;
var RESMATX=model.terms;

function work()
{
    db[RAWHTML].findAndModify({
        query: {status: 2},
        update:
        {
            $set:
            {
                status: 999,
                locktime: Date.now()
            }
        },
        fields:
        {
            url: true,
            raw: true
        }
    }, function(err, doc)
    {
        if (err || doc==null)
        {
            reportDeath();
            return;
        }
        html.parse(doc.raw, function(dataInHier, urlList)
        {

        }, function()
        {
            // parsing error;
            db[RAWHTML].update(
            {
                $set: {status: 2}
            }, {multi: false}, function()
            {
                process.nextTick(work);
            });
        });
    });
}
