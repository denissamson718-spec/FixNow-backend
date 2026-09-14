function errorHandler(error, req, res, next) {
  if (res.headersSent) {
    next(error);
    return;
  }

  res.status(error?.status === 409 ? 409 : 500).json({
    success: false,
    message: error?.status === 409 ? error.message : "Unexpected backend error. Please try again."
  });
}

module.exports = {
  errorHandler
};
