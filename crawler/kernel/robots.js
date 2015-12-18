// modules to support robots.txt.
// no persistent store is made for robots.txt: they're only cached in memory.
// it may expire, indicated by configure.

var request=require("./request");
var url=require("url");
var lock=require("../utility/lock");
var conf=require("../conf/configure");

var globalCache={};
var robotsExpTime=conf.worker.robots_info_expire_in_seconds*1000;

function compensateRule(oRule)
{
    var str=oRule.replace(/\*+/g, ".*");
    if (str!="" && str[0]!="/")
        str="/"+str;
    str="^"+str;
    return new RegExp(str);
}
function judge(tURL, robotInfo)
{
    for (var i=0; i<robotInfo.length; i++)
        if (robotInfo[i][1].exec((url.parse(tURL)).path)!=null)
            return robotInfo[i][0];
    return true;
};
function getROBOTS_TXT(targetURL, callback)
{

    var tName=url.resolve(targetURL, "/robots.txt");
    if (!(tName in globalCache))
    {
        globalCache[tName]=
        {
            mutex: new lock(),
            fetchtime: 0,
            rules: null
        };
    }
    var obj=globalCache[tName];
    if (obj.rules!=null && (robotsExpTime<0 || robotsExpTime+obj.fetchtime>=Date.now()))
    {
        callback(judge(targetURL, obj.rules));
        return;
    }
    obj.mutex.Lock(function()
    {
        if (obj.rules!=null && (robotsExpTime<0 || robotsExpTime+obj.fetchtime>=Date.now()))
        {
            obj.mutex.Unlock();
            callback(judge(targetURL, obj.rules));
            return;
        }
        request.GETF(tName, function(body)
        {
            obj.rules=[];
            obj.fetchtime=Date.now();

            var res=body.split("\n");
            var running_agent_st=-1;
            var running_agent_ed=-1;
            for (var i=0; i<res.length; i++)
            {
                if (/User-agent:\s*\*/i.exec(res[i])!=null)
                    running_agent_st=i;
                else if (running_agent_st>=0 && /User-agent:.*/i.exec(res[i])!=null)
                    running_agent_ed=i;
            }
            if (running_agent_st==-1)
                running_agent_st=0;
            if (running_agent_ed==-1)
                running_agent_ed=res.length;
            for (var i=running_agent_st+1; i<running_agent_ed; i++)
            {
                var mc=/disallow:\s*(.*)/i.exec(res[i]);
                if (mc!=null)
                {
                    try
                    {
                        obj.rules.push([false, compensateRule(mc[1])]);
                    }
                    catch (e)
                    { }
                    continue;
                }
                mc=/allow:\s*(.*)/i.exec(res[i]);
                if (mc!=null)
                {
                    try
                    {
                        obj.rules.push([true, compensateRule(mc[1])]);
                    }
                    catch (e)
                    { }
                    continue;
                }
            }
            obj.mutex.Unlock();
            console.log((new Date()).toUTCString(), ">\tFetched RobotsRule "+tName);
            callback(judge(targetURL, obj.rules));
        }, function()
        {
            fetchTime=Date.now();
            rules=[];
            obj.mutex.Unlock();
            console.log((new Date()).toUTCString(), ">\tFetched RobotsRule "+tName);
            callback(judge(targetURL, obj.rules));
        });
    });
}

module.exports=getROBOTS_TXT;

(function()
{
    getROBOTS_TXT("http://edition.cnn.com/2015/12/17/middleeast/syria-russian-warship-moskva/index.html", function(a)
    {
        console.log(a);
    });
    getROBOTS_TXT("http://edition.cnn.com", function(a)
    {
        console.log(a);
    });
    getROBOTS_TXT("http://edition.cnn.com/partners/ipad/live-video.json?asd", function(a)
    {
        console.log(a);
    });
    getROBOTS_TXT("http://edition.cnn.com/partners/ipod", function(a)
    {
        console.log(a);
    });
});
