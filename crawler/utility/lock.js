// Multiple-Lock, use queue to maintain holder. Each lock instance could be held by
// at most k functions. The rests have to wait.

var Queue=require("./queue");

function Lock(maxHolder)
{
    if (maxHolder==null)
        this.rest=1;
    else
        this.rest=maxHolder;
    this.waitingQueue=new Queue();
}
Lock.prototype.Lock=function(callback)
{
    if (this.rest==0)
    {
        // No more lock to use, stuck it.
        this.waitingQueue.EnQueue(callback);
        return;
    }
    this.rest--;
    callback();
}
Lock.prototype.Unlock=function()
{
    if (this.waitingQueue.len>0)
    {
        process.nextTick(this.waitingQueue.DeQueue());
        return;
    }
    this.rest++;
}
module.exports=Lock;

(function()
{
    var lk=new Lock(2);
    lk.Lock(function()
    {
        console.log(1);
        setTimeout(function()
        {
            lk.Unlock();
        }, 3000);
    });
    lk.Lock(function()
    {
        console.log(2);
        setTimeout(function()
        {
            lk.Unlock();
        }, 10000);
    });
    lk.Lock(function()
    {
        console.log(3);
        setTimeout(function()
        {
            lk.Unlock();
        }, 500);
    });
    lk.Lock(function()
    {
        console.log(4);
        lk.Unlock();
    });
});
