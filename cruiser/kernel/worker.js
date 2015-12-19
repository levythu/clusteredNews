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

}
function work()
{
}
