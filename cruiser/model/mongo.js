// Component for linking to MongoDB.
/*******************************************************************************
# Designs for collections:

## rawhtml
The raw HTML of each crawled webpage, one entry per page.
### Schema
    {
        url: [string] // full url of the page
        status: [enum-int]
            // 0: recorded but not feteched (at this point all the data except url/status are absent)
            // 1: content outdated (0/1 should be equally treated when fetching)
            // 2: fetched but not parsed
            // 3: parsed
            // 901: temporarily bad, try to fetch it in the future
            // 902: permanantly bad, never fetch it again
            // 999: locked
        raw: [string] // raw content in html of the page.
        content: [string]   // content of the page (currently ignored.)
        title: [string]     // title of the page
        newsTime: [string]  // yyyymmdd of the newspage created. If not a timed page, the value is empty
        fetchtime: [int]    // UNIX-timestamp for the time when the page was fetched.
        locktime: [int]     // UNIX-timestamp for the time when the entry was locked.
    }

## terms
The term-document sparse matrix, one document per entry.
### Schema
    {
        __url__: [string]   // full url of the page, can be joined with rawhtml
        __id__: [string]     // unique id
        __newsTime__: [string]  // yyyymmdd of the newspage created. If not a timed page, the value is empty
        [K]: [int/float]    // the value of matrix[url][k]
    }

## nettopo
Network topology for crawled websites
### Schema
    {
        fromurl: [string]
        tourl: [string]
    }

## lex
Lexical map from original words to stemmed words
### Schema
    {
        original: [string]
        stemmed: [string]
        count: [int]
    }
*******************************************************************************/
var conf=require("../conf/configure");
var mongojs=require('mongojs');

var collections=["rawhtml", "nettopo", "terms", "lex"];
var db=mongojs(conf.database.access_schema, collections);

for (var i=0; i<collections.length; i++)
    exports[collections[i]]=collections[i];
exports.db =db;
