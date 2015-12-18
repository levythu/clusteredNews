// http request module. Maybe altered to proxy via SOCKS5.

var request=require("request");
var conf=require("../conf/configure");

function GET(url, onSucc, onFail)
{
    //console.log("GET ", url);
    var opt=
    {
        url: url,
        followRedirect: false
    };
    if (conf.worker.fetch_time_out_in_ms>0)
        opt.timeout=conf.worker.fetch_time_out_in_ms;
    request(opt, function(error, response, body)
    {
        if (error)
        {
            //console.log("GET fail ", url);
            onFail();
            return;
        }
        var status=response.statusCode;
        if (status==301 || status==302)
        {
            if (response.headers.location==null)
            {
                //console.log("GET fail ", url);
                onFail();
                return;
            }
            //console.log("GET succ ", url);
            onSucc(false, response.headers.location);
            return;
        }
        var status=""+status;
        if (status[0]=="4")
        {
            //console.log("GET fail ", url);
            onFail(true);
        }
        else if (status[0]=="5")
        {
            //console.log("GET fail ", url);
            onFail();
        }
        else
        {
            //console.log("GET succ ", url);
            onSucc(true, body);
        }
    });
}

function GETF(url, onSucc, onFail, ttl)
{
    if (ttl==null)
        ttl=conf.request.default_max_redirect_allowed+1;
    if (ttl==0)
    {
        onFail();
        return;
    }
    var opt=
    {
        url: url,
        followRedirect: false
    };
    if (conf.worker.fetch_time_out_in_ms>0)
        opt.timeout=conf.worker.fetch_time_out_in_ms;
    request(opt, function(error, response, body)
    {
        if (error)
        {
            onFail();
            return;
        }
        var status=response.statusCode;
        if (status==301 || status==302)
        {
            if (response.headers.location==null)
            {
                onFail();
                return;
            }
            process.nextTick(function()
            {
                GETF(response.headers.location, onSucc, onFail, ttl-1);
            });
            return;
        }
        var status=""+status;
        if (status[0]=="4" || status[0]=="5")
            onFail();
        else
            onSucc(body);
    });
}

exports.GET=GET;
exports.GETF=GETF;

/*
exports.GET("http://edition.cnn.com", function()
{
    console.log(arguments);
}, function(err)
{
    console.log("FAIL.");
    console.log(err);
});
*/
