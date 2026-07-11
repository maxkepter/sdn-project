const jwt = require("jsonwebtoken");
const { User } = require("../../../models");
const environment = require("../../../config/environment");

exports.bypassLogin = async (req, res, next) => {
  try {
    let user = await User.findOne({ role: "seller" });
    if (!user) {
      user = await User.create({
        username: "seller",
        email: "seller@test.com",
        password: "$2a$10$dummyhashedpassword",
        role: "seller",
      });
    }
    const token = jwt.sign({ id: user._id, role: user.role }, environment.jwtSecret, { expiresIn: "7d" });
    res.json({
      token,
      user: { id: user._id, username: user.username, email: user.email, role: user.role },
      message: "Bypass auth: logged in as seller",
    });
  } catch (err) {
    next(err);
  }
};
