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
    if (workersAlive==0 && conf.scheduler.exit_on_zero===true)
        process.exit(0);
}
function batchWorkers()
{
    console.log((new Date()).toUTCString(), ">\tSpawn launched");
    while (workersAlive<conf.scheduler.max_worker)
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
}
function removeHash(u)
{
    var t=url.parse(u);
    t.hash="";
    return url.format(t)
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
            if (i==0)
            {
                // title!
                result[tRes[j]]+=10;
            }
            else
            {
                result[tRes[j]]++;
            }
        }
    }
    callback(result);
}

// if the url path starts with "/yyyy/mm/dd" (cnn style), fetch it. otherwise returns empty string
function getPrefixDate(theURL)
{
    var path=url.parse(theURL).path;
    var res=/^\/(\d\d\d\d)\/(\d\d)\/(\d\d)/.exec(path);
    if (res==null)
        return "";
    return res[1]+res[2]+res[3];
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
            raw: true,
            _id: true
        }
    }, function(err, doc)
    {
        if (err || doc==null)
        {
            reportDeath();
            return;
        }
        var vTime=getPrefixDate(doc.url);
        html.parse(doc.raw, function(dataInHier, urlList, pContent)
        {
            // parse HTML successfully
            var topo=[];
            var validList=[];
            for (var i=0; i<urlList.length; i++)
            {
                var res=url.resolve(doc.url, urlList[i]);
                if (validateURL(res))
                {
                    res=removeHash(res);
                    topo.push({
                        fromurl: doc.url,
                        tourl: res
                    });
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
                        url: doc.url
                    },
                    {
                        $set:
                        {
                            status: 3,
                            content: pContent,
                            title: dataInHier[html.Hierarchy.title],
                            newsTime: vTime
                        }
                    }, {multi: false}, function()
                    {
                        console.log((new Date()).toUTCString(), ">\tparsed content from "+doc.url);
                        process.nextTick(work);
                    });
                }
            }
            // now start three concurrent routine: updating new url to db, split words and check them in,
            // and recording topology to db.
            chainInsert(validList, 0, theEnd);
            db[NETTOPO].remove(
            {
                fromurl: doc.url
            }, {}, function()
            {
                db[NETTOPO].insert(topo, function()
                {
                    theEnd();
                });
            });
            countWords(dataInHier, function(wordsMap)
            {
                wordsMap["__url__"]=doc.url;
                wordsMap["__id__"]=doc._id;
                wordsMap["__newsTime__"]=vTime;
                db[RESMATX].update(
                {
                    __url__: doc.url
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
