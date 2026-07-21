const jwt = require("jsonwebtoken");
const { User } = require("../../../models");
const environment = require("../../../config/environment");

exports.bypassLogin = async (req, res, next) => {
  try {
    // ponytail: prefer the seeded seller so bypass matches seeded products + orders.
    let user = await User.findOne({ email: "seller@test.com", role: "seller" });
    if (!user) {
      user = await User.findOne({ role: "seller" });
    }
    if (!user) {
      const bcrypt = require("bcryptjs");
      user = await User.create({
        username: "seller",
        email: "seller@test.com",
        password: await bcrypt.hash("password123", 10),
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
