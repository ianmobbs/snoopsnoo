"""
urls.py

URL dispatch route mappings and error handlers

"""
from flask import render_template

from application import app
from application import views


## URL dispatch rules
# App Engine warm up handler
# See https://cloud.google.com/appengine/docs/python/config/appconfig
app.add_url_rule("/_ah/warmup", "warmup", view_func=views.warmup)

# Home page
app.add_url_rule("/", "home", view_func=views.home)

# About page
app.add_url_rule("/about/", "about", view_func=views.about)

# Random user page
app.add_url_rule("/random", "random_user", view_func=views.random_user)
app.add_url_rule("/random-user", "random_user", view_func=views.random_user)

# User page
app.add_url_rule("/u/<username>", "user_profile", view_func=views.user_profile)

# User existence check page
app.add_url_rule("/check/<username>", "check_user", view_func=views.check_user)

# Update user data page
app.add_url_rule(
    "/update",
    "update_user",
    view_func=views.update_user,
    methods=["POST"]
)

# Feedback page
app.add_url_rule(
    "/feedback",
    "save_synopsis_feedback",
    view_func=views.save_synopsis_feedback
)

# Subreddit Recommendation Feedback page
app.add_url_rule(
    "/sub-reco-feedback",
    "save_sub_reco_feedback",
    view_func=views.save_sub_reco_feedback
)

# Error log page
app.add_url_rule("/error-log", "save_error", view_func=views.save_error)

# Delete page
app.add_url_rule("/delete/<username>", "delete", view_func=views.delete_user)

# Subreddits Home page
app.add_url_rule(
    "/subreddits/", "subreddits_home", view_func=views.subreddits_home
)

# Subreddit Recommendations
app.add_url_rule(
    "/subreddits/recommended/<subreddits>",
    "get_recommended_subreddits",
    view_func=views.get_recommended_subreddits
)

# Subreddits Category page
app.add_url_rule(
    "/subreddits/<level1>/",
    "subreddits_category",
    view_func=views.subreddits_category
)

app.add_url_rule(
    "/subreddits/<level1>/<level2>/",
    "subreddits_category",
    view_func=views.subreddits_category
)

app.add_url_rule(
    "/subreddits/<level1>/<level2>/<level3>/",
    "subreddits_category",
    view_func=views.subreddits_category
)

# Subreddit page
app.add_url_rule(
    "/r/<subreddit_name>",
    "subreddit",
    view_func=views.subreddit
)

# Subreddit Frontpage preview
app.add_url_rule(
    "/subreddit_frontpage",
    "subreddit_frontpage",
    view_func=views.subreddit_frontpage,
    methods=["POST"]
)

# Subreddit Category Suggestion page
app.add_url_rule(
    "/suggest-subreddit-category",
    "save_sub_category_suggestion",
    view_func=views.save_sub_category_suggestion,
    methods=["POST"]
)

# Subreddit Search Results page
app.add_url_rule(
    "/subreddits/search",
    "search_subreddits",
    view_func=views.search_subreddits,
    methods=["GET"]
)

## Error handlers
@app.errorhandler(404)
def page_not_found(exception):
    """Return 404 page."""
    return render_template("404.html", exception=exception), 404

# Handle 500 errors
@app.errorhandler(500)
def server_error(exception):
    """Return 500 page."""
    return render_template("500.html", exception=exception), 500