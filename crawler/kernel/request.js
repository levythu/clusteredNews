// http request module. Maybe altered to proxy via SOCKS5.

var request=require("request");
var conf=require("../conf/configure");

function GET(url, onSucc, onFail)
{
    request({
        url: url,
        followRedirect: false
    }, function(error, response, body)
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
            onSucc(false, response.headers.location);
            return;
        }
        var status=""+status;
        if (status[0]=="4")
            onFail(true);
        else if (status[0]=="5")
            onFail();
        else
            onSucc(true, body);
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
    request({
        url: url,
        followRedirect: false
    }, function(error, response, body)
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
