function Queue()
{
    this.map=[null, null];
    this.nxt=[1, -1];
    this.prv=[-1, 0];
    this.reclaim=[];
    this.head=0;
    this.tail=1;
    this.len=0;
}
Queue.prototype.GetLen=function()
{
    return this.len;
}
Queue.prototype.Clear=function()
{
    this.map=[null, null];
    this.nxt=[1, -1];
    this.prv=[-1, 0];
    this.reclaim=[];
    this.head=0;
    this.tail=1;
    this.len=0;
}
Queue.prototype.EnQueue=function(element)
{
    var position;
    if (this.reclaim.length==0)
    {
        position=this.map.length;
        this.map.push(null);
        this.nxt.push(-1);
        this.prv.push(-1);
    }
    else
        position=this.reclaim.pop();
    this.map[position]=element;
    this.prv[position]=this.head;
    this.nxt[position]=this.nxt[this.head];
    this.nxt[this.prv[position]]=position;
    this.prv[this.nxt[position]]=position;

    this.len++;
}
Queue.prototype.DeQueue=function()
{
    if (this.len==0)
        return null;
    var position=this.prv[this.tail];
    this.prv[this.nxt[position]]=this.prv[position];
    this.nxt[this.prv[position]]=this.nxt[position];
    this.reclaim.push(position);
    this.len--;
    return this.map[position];
}
module.exports=Queue;
