// Launch worker batch each interval.
// also the entry of the crawler.

var worker=require("./worker");
var conf=require("../conf/configure");

conf.scheduler.exit_on_zero=true;
worker();
