var http = require("http"),
  path = require("path"),
  methods = require("methods"),
  express = require("express"),
  bodyParser = require("body-parser"),
  session = require("express-session"),
  cors = require("cors"),
  passport = require("passport"),
  errorhandler = require("errorhandler"),
  mongoose = require("mongoose");

const {
  EdgeFeatureHubConfig,
  ClientContext,
  Readyness,
  featurehubMiddleware,
  GoogleAnalyticsCollector,
  StrategyAttributeCountryName,
  StrategyAttributeDeviceName,
  StrategyAttributePlatformName,
  FeatureHubPollingClient,
  fhLog,
} = require("featurehub-javascript-node-sdk");

const { userFeatureHubMiddleware } = require("./middlewares/fhubmiddleware");

if (
  process.env.FEATUREHUB_EDGE_URL === undefined ||
  process.env.FEATUREHUB_CLIENT_API_KEY === undefined
) {
  console.error(
    "You must define the location of your FeatureHub Edge URL in the environment variable FEATUREHUB_EDGE_URL, and your API Key in FEATUREHUB_CLIENT_API_KEY",
  );
  process.exit(-1);
}

var isProduction = process.env.NODE_ENV === "production";

// Create global app object
var app = express();

app.use(cors());

// Normal express config defaults
app.use(require("morgan")("dev"));
app.use(bodyParser.urlencoded({ extended: false }));
app.use(bodyParser.json());

app.use(require("method-override")());
app.use(express.static(__dirname + "/public"));

app.use(
  session({
    secret: "conduit",
    cookie: { maxAge: 60000 },
    resave: false,
    saveUninitialized: false,
  }),
);

const fhConfig = new EdgeFeatureHubConfig(
  process.env.FEATUREHUB_EDGE_URL,
  process.env.FEATUREHUB_CLIENT_API_KEY,
);

fhConfig.init();
app.use(featurehubMiddleware(fhConfig.repository()));
app.use(userFeatureHubMiddleware(fhConfig));

if (!isProduction) {
  app.use(errorhandler());
}

if (isProduction) {
  mongoose.connect(process.env.MONGODB_URI);
} else {
  mongoose.connect("mongodb://localhost/conduit");
  mongoose.set("debug", true);
}

require("./models/User");
require("./models/Article");
require("./models/Comment");
require("./config/passport");

app.use(require("./routes"));

/// catch 404 and forward to error handler
app.use(function (req, res, next) {
  var err = new Error("Not Found");
  err.status = 404;
  next(err);
});

/// error handlers

// development error handler
// will print stacktrace
if (!isProduction) {
  app.use(function (err, req, res, next) {
    console.log(err.stack);

    res.status(err.status || 500);

    res.json({
      errors: {
        message: err.message,
        error: err,
      },
    });
  });
}

// production error handler
// no stacktraces leaked to user
app.use(function (err, req, res, next) {
  res.status(err.status || 500);
  res.json({
    errors: {
      message: err.message,
      error: {},
    },
  });
});

process.on("SIGINT", () => {
  console.log("closing FH client");
  fhConfig.close();
  app.close(() => console.log("Shut down server..."));
  process.exit(0);
});

let initialized = false;
console.log("Waiting for features...");
fhConfig.addReadynessListener((ready) => {
  if (!initialized) {
    if (ready == Readyness.Ready) {
      console.log("Features are available, starting server...");
      initialized = true;
      var server = app.listen(process.env.PORT || 3000, function () {
        console.log("Listening on port " + server.address().port);
      });
    }
  }
});

// // finally, let's start our server...
// var server = app.listen(process.env.PORT || 3000, function () {
//   console.log("Listening on port " + server.address().port);
// });
