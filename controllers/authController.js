export const getCurrentUser = (req, res) => {
  if (!req.isAuthenticated()) {
    return res.status(401).json({ user: null });
  }
//   const user = {
//   username: req.user.username,
//   avatarUrl: req.user.avatarUrl|| '',
// };
// console.log("user"+ req.user);
  res.json(req.user);
};

export const logoutUser = (req, res) => {
  req.logout(err => {
    if (err) return res.status(500).json({ error: 'Logout failed' });
    res.json({ success: true });
  });
};
