/*** Amadeus online swagger
 * https://developers.amadeus.com/self-service/category/air
 * More documentations
 * https://amadeus4dev.github.io/amadeus-node/#flightdestinations
 */

var Amadeus = require("amadeus");
var router = require("express").Router();
var map = require("lodash/map");
var isEmpty = require("lodash/isEmpty");

let amadeus = new Amadeus({
  clientId: "IA564C4s6ciTyZ4WAF5JI9K4K0l03Soe",
  clientSecret: "botcysSSVZYQmUvJ",
});

const mapResponse = (data) => {
  if (!isEmpty(data)) {
    const mapData = map(data, (d) => {
      const {
        name,
        iataCode,
        address: { countryCode, countryName },
      } = d;
      return {
        name,
        iataCode,
        countryCode,
        countryName,
      };
    });
    return mapData;
  }
  return data;
};

const parseResponse = (response) => {
  let rowCount = 0;
  let resultData = [];
  if (response && !isEmpty(response)) {
    const {
      data,
      meta: { count },
    } = response.result;
    rowCount = count;
    resultData = resultData.concat(data);
  }

  if (rowCount > 0) {
    return {
      count: rowCount,
      data: resultData,
    };
  }
  return {
    count: 0,
    data: [],
  };
};

// flight inspiration search
router.get("/locations", function (req, res) {
  const {
    query: { keyword, pageLimit, pageOffset },
  } = req;

  let resultData = [];
  return amadeus.referenceData.locations
    .get({
      keyword: keyword,
      subType: Amadeus.location.any,
      "page[limit]": pageLimit || 10,
      "page[offset]": pageOffset || 0,
    })
    .then((response) => {
      const { count, data } = parseResponse(response);
      if (count > 0) {
        resultData = resultData.concat(data);
      }
      return amadeus.next(response);
    })
    .then((nextResponse) => {
      const { count, data } = parseResponse(nextResponse);
      if (count > 0) {
        resultData = resultData.concat(data);
      }
      return resultData;
    })
    .then((data) => {
      const mapData = mapResponse(data);
      return res.status(200).json(mapData);
    })
    .catch(function (responseError) {
      console.log(responseError);
      throw new Error(responseError.code);
    });
});

// post flight offers
router.post("/flight-offers", function (req, res) {
  const { body } = req;
  if (!body) {
    throw new Error(" Not a valid request");
  }

  const { origin, destination, departDate, returnDate, currencyCode, adults } =
    body || {};

  return amadeus.shopping.flightOffersSearch
    .post(
      JSON.stringify({
        currencyCode: currencyCode,
        originDestinations: [
          {
            id: "1",
            originLocationCode: origin,
            destinationLocationCode: destination,
            departureDateTimeRange: {
              date: departDate,
              time: "10:00:00",
            },
          },
          {
            id: "2",
            originLocationCode: destination,
            destinationLocationCode: origin,
            departureDateTimeRange: {
              date: returnDate,
              time: "17:00:00",
            },
          },
        ],
        travelers: [
          {
            id: "1",
            travelerType: "ADULT",
            fareOptions: ["STANDARD"],
          },
          {
            id: "2",
            travelerType: "CHILD",
            fareOptions: ["STANDARD"],
          },
        ],
        sources: ["GDS"],
        searchCriteria: {
          maxFlightOffers: 50,
          flightFilters: {
            cabinRestrictions: [
              {
                cabin: "BUSINESS",
                coverage: "MOST_SEGMENTS",
                originDestinationIds: ["1"],
              },
            ],
            carrierRestrictions: {
              excludedCarrierCodes: ["AA", "TP", "AZ"],
            },
          },
        },
      })
    )
    .then(function (response) {
      const { data, meta } = response.result;
      console.log("received data", meta);
      console.log("received data", data[0]);
      return res.status(200).json(response.result);
    })
    .catch(function (responseError) {
      console.log(responseError);
      throw new Error(responseError.code);
    });
});

module.exports = router;
