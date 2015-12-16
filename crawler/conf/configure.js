// Global configure for crawler. Export the whole configure info by an object.

module.exports=
{
    database:
    {
        access_schema: "mongodb://localhost/cnews"
    },
    scheduler:
    {
        // max worker working at the same time.
        max_worker: 500,
        max_fetches_per_tide: 1000,

        spawn_interval_in_seconds: 60
    },
    log:
    {
        log_workers_num: 100
    }
}
