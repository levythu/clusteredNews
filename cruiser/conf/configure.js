// Global configure for cruiser. Export the whole configure info by an object.

module.exports=
{
    database:
    {
        // the schema used to access mongodb.
        access_schema: "mongodb://localhost/cnews"
    },
    worker:
    {
        // cruiser checks all the fetched entries in the database and marks the outdated for crawler to refetch them.
        // if value<0, documents will never get outdated.
        // if value>=0, documents will expire in v seconds.
        fetched_html_expire_in_seconds: -1,

        // cruiser checks all the locked entries and unlock it in a period to avoid dead lock or crawler/parser crash.
        // please guarantee that almost all the normal crawlers and parsers can done their jobs in the expiration time.
        // if value<0, deadlock chead will be disabled. IT IS STRONGLY NOT RECOMMENDED TO DO SO.
        locked_html_expire_in_seconds: 5*60
    },
    scheduler:
    {
        // if launch the crawler in entry.js, the time indicates the interval (in seconds) of
        // each batch.
        spawn_interval_in_seconds: 60
    },
    log:
    {
        // NONE
    }
}
