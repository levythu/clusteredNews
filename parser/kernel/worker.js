var conf=require("../conf/configure");
var html=require("./html");
var url=require("url");

var natural=require("natural");
natural.PorterStemmer.attach();

var model=require("../model/mongo");
var db=model.db;
var RAWHTML=model.rawhtml;
var NETTOPO=model.nettopo;
var RESMATX=model.terms;

var workersAlive=0;
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

function validateURL(urlval)
{
    var hn=(url.parse(urlval)).hostname;
    if (conf.worker.whitelist!=null)
    {
        var wl=conf.worker.whitelist;
        for (var i=0; i<wl.length; i++)
            if (wl[i].exec(hn)!=null)
                return true;
        return false;
    }
    else
    {
        var bl=conf.worker.blacklist;
        if (bl==null)
            return true;
        for (var i=0; i<bl.length; i++)
            if (bl[i].exec(hn)!=null)
                return false;
        return true;
    }
}

// insert all the elements in the list to rawhtml waitling list.
function chainInsert(inputList, pos, callback)
{
    if (pos==inputList.length)
    {
        callback();
        return;
    }
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
        db[RAWHTML].update(
        {
            url: inputList[pos]
        },
        {
            $set: {useless: false}
        }, {upsert: true}, function(err, res)
        {
            if (err==null && res.upserted!=null)
            {
                db[RAWHTML].update({url: inputList[pos]},
                {
                    $set: {status: 0}
                }, {}, function()
                {
                    process.nextTick(function()
                    {
                        chainInsert(inputList, pos+1, callback);
                    });
                });
                return;
            }
            process.nextTick(function()
            {
                chainInsert(inputList, pos+1, callback);
            });
        });
    });
}

function countWords(contentInHier, callback)
{
    result={};
    for (var i=0; i<contentInHier.length; i++)
    {
        var tRes=contentInHier[i].tokenizeAndStem();
        for (var j=0; j<tRes.length; j++)
        {
            if (!(tRes[j] in result))
                result[tRes[j]]=0;
            result[tRes[j]]++;
        }
    }
    callback(result);
}

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
            // parse HTML successfully
            var topo={url: doc.url};
            var validList=[];
            for (var i=0; i<urlList.length; i++)
            {
                var res=url.resolve(doc.url, urlList[i]);
                if (validateURL(res))
                {
                    topo[res]=1;
                    validList.push(res);
                }
            }
            // Defining the end point.
            var theEndCount=0;
            var theEnd=function()
            {
                theEndCount++;
                if (theEndCount>=3)
                {
                    db[RAWHTML].update(
                    {
                        $set:
                        {
                            status: 3,
                            //content: xxx,
                            title: dataInHier[html.Hierarchy.title]
                        }
                    }, {multi: false}, function()
                    {
                        console.log((new Date()).toUTCString(), ">\tparsed content from "+doc.URL);
                        process.nextTick(work);
                    });
                }
            }
            // now start three concurrent routine: updating new url to db, split words and check them in,
            // and recording topology to db.
            chainInsert(validList, 0, theEnd);
            db[NETTOPO].update(
            {
                url: doc.url
            }, topo, {upsert: true}, function()
            {
                theEnd();
            });
            countWords(dataInHier, function(wordsMap)
            {
                wordsMap["__URL__"]=doc.url;
                db[RESMATX].upload(
                {
                    __URL__: doc.url
                }, wordsMap, {upsert: true}, function()
                {
                    theEnd();
                });
            });
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
