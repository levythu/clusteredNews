module.exports=
{
    database:
    {
        access_schema: "mongodb://localhost/cnews"
    },
    worker:
    {
        // if whitelist exist, blacklist is invalid.
        blacklist: [],
        whitelist:
        [
            /^(.*\.)?cnn\.com$/i
        ]
    },
    scheduler:
    {
        // max worker working at the same time.
        max_worker: 1,

        spawn_interval_in_seconds: 60
    },
    log:
    {
        log_workers_num: 1
    }
}
