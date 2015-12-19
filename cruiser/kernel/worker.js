var conf=require("../conf/configure");

var model=require("../model/mongo");
var db=model.db;
var RAWHTML=model.rawhtml;

var isWorking=false;
var isRequired=false;

function reportDeath()
{
    if (isRequired)
    {
        isRequired=false;
        process.nextTick(work);
        return;
    }
    isWorking=false;
}
function batchWorkers()
{
    if (isWorking)
    {
        isRequired=true;
        return;
    }
    isWorking=true;
    process.nextTick(work);
}
module.exports=batchWorkers;

function scanOutdatedDocs(callback)
{
    var tscale=conf.worker.fetched_html_expire_in_seconds;
    if (tscale<0)
    {
        process.nextTick(callback);
        return;
    }
    var current=Date.now();
    var outdatedBefore=current-tscale*1000;
    db[RAWHTML].update(
    {
        fetchtime: {$lt: outdatedBefore},
        $or: [{status: 2}, {status: 3}]
    },
    {
        $set: {status: 1}
    }, {multi: true}, function(err, result)
    {
        if (err)
            console.log((new Date()).toUTCString(), ">\tFail to update outdated pages.");
        else
            console.log((new Date()).toUTCString(), ">\tUpdate "+result.n+" outdated pages.");
        process.nextTick(callback);
    });
}
function unlockEntries(callback)
{
    var tscale=conf.worker.locked_html_expire_in_seconds;
    if (tscale<0)
    {
        process.nextTick(callback);
        return;
    }
    var current=Date.now();
    var outdatedBefore=current-tscale*1000;
    db[RAWHTML].update(
    {
        status: 999,
        locktime: {$lt: outdatedBefore},
        raw: {$exists: true}
    },
    {
        $set: {status: 2}
    }, {multi: true}, function(err, result)
    {
        if (err)
            console.log((new Date()).toUTCString(), ">\tFail to unlock on-parsing pages.");
        else
            console.log((new Date()).toUTCString(), ">\tUnlock "+result.n+" on-parsing pages.");

        db[RAWHTML].update(
        {
            status: 999,
            locktime: {$lt: outdatedBefore},
            raw: {$exists: false}
        },
        {
            $set: {status: 0}
        }, {multi: true}, function(err, result)
        {
            if (err)
                console.log((new Date()).toUTCString(), ">\tFail to unlock on-fetching pages.");
            else
                console.log((new Date()).toUTCString(), ">\tUnlock "+result.n+" on-fetching pages.");
            process.nextTick(callback);
        });
    });
}
function refetchBroken(callback)
{
    var tscale=conf.worker.refetch_temporarily_unavailable_pages_in_seconds;
    if (tscale<0)
    {
        process.nextTick(callback);
        return;
    }
    var current=Date.now();
    var outdatedBefore=current-tscale*1000;
    db[RAWHTML].update(
    {
        status: 901,
        fetchtime: {$lt: outdatedBefore}
    },
    {
        $set: {status: 0}
    }, {multi: true}, function(err, result)
    {
        if (err)
            console.log((new Date()).toUTCString(), ">\tFail to reload broken pages.");
        else
            console.log((new Date()).toUTCString(), ">\tReload "+result.n+" broken pages.");
        process.nextTick(callback);
    });
}
function work()
{
    unlockEntries(function()
    {
        refetchBroken(function()
        {
            scanOutdatedDocs(function()
            {
                reportDeath();
            });
        });
    });
}
