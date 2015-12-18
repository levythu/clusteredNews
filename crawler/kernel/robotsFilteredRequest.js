var request=require("./request");
var robotsCheck=require("./robots");

function GET(url, onSucc, onFail)
{
    robotsCheck(url, function(res)
    {
        if (!res)
            onFail();
        else
            request.GET(url, onSucc, onFail);
    });
}

exports.GET=GET;
