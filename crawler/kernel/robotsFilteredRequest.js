var request=require("./request");
var robots=require("./robots");

function GET(url, onSucc, onFail)
{
    robots.robotsCheck(url, function(res)
    {
        if (!res)
            onFail();
        else
            robots.controlAccess(url, function()
            {
                request.GET(url, onSucc, onFail);
            });
    });
}

exports.GET=GET;
