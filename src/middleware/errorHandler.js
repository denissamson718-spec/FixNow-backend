function errorHandler(error, req, res, next) {
  if (res.headersSent) {
    next(error);
    return;
  }

  res.status(500).json({
    success: false,
    message: error?.message || "Unexpected backend error."
  });
}

module.exports = {
  errorHandler
};
