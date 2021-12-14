// function FeatureHubMiddleware(req, res, next) {
//   console.log("Request URL:", req.originalUrl);
//   next();
// }

// const { FeatureHubConfig } = require("./feature_hub_config");

function userFeatureHubMiddleware(fhConfig) {
  return (req, res, next) => {
    // const user = detectUser(req); // function to analyse the Bearer token and determine who the user is
    let fhClient = fhConfig.newContext();
    // if (user) {
    //   fhClient = fhClient.userKey(user.email);
    //   // add anything else relevant to the context
    // }
    fhClient = fhClient.build().then((valFhClient) => {
      req.featureContext = valFhClient;
      next();
    });
  };
}

module.exports = {
  userFeatureHubMiddleware: userFeatureHubMiddleware,
};
