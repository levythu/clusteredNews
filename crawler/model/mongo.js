// Component for linking to MongoDB.
/*******************************************************************************
# Designs for collections:

## rawhtml
The raw HTML of each crawled webpage, one entry per page.
### Schema:
    {
        url: [string] // full url of the string
        status: [enum-int]
            // 0: recorded but not feteched (at this point all the data except url/status are absent)
            // 1: content outdated (0/1 should be equally treated when fetching)
            // 2: fetched but not parsed
            // 3: parsed
        raw: [string] // raw content in html of the page.
        fetchtime: [int]    // UNIX-timestamp for the time when the page was fetched.
    }

## terms
The term-document sparse matrix, one document per entry.
*******************************************************************************/
var conf=require("../conf/configure");
var mongojs=require('mongojs');

var collections=["rawhtml", "nettopo", "terms"];
var db=mongojs(conf.database.accessSchema, collections);

for (var i=0; i<collections.length; i++)
    exports[collections[i]]=collections[i];
exports.db =db;
