// Global configure for parser. Export the whole configure info by an object.

module.exports=
{
    database:
    {
        // the schema used to access mongodb.
        access_schema: "mongodb://localhost/cnews"
    },
    worker:
    {
        // domain white/black list.
        // if whitelist exist, blacklist is invalid.
        // lists are provided in REGEXP
        blacklist: [],
        whitelist:
        [
            /^(.*\.)?cnn\.com$/i
        ]
    },
    scheduler:
    {
        // max worker working at the same time, when batching workers, the number of living
        // workers will be supplemented to this value.
        max_worker: 1,

        // if the value >=0, it indicates the max number of new urls that can be stored in db within one launch.
        // if the value <0, no limitation is set.
        // The value may not be precise and the actual number of urls checked-in may exceed it, but it does control
        // the trend.
        max_new_urls_per_launch: -1,

        // if launch the crawler in entry.js, the time indicates the interval (in seconds) of
        // each batch.
        spawn_interval_in_seconds: 60
    },
    log:
    {
        // if the value>0, when the number of workers can be divided by the value or reached max, the event is logged.
        // if the value=0, the number of workers will not trigger any logging.
        log_workers_num: 1
    }
}
