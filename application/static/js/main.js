var g_base_results = "";
var g_username = "";
var g_last_updated = "";
var g_user_data = {
  "about": null,
  "comments": [],
  "submissions": [],
};
var g_debug = false;
var g_user_timezone = jstz.determine().name();

var g_retry_attempts = 0;

var FULL_WIDTH=860;
var HALF_WIDTH=430;

var SYNOPSIS_KEYS = [
  {label: "you are", key:"gender"},
  {label: "you are", key:"orientation"},
  {label: "you are in a relationship with your", key:"relationship_partner"}, 
  {label: "you live(d)", key:"places_lived"}, 
  {label: "you grew up", key:"places_grew_up"},
  {label: "people in your family", key:"family_members"}, 
  {label: "you have these pets", key:"pets"}, 
  {label: "things you've said you like", key:"favorites"}, 
  {label: "you are", key:"attributes"},
  {label: "you have", key:"possessions"}, 
  {label: "your locations of interest", key:"locations"}, 
  {label: "your locations of interest", key:"location"}, // For backward compatibility with v3 data
  {label: "you like to watch", key:"tv_shows"}, // For backward compatibility with v1 data
  {label: "you like to watch", key:"tv shows"}, // For backward compatibility with v3 data
  {label: "you like to watch", key:"television"},
  {label: "your hobbies and interests", key:"interests"}, 
  {label: "your hobbies and interests", key:"hobbies and interests"}, 
  {label: "you like to play", key:"games"}, // For backward compatibility with v1 data
  {label: "you like to play", key:"gaming"}, 
  {label: "sports and teams you like:", key:"sports"}, 
  {label: "you like to listen to", key:"music"}, 
  //{label: "you use", key:"drugs"}, 
  {label: "you like to read", key:"books"},
  {label: "you like", key:"celebs"}, // For backward compatibility with v1 data
  {label: "you like", key:"celebrities"},
  {label: "you like", key:"entertainment"},
  {label: "you like to discuss", key:"business"}, 
  {label: "you like to discuss", key:"science"}, 
  {label: "you like to discuss", key:"tech"}, // For backward compatibility with v1 data
  {label: "you like to discuss", key:"technology"},
  {label: "you like to discuss", key:"lifestyle"}, 
  {label: "you like to discuss", key:"others"}, // For backward compatibility with v1 data
  {label: "you like to discuss", key:"other"}, 
  {label: "you like to discuss", key:"news & politics"}, 
  {label: "you like to discuss", key:"news and politics"}, 
  {label: "you like to discuss", key:"social science and humanities"}, 
  {label: "you have", key:"gadget"}, 
  {label: "you are", key:"political_view"}, 
  {label: "you are", key:"physical_characteristics"}, 
  {label: "your religious beliefs", key:"religion"}, // For backward compatibility with v3 data
  {label: "your religious beliefs", key:"religion and spirituality"}
];

var ERROR_MSGS = {
  "UNEXPECTED_ERROR": "An unexpected error has occurred. Please try again in a few minutes.",
  "USER_NOT_FOUND": "User not found. If you're sure the username is correct, " + 
                    "you may have been shadowbanned - go to /r/ShadowBan/ to find out!",
  "NO_DATA": "No data available.",
  "REQUEST_CANCELED": "Server too busy. Please try again in a few minutes.",
  "SERVER_BUSY": "Server too busy. Please try again in a few minutes."
};

var DEFAULT_SUBS = [
  "announcements", "art", "askreddit", "askscience", "aww", "blog", "books", "creepy",
  "dataisbeautiful", "diy", "documentaries", "earthporn", "explainlikeimfive", "fitness", "food",
  "funny", "futurology", "gadgets", "gaming", "getmotivated", "gifs", "history", "iama", "internetisbeautiful",
  "jokes", "lifeprotips", "listentothis", "mildlyinteresting", "movies", "music", "news", "nosleep", 
  "nottheonion", "oldschoolcool", "personalfinance", "philosophy", "photoshopbattles", "pics", "science",
  "showerthoughts", "space", "sports", "television", "tifu", "todayilearned", "twoxchromosomes", "upliftingnews",
  "videos", "worldnews", "writingprompts"
];


$(function () {
  $("[data-toggle='tooltip']").tooltip();
  $(".user-timezone").text(g_user_timezone);
  $("[data-hide]").on("click", function(){
    $(this).closest("#error").hide();
  });
  $('button[type="submit"]').prop("disabled", false)
});

function timeSince(date, since) {
  var today = since ? since : new Date();
  var seconds = Math.floor((today - date) / 1000);
  var interval = Math.floor(seconds / 31536000);
  if (interval > 1) {
    return interval + " years";
  }
  interval = Math.floor(seconds / 2592000);
  if (interval > 1) {
    return interval + " months";
  }
  interval = Math.floor(seconds / 86400);
  if (interval > 1) {
    return interval + " days";
  }
  interval = Math.floor(seconds / 3600);
  if (interval > 1) {
    return interval + " hours";
  }
  interval = Math.floor(seconds / 60);
  if (interval > 1) {
    return interval + " minutes";
  }
  return Math.floor(seconds) + " seconds";
}

function jqXHR_error(jqXHR, status_text, error_thrown, error_message) {
  var error_object = {};
  if(jqXHR.status===404) {
    $("#error-message").text(ERROR_MSGS.USER_NOT_FOUND);
    error_object = {
      "username": g_username,
      "error_type": "USER_NOT_FOUND",
      "error_message": jqXHR.status + "--" + status_text + "--" + error_thrown + "--" + error_message
    };
  } else if(jqXHR.status===0 && !jqXHR.responseText) {
    $("#error-message").text(ERROR_MSGS.REQUEST_CANCELED);
    error_object = {
      "username": g_username,
      "error_type": "REQUEST_CANCELED",
      "error_message": jqXHR.status + "--" + status_text + "--" + error_thrown + "--" + error_message
    };
  } else {
    $("#error-message").text(ERROR_MSGS.UNEXPECTED_ERROR);
    error_object = {
      "username": g_username,
      "error_type": "UNEXPECTED_ERROR",
      "error_message": jqXHR.status + "--" + status_text + "--" + error_thrown + "--" + error_message
    };
  }
  $(".loading-progress").hide();
  $(".loading-done").show();
  $("#error").show();
  log_error(error_object);
  $("#go").button("reset");
}

function app_error(error_type, error_message) {
  $(".loading-progress").hide();
  $(".loading-done").show();
  $("#error-message").text(ERROR_MSGS[error_type]);
  $("#error").show();
  var error_object = {"username":g_username, "error_type": error_type, "error_message":error_message};
  log_error(error_object);
  $("#go").button("reset");
}

function call_blockspring() {
  $("#go").html("Processing <i class='fa fa-spinner fa-spin'></i>");
  $.support.cors = true;
  $.ajax({
    url: "https://sender.blockspring.com/api_v2/blocks/d03751d846a6a0ff9a6dfd36b9c1c641?api_key=d1b2e14d5b005465cfe3c83976a9240a",
    type: "POST",
    data: { username: g_username, json_data: null},
    crossDomain: true
  }).done(function(response){
    //Data is here from API
    if(response._errors && response._errors.length) {
      app_error(response._errors[0].title,response._errors[0].message);
    } else if(!response.results) {
      app_error("SERVER_BUSY","");
    } else {
      var results = JSON.parse(response.results);
      if(results) {
        g_username = results.username;
        //Update data in local DB
        $.ajax({
          url: "/update",
          type: "POST",
          contentType: "application/json",
          data: JSON.stringify(results),
        }).done(function(response) {
          if(response=="OK") {
            //Now user exists in local DB, forward to profile page
            window.location.href = "/u/"+g_username;
          } else if(response=="NO_DATA") {
            app_error("NO_DATA", "");
          }
        });
      } else {
        app_error("SERVER_BUSY","");
      }
    }    
  }).fail(function(jqXHR, status_text, error_thrown) {
    jqXHR_error(jqXHR, status_text, error_thrown, "Error while calling Blockspring");
  });
}

function flatten_subreddits_tree(tree, flattened_array) {
  var a = flattened_array;
  if(!a) {
    a = [];
  }
  if(tree.hasOwnProperty("children")) {
    tree.children.forEach(function(c) {
      flatten_subreddits_tree(c,a);
    });
  } else {
    a.push({
      "name": tree.name, 
      "submissions": tree.submissions,
      "comments": tree.comments,
      "submission_karma": tree.submission_karma,
      "comment_karma": tree.comment_karma,
      "posts": tree.posts,
      "karma": tree.karma,
      "average_karma_per_comment": +tree.comments>0 ? +(+tree.comment_karma/+tree.comments).toFixed(2) : null,
      "average_karma_per_submission": +tree.submissions>0 ? +(+tree.submission_karma/+tree.submissions).toFixed(2) : null,
    });
  }
  return a;
}

function send_feedback(key, value, feedback) {
  url = "/feedback?u="+g_username+"&k="+key+"&v="+value+"&f="+feedback;
  $.ajax({
    url: url,
    type: "GET"
  });
}

function send_sub_reco_feedback(i, o, f) {
  url = "/sub-reco-feedback?u="+g_username+"&i="+i+"&o="+o+"&f="+f;
  $.ajax({
    url: url,
    type: "GET"
  });
}

function log_error(error_object) {
  url = "/error-log?u="+error_object.username+"&t="+error_object.error_type+"&m="+error_object.error_message;
  $.ajax({
    url: url,
    type: "GET"
  });
}

function wrap_data(key, text, sources, confidence) {
    var source_links = "";
    if(sources) {
        sources.forEach(function (s) {
            source_links += " <a href=\""+s+"\" target=\"_blank\">#</i></a> ";
        });
    }
    var c = "content";
    if(!confidence) c = "likely";
    var result = 
      '<span class="data-block">' +
      '<span class="' + c + '">' + text +
      '</span>' +
      '<span class="feedback">' +
      '<a class="correct" data-key="' + key + '" data-value="' + text + '"" data-feedback="1" href="#">' +
      '<i class="fa fa-check-circle-o" data-toggle="tooltip" ' +
        'data-placement="top" title="" data-original-title="This is correct"></i>' +
      '</a> ' +
      '<a class="incorrect" data-key="' + key + '" data-value="' + text + '" data-feedback="0" href="#">' +
      '<i class="fa fa-times-circle-o" data-toggle="tooltip" ' +
        'data-placement="top" title="" data-original-title="This is incorrect/gibberish"></i>' +
      '</a> ' +
      '</span>' +
      '<span class="feedback">' +
      source_links +
      '</span>' +
      '</span>';
    return result;
}

function populate_results(results) {
  $("#user-results").empty();
  $("#user-results").html(g_base_results);
  var data = JSON.parse(results);
  g_username = data.username;
  if(location.search.substring(1)==="debug") g_debug=true;
  if(g_debug) {
    console.log(data);
  }

  var offset_hours = Math.floor(new Date().getTimezoneOffset()/60);

  // Summary
  // Data v3/5 to v7 adjustment
  var signup_date = data.summary.signup_date.date || data.summary.signup_date
  $("#data-signup_date").text(new Date(signup_date*1000).toLocaleDateString());
  $("#data-signup_date_humanized").text("redditor for "+timeSince(new Date(signup_date*1000)));

  // Data v3/5 to v7 adjustment
  var first_post_date = data.summary.first_post_date.date || data.summary.first_post_date
  $("#data-first_post_date").text(new Date(first_post_date*1000).toLocaleDateString());
  $("#data-first_post_date_humanized").text("(past "+timeSince(new Date(first_post_date*1000))+")");

  $("#data-lurk_period_humanized").text(
    timeSince(new Date(data.summary.lurk_period.from*1000), new Date(data.summary.lurk_period.to*1000))
  );
  $("#data-lurk_period_dates").text(
    new Date(data.summary.lurk_period.from*1000).toLocaleDateString() + 
    " to " + new Date(data.summary.lurk_period.to*1000).toLocaleDateString()
  );

  if(data.summary.submissions.gilded>0) {
    $("#data-submissions_gilded").html(
      "<a href='http://www.reddit.com/user/" + data.username + "/gilded' target='_blank'>" +
      data.summary.submissions.gilded + " times from submissions</a>"
    );
  } else {
    $("#data-submissions_gilded").text(data.summary.submissions.gilded + " submissions");
  }

  if(data.summary.comments.gilded>0) {
    $("#data-comments_gilded").html("<a href='http://www.reddit.com/user/" + data.username + 
      "/gilded' target='_blank'>" + data.summary.comments.gilded + " times from comments</a>");
  } else {
    $("#data-comments_gilded").text(data.summary.comments.gilded + " comments");
  }

  $("#data-submission_karma").text(data.summary.submissions.computed_karma);
  $("#data-total_submissions").text(data.summary.submissions.count);
  $("#data-reddit_submission_karma").text(data.summary.submissions.all_time_karma);

  if(data.summary.submissions.count>0) {
    var average_submission_karma = 
      (+data.summary.submissions.computed_karma/+data.summary.submissions.count).toFixed(2);
    var compare_submission_karma = 
      (average_submission_karma - g_user_averages.average_submission_karma).toFixed(2);
    var compare_submission_karma_text = 
      (compare_submission_karma > 0) ?
      (compare_submission_karma + " more ") :
      (Math.abs(compare_submission_karma) + " less ");
    $("#data-average_submission_karma").text(average_submission_karma);
    $("#data-compare_submission_karma").text(compare_submission_karma_text);
    $("#data-compare_submission_karma").addClass(compare_submission_karma >= 0 ? "text-success" : "text-warning");
  } else {
    $("#submission-compare-stats").hide();
    $("#data-average_submission_karma").text("0");
  }
  $("#data-comment_karma").text(data.summary.comments.computed_karma);
  $("#data-total_comments").text(data.summary.comments.count);
  $("#data-reddit_comment_karma").text(data.summary.comments.all_time_karma);
  if(data.summary.comments.count>0) {
    var average_comment_karma = 
      (+data.summary.comments.computed_karma/+data.summary.comments.count).toFixed(2);
    var compare_comment_karma = 
      (average_comment_karma - g_user_averages.average_comment_karma).toFixed(2);
    var compare_comment_karma_text = 
      (compare_comment_karma > 0) ?
      (compare_comment_karma + " more ") :
      (Math.abs(compare_comment_karma) + " less ");
    $("#data-average_comment_karma").text(average_comment_karma);
    $("#data-compare_comment_karma").text(compare_comment_karma_text);
    $("#data-compare_comment_karma").addClass(compare_comment_karma >= 0 ? "text-success" : "text-warning");
  } else {
    $("#comment-compare-stats").hide();
    $("#data-average_comment_karma").text("0");
  }

  if(data.summary.comments.best.text) {
    $("#data-best_comment").html(
      data.summary.comments.best.text +
      " <small><a target='_blank' href='" +
      data.summary.comments.best.permalink +
      "'>(permalink)</a></small>"
    );
  }
  if(data.summary.comments.worst.text) {
    $("#data-worst_comment").html(
      data.summary.comments.worst.text +
      " <small><a target='_blank' href='" +
      data.summary.comments.worst.permalink +
      "'>(permalink)</a></small>"
    );
  }
  if(data.summary.submissions.best.title) {
    $("#data-best_submission").html(
      data.summary.submissions.best.title +
      " <small><a target='_blank' href='" +
      data.summary.submissions.best.permalink +
      "'>(permalink)</a></small>"
    );
  }
  if(data.summary.submissions.worst.title) {
    $("#data-worst_submission").html(
      data.summary.submissions.worst.title +
      " <small><a target='_blank' href='" +
      data.summary.submissions.worst.permalink +
      "'>(permalink)</a></small>"
    );
  }

  // Synopsis
  var found_synopsis = false;
  SYNOPSIS_KEYS.forEach(function(d) {
    var row_start = '<div class="row">';
    var row_content = "";
    var row_end = '</div>';
    var once = [];
    if(data.synopsis[d.key]) {
      if(
        (data.synopsis[d.key].data && data.synopsis[d.key].data.length) ||
        (data.synopsis[d.key].data_derived && data.synopsis[d.key].data_derived.length)
      ) {
        found_synopsis = true;
        row_content += '<div class="col-md-4">' + d.label + '</div>';
        row_content += '<div class="col-md-8">';
        
        if(data.synopsis[d.key].data && data.synopsis[d.key].data.length) {
          if(d.key==="gender" || d.key==="orientation") {
            once.push(d.key);
          }
          data.synopsis[d.key].data.forEach(function(e) {
            row_content+=wrap_data(d.key, e.value, e.sources, 1);
          });
        }

        if(data.synopsis[d.key].data_derived && data.synopsis[d.key].data_derived.length && once.indexOf(d.key)===-1) {
          data.synopsis[d.key].data_derived.forEach(function(e) {
            row_content+=wrap_data(d.key, e.value, e.sources, 0);
          });
        }

        row_content += '</div>';
        $("#synopsis-data").append(row_start+row_content+row_end);
      }
    }
  });
  if(!found_synopsis) {
    $("#synopsis-data").html('<div class="col-md-6 alert alert-warning"><p>No synopsis data available.</p></div>');
  }

  // Posts across topics
  var range = d3.scale.category20().range();
  range.push("#e7ba52");
  var topics_color = d3.scale.ordinal().domain([
    "General",
    "News and Politics",
    "Gaming",
    "Architecture",
    "Entertainment",
    "Art",
    "Adult and NSFW",
    "Business",
    "Education",
    "Hobbies and Interests",
    "Law",
    "Locations",
    "Lifestyle",
    "Meta",
    "Music",
    "Travel",
    "Other",
    "Science",
    "Social Science and Humanities",
    "Sports",
    "Technology"
  ]).range(range);
  curious.sunburst({
    container: "data-topics",
    legend_container: "data-topics_legend",
    data: data.metrics.topic,
    width: Math.min(430,$("#data-topics").parent().width()-80),
    height: Math.min(430,$("#data-topics").parent().width()-80),
    margin: {
      top: 0,
      right: 40,
      bottom: 40,
      left: 40
    },
    color: topics_color
  });

  // Common words
  if(data.metrics.common_words.length>20) {
    $( "#top-words-slider" ).slider({
      value:0,
      min: 0,
      max: 10,
      slide: function( event, ui ) {
        if(ui.value===0) {
          $( "#top-words-count" ).text("Showing all words. Drag slider below to exclude top words.");  
        } else {
          $( "#top-words-count" ).text("Excluded top " + ui.value + " words.");
        }
        $("#data-common_words").empty();
        curious.wordcloud({
          container: "data-common_words",
          width: Math.min(430,$("#data-common_words").parent().width()-80),
          height: Math.min(430,$("#data-common_words").parent().width()-80),
          data: data.metrics.common_words.slice(ui.value),
          margin: {
            top: 0,
            right: 40,
            bottom: 40,
            left: 40
          }
        });
      }
    });
  } else {
    $( "#top-words-count" ).hide();
    $( "#top-words-slider" ).hide();
  }

  var common_words_table = $("#common-words-table>table>tbody");

  $("#common_words_control input").change(function() {
    if(this.value==="cloud") {
      $("#common-words-word-cloud").show();
      $("#common-words-table").hide();
    } else {
      $("#common-words-table").show();
      $("#common-words-word-cloud").hide();
    }
  });

  data.metrics.common_words.forEach(function(w) {
    common_words_table.append(
      "<tr><td>" + w.text + "</td><td>" + w.size + "</td></tr>"
    );
  });

  curious.wordcloud({
    container: "data-common_words",
    width: Math.min(430,$("#data-common_words").parent().width()-80),
    height: Math.min(430,$("#data-common_words").parent().width()-80),
    data: data.metrics.common_words,
    margin: {
      top: 0,
      right: 40,
      bottom: 40,
      left: 40
    }
  });

  // Metrics chart - Date
  var first_post_year = (new Date(data.summary.first_post_date*1000)).getFullYear();
  var first_post_month = (new Date(data.summary.first_post_date*1000)).getMonth();
  var graph_start_date = (new Date(first_post_year, first_post_month, 1, 0, 0, 0, 0)).toISOString();
  var start = 0;
  for(var i=0;i<data.metrics.date.length;i++) {
    if(data.metrics.date[i].date < graph_start_date) {
      start++;
    } else {
      break;
    }
  }

  start = start<0?0:start;

  curious.timeseries({
    container: "data-activity_date",
    id: "activity_date_chart",
    data: data.metrics.date.slice(start-1).map(function(d) {
      return {
        date:d.date,
        posts:d.comments+d.submissions,
        karma:d.comment_karma+d.submission_karma
      };
    }),
    width: Math.min(860,$("#data-activity_date").parent().width()-80),
    height: Math.min(860,$("#data-activity_date").parent().width()-80)/2,
    margin: {
      top: 0,
      right: 20,
      bottom: 40,
      left: 20
    },
    tooltips:true,
    x_label: "Date",
    secondary_scale:["karma"]
  });

  // Metrics chart - Weekday
  var weekday_names = {
    "Sun":"Sunday",
    "Mon":"Monday",
    "Tue":"Tuesday",
    "Wed":"Wednesday",
    "Thu":"Thursday",
    "Fri":"Friday",
    "Sat":"Saturday"
  };
  curious.bar({
    container: "data-activity_weekday",
    data: data.metrics.weekday.map(function(d) {
      return {
        weekday:d.weekday,
        posts:d.comments+d.submissions,
        karma:d.comment_karma+d.submission_karma
      };
    }),
    width: Math.min(430,$("#data-activity_weekday").parent().width()-80),
    height: Math.min(430,$("#data-activity_weekday").parent().width()-80),
    margin: {
      top: 0,
      right: 40,
      bottom: 40,
      left: 40
    },
    tooltips:true,
    x: "weekday",
    x_label: "Day of Week",
    secondary_scale:["karma"],
    tooltip_names: weekday_names
  });

  // Metrics chart - Hour
  var hour_names = [
    "Midnight", "1 AM", "2 AM", "3 AM", "4 AM", "5 AM", "6 AM", "7 AM", "8 AM", "9 AM", "10 AM", "11 AM", 
    "Noon", "1 PM", "2 PM", "3 PM", "4 PM", "5 PM", "6 PM", "7 PM", "8 PM", "9 PM", "10 PM", "11 PM"
  ];
  curious.bar({
    container: "data-activity_hour",
    data: data.metrics.hour.map(function(d) {
      return {
        hour:offset_hours>0 ? (24 + d.hour-offset_hours)%24 : (d.hour-offset_hours)%24,
        posts:d.comments+d.submissions,
        karma:d.comment_karma+d.submission_karma
      };
    }).sort(function(a,b) {
      return a.hour - b.hour;
    }),
    width: Math.min(430,$("#data-activity_hour").parent().width()-80),
    height: Math.min(430,$("#data-activity_hour").parent().width()-80),
    margin: {
      top: 0,
      right: 40,
      bottom: 40,
      left: 40
    },
    tooltips:true,
    x: "hour",
    secondary_scale:["karma"],
    x_label: "Hour of Day (in " + g_user_timezone + ")",
    tooltip_names: hour_names
  });

  // Metrics chart - Posts by Subreddit
  curious.treemap({
    container: "data-posts_by_subreddit",
    data: data.metrics.subreddit,
    width: Math.min(840,$("#data-posts_by_subreddit").parent().width()),
    height: Math.min(840,$("#data-posts_by_subreddit").parent().width()/2.1875),
    margin: {
      top: 0,
      right: 0,
      bottom: 0,
      left: 0
    },
    tooltips:true,
    size_col: "posts",
    color: topics_color
  });

  // Metrics chart - Submissions by Type and Domain
  if(data.summary.submissions.count>0) {
    $("#no-submissions").hide();
    curious.sunburst({
      container: "data-submissions",
      legend_container: "data-submissions_legend",
      data: data.summary.submissions.type_domain_breakdown,
      width: Math.min(430,$("#data-submissions").parent().width()-80),
      height: Math.min(430,$("#data-submissions").parent().width()-80),
      margin: {
        top: 0,
        right: 40,
        bottom: 40,
        left: 40
      },
      color: d3.scale.category20().domain(["Self", "Image", "Video", "Other"])
    });
  }

  // Corpus Statistics
  $("#data-total_word_count").text(data.summary.comments.total_word_count);
  $("#data-unique_word_count").text(data.summary.comments.unique_word_count);
  
  var unique_word_percent = 
    (+data.summary.comments.unique_word_count/+data.summary.comments.total_word_count*100).toFixed(2);
  $("#data-unique_word_percent").text(unique_word_percent);

  var compare_unique_word_percent = 
    (unique_word_percent - g_user_averages.average_unique_word_percent).toFixed(2);
  var compare_unique_word_percent_text = 
    (compare_unique_word_percent > 0) ?
    (compare_unique_word_percent + " more ") :
    (Math.abs(compare_unique_word_percent) + " less ");
  $("#data-compare_unique_word_percent").text(compare_unique_word_percent_text);
  $("#data-compare_unique_word_percent").addClass(compare_unique_word_percent >= 0 ? "text-success" : "text-warning");
  
  $("#data-hours_typed").text(data.summary.comments.hours_typed + " hours");
  $("#data-karma_per_word").text(data.summary.comments.karma_per_word);

  // Heatmap
  if(data.metrics.recent_activity_heatmap) {
    var heatmap=data.metrics.recent_activity_heatmap;
    var last_updated_hour = g_last_updated.getUTCHours();
    var last_updated_local_hour = g_last_updated.getHours();
    var hours_to_chop = 24 - (last_updated_hour+1);
    var hours_to_add = 24 - (last_updated_local_hour+1);
    heatmap = heatmap.substring(0, heatmap.length-hours_to_chop);
    heatmap += Array(hours_to_add+1).join("-");
    heatmap = heatmap.substring(heatmap.length-(60*24));
    var num_hours_data_available = Math.floor(
      Math.abs(new Date(g_last_updated).setHours(23,59,59) - new Date(first_post_date*1000))
      /(1000*60*60)
    );
    var num_days_data_available = Math.ceil(num_hours_data_available/24);
    var heatmap_data = [];
    for(var i=0;i<heatmap.length/24;i++) {
      heatmap_data[i] = [];
      for(var j=0;j<24;j++) {
        if(heatmap[i*24+j]==="-") {
          heatmap_data[i][j] = "-";
        }
        else if((i*24+j)>=(60*24-num_hours_data_available)) {
          heatmap_data[i][j] = parseInt("0x"+heatmap[i*24+j],16);
        } else {
          heatmap_data[i][j] = null;
        }
      }
    }

    curious.heatmap({
      container: "data-heatmap",
      data: heatmap_data,
      width: Math.min(500,$("#data-heatmap").parent().width()),
      height: 210,
      margin: {
        top: 0,
        right: 0,
        bottom: 20,
        left: 0
      },
      tooltips:true,
      tooltips_msg: function(d) {
        var no_data_text = d.value===null ? "<p>No data available</p>" : "";
        return  "<p>" +
          new Date(
            new Date(g_last_updated).setDate(g_last_updated.getDate()-(60-d.x-1))
          ).toLocaleDateString() + "</p><p>" + hour_names[d.y] + "</p>" + no_data_text;
      }
    });
  } else {
    $("#data-heatmap").html(
      '<div class="heatmap-sample">' +
      '<div class="col-md-6 col-md-offset-3 alert alert-info"><p>Refresh data to see this chart.</p></div>' +
      '</div>'
    );

  }


  // Recent posts and karma
  if(
    data.metrics.recent_karma && data.metrics.recent_posts &&
    data.metrics.recent_karma.length===data.metrics.recent_posts.length
  ) {
    var recent_activity = data.metrics.recent_karma.slice(1).map(function(d,i) {
      return {
        date: new Date(
          new Date(g_last_updated).setDate(g_last_updated.getUTCDate()-(60-i-1))
        ).toLocaleDateString() + " (UTC)",
        posts: (60-i)<=num_days_data_available ? data.metrics.recent_posts[i+1] : 0,
        karma: (60-i)<=num_days_data_available ? d : 0
      };
    });

    curious.bar({
      container: "data-recent_activity",
      data: recent_activity,
      width: Math.min(500,$("#data-recent_activity").parent().width()),
      height: 80,
      margin: {
        top: 0,
        right: 0,
        bottom: 0,
        left: 0
      },
      tooltips:true,
      x: "date",
      x_label: "Date",
      secondary_scale:["karma"],
      hide_axes:true
    });
  }

  // Recommendations
  var subreddits_array = flatten_subreddits_tree(data.metrics.subreddit);

  var reco_qs = subreddits_array.filter(function(d) {
    return (d.posts>=5) && ($.inArray(d.name.toLowerCase(),DEFAULT_SUBS)===-1);
  }).sort(function(a,b) {
    return b.posts - a.posts;
  }).splice(0,10).map(function(d) {
    return d.name;
  }).join(",");
  
  if(reco_qs && subreddits_array.length>=2) {
    $.ajax({
      url: "/subreddits/recommend/" + reco_qs,
      type: "GET",
    }).done(function(response) {
      if(response.recommended && response.recommended.length) {
        var posted_subs = subreddits_array.map(function(d) {
          return d.name;
        });
        var reco_results = response.recommended.filter(function(d) {
          return $.inArray(d,posted_subs)===-1;
        }).map(function(d) {
          return  '<li class="margin-btm-15 margin-rgt-5">' +
                '<a href="/r/'+d+'">/r/'+d+'</a>' +
                '<span class="margin-lft-5 sub-reco-feedback">' + 
                  '<a class="correct icon" data-i="' + reco_qs + 
                    '" data-o="' + d + '" data-f="1" href="#"><i class="fa fa-check-circle-o"></i></a>' + 
                  '<a class="incorrect icon" data-i="' + reco_qs + 
                    '" data-o="' + d + '" data-f="0" href="#"><i class="fa fa-times-circle-o"></i></a>' +
                '</span>' + 
              '</li>';
        });
        $("#recommended-subs").html('<ul class="list-unstyled">'+reco_results.slice(0,15).join(" ")+'</ul>');
        $("#recommended-subs").append(
          '<a class="small" href="/subreddits/">Want more? Browse subreddits by topic.</a>'
        );

        $(".sub-reco-feedback .correct, .sub-reco-feedback .incorrect").click(function() {
          i = $(this).data("i");
          o = $(this).data("o");
          f = $(this).data("f");
          send_sub_reco_feedback(i, o, f);
          feedback_container = $(this).parent();
          feedback_container.html("<span class='thanks'>Thanks!</span>");
          feedback_container.fadeOut(1000,function() {
            $(this).html(f?"<i class='fa fa-check correct_done'></i>":"<i class='fa fa-close incorrect_done'></i>");
          }).fadeIn(200);
          return false;
        });
      } else {
        $("#recommended-subs").html(
          '<p>No recommendations available.</p><p><a href="/subreddits/">Try browsing subreddits by topic.</a></p>'
        );
      }
    });
  } else {
    $("#recommended-subs").html(
      '<p>No recommendations available.</p><p><a href="/subreddits/">Try browsing subreddits by topic.</a></p>'
    );
  }
  
  
  var c = subreddits_array.filter(function(a) {
    return a.average_karma_per_comment;
  }).sort(function(a,b) {
    return a.average_karma_per_comment - b.average_karma_per_comment;
  });

  if(c && c.length>1) {

    $("#data-worst_karma_per_comment").html("<a target='_blank' href=\"/r/" + c[0].name + "\">/r/"+c[0].name+"</a>");
    $("#data-worst_karma_per_comment_subtext").html(
      "<p>" + c[0].average_karma_per_comment + " karma/comment on average</p>" + 
      "<p><small>" + c[0].comment_karma + " total karma over " + c[0].comments + " comments</small></p>"
    );

    $("#data-best_karma_per_comment").html(
      "<a target='_blank' href=\"/r/" + c[c.length-1].name + "\">/r/"+c[c.length-1].name+"</a>"
    );
    $("#data-best_karma_per_comment_subtext").html(
      "<p>" + c[c.length-1].average_karma_per_comment + " karma/comment on average</p>" + 
      "<p><small>" + c[c.length-1].comment_karma +
      " total karma over " + c[c.length-1].comments + " comments</small></p>"
    );

    $("#no-recommendations").hide();

  } else {
    $("#best-comment-sub-reco").hide();
    $("#worst-comment-sub-reco").hide();
  }

  var s = subreddits_array.filter(function(a) {
    return a.average_karma_per_submission;
  }).sort(function(a,b) {
    return a.average_karma_per_submission - b.average_karma_per_submission;
  });

  if(s && s.length>1) {

    $("#data-worst_karma_per_submission").html("<a target='_blank' href=\"/r/" + s[0].name + "\">/r/"+s[0].name+"</a>");
    $("#data-worst_karma_per_submission_subtext").html(
      "<p>" + s[0].average_karma_per_submission + " karma/submission on average</p>" + 
      "<p><small>" + s[0].submission_karma + " total karma over " + s[0].submissions + " submissions</small></p>"
    );

    $("#data-best_karma_per_submission").html(
      "<a target='_blank' href=\"/r/" + s[s.length-1].name + "\">/r/"+s[s.length-1].name+"</a>"
    );
    $("#data-best_karma_per_submission_subtext").html(
      "<p>" + s[s.length-1].average_karma_per_submission + " karma/submission on average</p>" + 
      "<p><small>" + s[s.length-1].submission_karma +
      " total karma over " + s[s.length-1].submissions + " submissions</small></p>"
    );

    $("#no-recommendations").hide();

  } else {
    $("#best-post-sub-reco").hide();
    $("#worst-post-sub-reco").hide();
  }

  if(c.length<=1 && s.length<=1) {
    $("#average-karma-reco").hide();
    $("#subreddits-reco").hide();
  }

  // Subreddit categorization
  if(data.metrics.subreddit.children && data.metrics.subreddit.children.length) {
    var other_subreddits = data.metrics.subreddit.children.filter(function(d) {
      return d.name==="Other";
    }).shift();
    if(other_subreddits && other_subreddits.children) {
      other_subreddits.children.forEach(function(c) {
        $("#sub-categorize-table-tbody").append(
          '<tr>' +
          '<td class="col-md-2">' + 
          '<a href="/r/' + c.name + '" target="_blank">' + c.name + '</a>' +
          '<input type="hidden" name="subreddit_name" value="' + c.name + '">' + 
          '</td>' +
          '<td class="col-md-5">' + $("#all-subreddit-categories-placeholder").html() + '</td>' +
          '<td class="col-md-5">' +
          '<input name="suggested_category" type="text" class="form-control small">' +
          '</td>' +
          '</tr>'
        );
      });
    } else {
      $("#sub-categorize-table").html(
        '<div class="col-md-6 alert alert-success">' +
        '<p>All your subreddits have been categorized. You\'re all set!</p>' +
        '</div>'
      );
    }
  }
  $("#user-results-loading").hide();
  $("#user-results").css({opacity:1});
}

function load_snoovatar() {
  blockspring.runParsed("99cd0d8656e4608468d6b1c7e18ce4de", {
    "username": g_username
  },
  {
    "cache": true,
    "expiry": 3600,
    "api_key":"d1b2e14d5b005465cfe3c83976a9240a"
  },
  function(response){
    if(response._errors && response._errors.length) {
      // You pleb!
    } else if(response.params.snoovatar) {
      $("#snoovatar img").attr("src", "data:image/png;base64,"+response.params.snoovatar.data);
      $("#snoovatar").removeClass("hide");
    }
  });
}

function home_init() {
  $( "#process_form" ).submit(function( event ) {
    event.preventDefault();
    var $form = $( this ),
    username = $form.find( "input[name='username']" ).val().trim();
    if(!username || !username.length) return;
    username = username.replace(/https?:\/\/www\.reddit\.com\/user\/([A-Za-z0-9\-\_]+)\/?/gi, "$1").trim();
    $("#username").val(username);
    g_username = username;
    $( "#go" ).button("loading");
    $.ajax({
      url: "/check/" + username,
      type: "GET",
    }).done(function(response) {
      if(response=="OK") {
        //User exists in local DB, forward to profile page
        window.location.href = "/u/"+username;
      } else {
        //No dice, retrieve data from API
        g_username = username;
        call_blockspring();
      }
    });
  });
}

function user_init() {
  g_base_results = $("#user-results").html();
  populate_results(results);  
  $(".feedback .correct, .feedback .incorrect").click(function() {
    key = $(this).data("key");
    value = $(this).data("value");
    feedback = $(this).data("feedback");
    send_feedback(key, value, feedback);
    feedback_container = $(this).parent();
    feedback_container.html("<span class='thanks'>Thanks!</span>");
    feedback_container.fadeOut(1000,function() {
      $(this).html(feedback?"<i class='fa fa-check correct_done'></i>":"<i class='fa fa-close incorrect_done'></i>");
    }).fadeIn(200);
    return false;
  });
  $("#go").click(function(event) {
    $("#go").button("loading");
    event.preventDefault();
    if(!g_username) return;
    call_blockspring();
  });  
}