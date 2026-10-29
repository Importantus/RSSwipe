"""Background jobs run as their own process, exactly like the CronJobs in rsswipe-deployment:
SERVICE_TYPE=feedParser|garbageCollector with EXTERNAL_CRONJOB=true must do one run and exit 0."""
import uuid
import pytest
from conftest import PUBLISHER, db, fresh, run_job

pytestmark = pytest.mark.jobs


def add_feed(user, link, **cols):
    fid = str(uuid.uuid4())
    db(f"INSERT INTO Feed (id,title,link) VALUES ('{fid}','placeholder','{link}')")
    db(f"INSERT INTO FeedList (userId,feedId) VALUES ('{user.id}','{fid}')")
    for k, v in cols.items():
        db(f"UPDATE Feed SET {k}={v} WHERE id='{fid}'")
    return fid


def only_active(*feed_ids):
    """Keeps the run small: all other feeds are skipped by the job."""
    ids = ",".join(f"'{i}'" for i in feed_ids)
    db(f"UPDATE Feed SET active=0 WHERE id NOT IN ({ids})")
    db(f"UPDATE Feed SET active=1 WHERE id IN ({ids})")


def test_feedparser_job_fetches_feeds_and_exits(user):
    fid = add_feed(user, PUBLISHER + fresh("/feed/rss.xml?n=4"))
    only_active(fid)
    r = run_job("feedparser")
    assert r.returncode == 0, r.stdout + r.stderr

    assert db(f"SELECT title,error_count,errormessage IS NULL FROM Feed WHERE id='{fid}'") == "Fixture RSS\t0\t1"
    assert "Fixture site description" in db(f"SELECT description FROM Feed WHERE id='{fid}'")
    assert db(f"SELECT faviconUrl FROM Feed WHERE id='{fid}'") == PUBLISHER + "/favicon.ico"
    assert db(f"SELECT COUNT(*) FROM Article WHERE feedId='{fid}'") == "4"
    assert db(f"SELECT COUNT(*) FROM Article WHERE feedId='{fid}' AND imageUrl LIKE '%/img/%' AND publishedAt IS NOT NULL") == "4"
    assert db(f"SELECT COUNT(*) FROM ArticleContent c JOIN Article a ON a.id=c.articleId WHERE a.feedId='{fid}' AND c.status='OK'") == "4"
    # a second run adds nothing
    assert run_job("feedparser").returncode == 0
    assert db(f"SELECT COUNT(*) FROM Article WHERE feedId='{fid}'") == "4"


def test_feedparser_skips_articles_older_than_max_age(user):
    fid = add_feed(user, PUBLISHER + fresh("/feed/rss.xml?n=4&step=60"))   # items are 60/120/180/240h old, limit is 168h
    only_active(fid)
    assert run_job("feedparser").returncode == 0
    assert db(f"SELECT COUNT(*) FROM Article WHERE feedId='{fid}'") == "2"


def test_feedparser_counts_errors_and_skips_broken_feeds(user):
    bad = add_feed(user, PUBLISHER + fresh("/missing"))
    over = add_feed(user, PUBLISHER + fresh("/missing"), error_count=100)       # MAX_FEED_ERROR_COUNT=99
    only_active(bad, over)
    assert run_job("feedparser").returncode == 0
    assert db(f"SELECT error_count, errormessage IS NOT NULL FROM Feed WHERE id='{bad}'") == "1\t1"
    assert db(f"SELECT error_count, errormessage IS NULL FROM Feed WHERE id='{over}'") == "100\t1"     # untouched
    run_job("feedparser")
    assert db(f"SELECT error_count FROM Feed WHERE id='{bad}'") == "2"


def test_feedparser_resets_error_count_on_success(user):
    fid = add_feed(user, PUBLISHER + fresh("/feed/rss.xml?n=1"), error_count=3, errormessage="'old error'")
    only_active(fid)
    assert run_job("feedparser").returncode == 0
    assert db(f"SELECT error_count, errormessage IS NULL FROM Feed WHERE id='{fid}'") == "0\t1"


def test_feedparser_ignores_inactive_feeds(user):
    fid = add_feed(user, PUBLISHER + fresh("/feed/rss.xml?n=2"))
    db(f"UPDATE Feed SET active=0 WHERE id <> '{fid}'")
    db(f"UPDATE Feed SET active=0 WHERE id = '{fid}'")
    assert run_job("feedparser").returncode == 0
    assert db(f"SELECT COUNT(*) FROM Article WHERE feedId='{fid}'") == "0"


def mk_article(feed, created="NOW()", published="NOW()"):
    aid = str(uuid.uuid4())
    db(f"INSERT INTO Article (id,title,link,feedId,createdAt,publishedAt) VALUES ('{aid}','t','http://x/{aid}','{feed}',{created},{published})")
    return aid


def test_garbage_collector_job(user):
    old = "NOW() - INTERVAL 10 DAY"
    keep_feed = add_feed(user, PUBLISHER + fresh("/feed/rss.xml"))
    orphan = str(uuid.uuid4())
    db(f"INSERT INTO Feed (id,title,link) VALUES ('{orphan}','orphan','{PUBLISHER}{fresh('/orphan')}')")
    followed_empty = add_feed(user, PUBLISHER + fresh("/followed-empty"))

    a_unused = mk_article(keep_feed, old, old)
    a_saved = mk_article(keep_feed, old, old)
    a_starred = mk_article(keep_feed, old, old)
    a_read_only = mk_article(keep_feed, old, old)
    a_recent = mk_article(keep_feed)
    a_old_published = mk_article(keep_feed, published=old)
    for aid, cols in ((a_saved, "saved=1"), (a_starred, "starred=1"), (a_read_only, "`read`=1")):
        db(f"INSERT INTO ArticleList (articleId,userId) VALUES ('{aid}','{user.id}')")
        db(f"UPDATE ArticleList SET {cols} WHERE articleId='{aid}' AND userId='{user.id}'")

    # reading list expiry: read entries older than expTimeRead lose `saved`, unread ones with expTimeUnread=-1 stay
    db(f"UPDATE Settings SET expTimeRead=1000, expTimeUnread=-1 WHERE userId='{user.id}'")
    exp_read, fresh_unread = mk_article(keep_feed), mk_article(keep_feed)
    db(f"INSERT INTO ArticleList (articleId,userId,`read`,saved,dateRead,dateSaved) VALUES ('{exp_read}','{user.id}',1,1,NOW() - INTERVAL 1 HOUR,NOW() - INTERVAL 1 HOUR)")
    db(f"INSERT INTO ArticleList (articleId,userId,saved,dateSaved) VALUES ('{fresh_unread}','{user.id}',1,NOW() - INTERVAL 30 DAY)")

    r = run_job("gc")
    assert r.returncode == 0, r.stdout + r.stderr

    exists = lambda aid: db(f"SELECT COUNT(*) FROM Article WHERE id='{aid}'") == "1"
    assert not exists(a_unused) and not exists(a_read_only) and not exists(a_old_published)
    assert exists(a_saved) and exists(a_starred) and exists(a_recent)

    feed_exists = lambda f: db(f"SELECT COUNT(*) FROM Feed WHERE id='{f}'") == "1"
    assert not feed_exists(orphan)
    assert feed_exists(followed_empty) and feed_exists(keep_feed)

    assert db(f"SELECT saved FROM ArticleList WHERE articleId='{exp_read}' AND userId='{user.id}'") == "0"
    assert db(f"SELECT saved FROM ArticleList WHERE articleId='{fresh_unread}' AND userId='{user.id}'") == "1"
