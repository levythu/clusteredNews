// Launch worker batch each interval.
// also the entry of the parser.

var worker=require("./worker");
var conf=require("../conf/configure");

conf.scheduler.exit_on_zero=true;
worker();
