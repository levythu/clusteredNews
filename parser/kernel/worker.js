var conf=require("../conf/configure");
var html=require("./html");
var url=require("url");

var natural=require("natural");
var tokenizer = new natural.WordTokenizer();
natural.PorterStemmer.attach();

var model=require("../model/mongo");
var db=model.db;
var RAWHTML=model.rawhtml;
var NETTOPO=model.nettopo;
var RESMATX=model.terms;
var LEXINFO=model.lex;

var workersAlive=0;
var urlsQuota=0;
var urlsAllowed=conf.scheduler.max_new_urls_per_launch;

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
    if (urlsAllowed>=0)
        urlsQuota=urlsAllowed;
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

// insert all the elements in the list to lex
// list: [ori, stm, count]
function chainInsert_LEX(inputList, pos, callback)
{
    if (pos==inputList.length)
    {
        callback();
        return;
    }
    db[LEXINFO].update(
    {
        original: inputList[pos][0],
        stemmed: inputList[pos][1]
    },
    {
        $inc: {count: inputList[pos][2]}
    }, {upsert: true}, function(err, res)
    {
        process.nextTick(function()
        {
            chainInsert_LEX(inputList, pos+1, callback);
        });
    });
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
            urlsQuota--;
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
    stemRecord={};
    for (var i=0; i<contentInHier.length; i++)
    {
        var tRes=tokenizer.tokenize(contentInHier[i]);
        for (var j=0; j<tRes.length; j++)
        {
            var ori=tRes[j].toLowerCase();
            var stm=natural.PorterStemmer.stem(ori);
            tRes[j]=stm;
            if (!(ori in stemRecord))
                stemRecord[ori]={};
            var t=stemRecord[ori];
            if (!(stm in t))
                t[stm]=0;
            t[stm]++;
        }
        //var tRes=contentInHier[i].tokenizeAndStem();
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
    callback(result, stemRecord);
}

// if the url path starts with "/yyyy/mm/dd" (cnn style), fetch it. otherwise returns empty string
// UPDATE: inside the path is ok.
function getPrefixDate(theURL)
{
    var path=url.parse(theURL).path;
    var res=/\/(\d\d\d\d)\/(\d\d)\/(\d\d)/.exec(path);
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
                    if (urlsAllowed<0 || urlsQuota>0)
                        validList.push(res);
                }
            }
            // Defining the end point.
            var theEndCount=0;
            var theEnd=function()
            {
                theEndCount++;
                if (theEndCount>=4)
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
            countWords(dataInHier, function(wordsMap, stemMap)
            {
                //convert stemmap to [ori, stm, count]
                var stemList=[];
                for (var i in stemMap)
                    for (var j in stemMap[i])
                        stemList.push([i, j, stemMap[i][j]]);
                chainInsert_LEX(stemList, 0, function()
                {
                    theEnd();
                });
                //==
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
