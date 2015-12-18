// http request module. Maybe altered to proxy via SOCKS5.

var http=require("http");
var conf=require("../conf/configure");

function GET(url, onSucc, onFail)
{
    http.get(url, function(res)
    {
        var status=res.statusCode;
        if (status==301 || status==302)
        {
            // Move temporarily/permanantly
            if (res.headers.location==null)
            {
                onFail();
                return;
            }
            onSucc(false, res.headers.location);
            return;
        }
        // TODO: set encoding according to content-type
        res.setEncoding('utf8');
        var body="";
        res.on('data', function(chunk)
        {
            body+=chunk;
        });
        res.on('end', function()
        {
            onSucc(true, body);
        });
    }).on("error", function(err)
    {
        onFail(err);
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
    http.get(url, function(res)
    {
        var status=res.statusCode;
        if (status==301 || status==302)
        {
            // Move temporarily/permanantly
            if (res.headers.location==null)
            {
                onFail();
                return;
            }
            process.nextTick(function()
            {
                GETF(url, onSucc, onFail, ttl-1);
            });
            return;
        }
        var statusABS=status%100;
        if (statusABS==4 || statusABS==5)
        {
            onFail();
            return;
        }
        res.setEncoding('utf8');
        var body="";
        res.on('data', function(chunk)
        {
            body+=chunk;
        });
        res.on('end', function()
        {
            onSucc(body);
        });
    }).on("error", function(err)
    {
        onFail(err);
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
