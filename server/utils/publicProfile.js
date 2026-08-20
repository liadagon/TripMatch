const PUBLIC_PROFILE_FIELDS = [
  "name",
  "age",
  "location",
  "tripLocation.name",
  "tripLocation.city",
  "tripLocation.state",
  "tripLocation.country",
  "tripLocation.countryCode",
  "bio",
  "interests",
  "preferredDestinations",
  "travelStyle",
  "budget",
  "tripDates",
  "photo",
  "photoURL",
].join(" ");

module.exports = PUBLIC_PROFILE_FIELDS;
