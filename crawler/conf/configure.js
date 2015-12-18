// Global configure for crawler. Export the whole configure info by an object.

module.exports=
{
    database:
    {
        // the schema used to access mongodb.
        access_schema: "mongodb://localhost/cnews"
    },
    worker:
    {
        // the robots.txt info cached will expire within the time. If <0, no expiration time
	    robots_info_expire_in_seconds: 24*60*60,

        robots_in_one_domain_interval_in_ms: 5000,

        robots_in_one_domain_concurrency: 1,

        // if the value=0, no time out is set.
        fetch_time_out_in_ms: 100000
    },
    request:
    {
        // when requesting instant data like robots.txt, the number of redirects allowed.
        default_max_redirect_allowed: 10
    },
    scheduler:
    {
        // max worker working at the same time, when batching workers, the number of living
        // workers will be supplemented to this value.
        max_worker: 10,

        // if the value >=0, it indicates the max number of pages that can be fetched within one batch.
        // if the value <0, no limitation is set.
        max_fetches_per_launch: 5000,

        // if launch the crawler in entry.js, the time indicates the interval (in seconds) of
        // each batch.
        spawn_interval_in_seconds: 1
    },
    log:
    {
        // if the value>0, when the number of workers can be divided by the value or reached max, the event is logged.
        // if the value=0, the number of workers will not trigger any logging.
        log_workers_num: 100
    }
}
