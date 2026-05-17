module.exports.isLoggedIn = function(req, res, next) {
    if (req.session && req.session.user) return next();
    req.flash('error', 'You must be logged in to access that page.');
    return res.redirect('/login');
}

module.exports.isAdmin = function(req, res, next) {
    if (req.session && req.session.user && req.session.user.role === 'admin') return next();
    if (req.session && req.session.user) {
        req.flash('error', 'Access Denied: Admins only.');
        return res.redirect('/');
    }
    req.flash('error', 'You must be logged in to access that page.');
    return res.redirect('/login');
}