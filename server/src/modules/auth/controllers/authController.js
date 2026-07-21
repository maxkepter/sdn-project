const jwt = require("jsonwebtoken");
const bcrypt = require("bcryptjs");
const { User } = require("../../../models");
const environment = require("../../../config/environment");

const createToken = (user) => {
  return jwt.sign({ id: user._id, role: user.role }, environment.jwtSecret, { expiresIn: "7d" });
};

exports.login = async (req, res, next) => {
  try {
    const { email, password } = req.body;
    const user = await User.findOne({ email });
    if (!user) return res.status(401).json({ message: "Invalid credentials" });

    const match = await bcrypt.compare(password, user.password);
    if (!match) return res.status(401).json({ message: "Invalid credentials" });

    const token = createToken(user);
    res.json({
      token,
      user: { id: user._id, username: user.username, email: user.email, role: user.role },
    });
  } catch (err) {
    next(err);
  }
};

exports.register = async (req, res, next) => {
  try {
    const { firstName, lastName, email, password, accountType } = req.body;

    const exists = await User.findOne({ email });
    if (exists) return res.status(400).json({ message: "User already exists" });

    // Auto-generate username from email + random string
    const baseName = email.split('@')[0];
    const randomSuffix = Math.floor(1000 + Math.random() * 9000);
    const username = `${baseName}_${randomSuffix}`;

    // Map accountType to role
    const role = accountType === "Business" ? "seller" : "buyer";

    const hashed = await bcrypt.hash(password, 10);
    const user = await User.create({ 
      username, 
      firstName,
      lastName,
      email, 
      password: hashed, 
      role 
    });

    const token = createToken(user);
    res.status(201).json({
      token,
      user: { 
        id: user._id, 
        username: user.username, 
        firstName: user.firstName,
        lastName: user.lastName,
        email: user.email, 
        role: user.role 
      },
    });
  } catch (err) {
    next(err);
  }
};

exports.getProfile = async (req, res, next) => {
  try {
    const user = await User.findById(req.user._id).select("-password");
    res.json({ success: true, data: user });
  } catch (err) {
    next(err);
  }
};

exports.upgradeToSeller = async (req, res, next) => {
  try {
    const user = await User.findById(req.user._id);
    if (!user) return res.status(404).json({ message: "User not found" });

    user.role = "seller";
    await user.save();

    const token = createToken(user);
    res.json({
      success: true,
      token,
      user: {
        id: user._id,
        username: user.username,
        firstName: user.firstName,
        lastName: user.lastName,
        email: user.email,
        role: user.role
      }
    });
  } catch (err) {
    next(err);
  }
};
