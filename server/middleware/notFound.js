/** Returns the API's consistent response for an unmatched route. */
const notFound = (req, res) => {
  res.status(404).json({
    success: false,
    message: "Route not found",
  });
};

module.exports = notFound;
