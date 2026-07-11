const sellerCheck = (req, res, next) => {
  if (req.user && req.user.role === "seller") {
    return next();
  }
  return res.status(403).json({ success: false, message: "Seller access required." });
};

module.exports = sellerCheck;
