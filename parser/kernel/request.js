// http request module. Maybe altered to proxy via SOCKS5.
// for test only

var http = require("http");

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

exports.GET=GET;

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
