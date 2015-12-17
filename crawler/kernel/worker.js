// Worker module. When launched, it will batch some urls unfetched in the database
// and request them, then store back. The number of workers are limited.

var request=require("./request");
var conf=require("../conf/configure");

var model=require("../model/mongo");
var db=model.db;
var RAWHTML=model.rawhtml;

var workersAlive=0;
var fetchCount=0;

function reportDeath()
{
    workersAlive--;
    if (conf.log.log_workers_num>0 && (workersAlive % conf.log.log_workers_num==0 || workersAlive==conf.scheduler.max_worker))
    {
        console.log((new Date()).toUTCString(), ">\tWorkers died to "+workersAlive);
    }
}
function batchWorkers()
{
    console.log((new Date()).toUTCString(), ">\tSpawn launched");
    fetchCount=0;
    while (workersAlive<=conf.scheduler.max_worker)
    {
        workersAlive++;
        if (conf.log.log_workers_num>0 && (workersAlive % conf.log.log_workers_num==0 || workersAlive==conf.scheduler.max_worker))
        {
            console.log((new Date()).toUTCString(), ">\tWorkers reached "+workersAlive);
        }
        process.nextTick(work);
    }
}
module.exports=batchWorkers;

function work()
{
    if (fetchCount>conf.scheduler.max_fetches_per_tide)
        return;

    db[RAWHTML].findAndModify({
        query:
        {
            $or:
            [
                {status: 0},
                {status: 1}
            ]
        },
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
            url: true
        }
    }, function(err, doc)
    {
        if (err || doc==null)
        {
            reportDeath();
            return;
        }
        fetchCount++;
        request.GET(doc.url, function(isContent, content)
        {
            var now=new Date();
            console.log(now.toUTCString(), ">\tFetched URL "+doc.url);
            if (!isContent)
            {
                // REDIRECT, fulfill the old one with useless info and save the new url into the database.
                db[RAWHTML].update({url: doc.url},
                {
                    $set:
                    {
                        status: 2,
                        raw: "",
                        fetchtime: now.getTime()
                    }
                }, {multi: false}, function()
                {
                    db[RAWHTML].update({
                        url: content
                    },
                    {
                        $set: {status: 0}
                    }, {upsert: true}, function()
                    {
                        process.nextTick(work);
                    });
                });
                return;
            }
            db[RAWHTML].update({url: doc.url},
            {
                $set:
                {
                    status: 2,
                    raw: content,
                    fetchtime: now.getTime()
                }
            }, {multi: false}, function()
            {
                process.nextTick(work);
            });
        }, function()
        {
            db[RAWHTML].update({url: doc.url},
            {
                $set: {status: 0}
            }, {multi: false}, function()
            {
                process.nextTick(work);
            });
        });
    });
}
