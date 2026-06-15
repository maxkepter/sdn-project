/**
 * User Controller.
 * Handles user-related request and response cycles.
 */
exports.getProfile = async (req, res, next) => {
  try {
    const userId = req.user.id;

    // Stub user database retrieval
    const user = {
      id: userId,
      username: 'dev_user',
      email: 'dev@example.com',
      role: req.user.role,
    };

    res.status(200).json({
      success: true,
      data: user,
    });
  } catch (error) {
    next(error);
  }
};
