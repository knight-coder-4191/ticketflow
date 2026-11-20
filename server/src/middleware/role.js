/**
 * Role-Based Access Control (RBAC) Middleware
 * Restricts route access to specified roles
 */
function authorize(...allowedRoles) {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        message: 'Authentication required before checking permissions.'
      });
    }

    if (!allowedRoles.includes(req.user.role)) {
      return res.status(403).json({
        success: false,
        message: `Access denied. Route requires one of [${allowedRoles.join(', ')}] role(s). Your role is: ${req.user.role}.`
      });
    }

    next();
  };
}

module.exports = { authorize };
