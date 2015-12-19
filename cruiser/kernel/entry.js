// Launch worker batch each interval.
// also the entry of the crawler.

var worker=require("./worker");
var conf=require("../conf/configure");

setInterval(worker, 1000*conf.scheduler.spawn_interval_in_seconds);
