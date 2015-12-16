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
            /^http:\/\/([^\/]*\.)?cnn\.com($|\/.*)/,
        ]
    },
    scheduler:
    {
        // max worker working at the same time.
        max_worker: 500,

        spawn_interval_in_seconds: 60
    },
    log:
    {
        log_workers_num: 100
    }
}
