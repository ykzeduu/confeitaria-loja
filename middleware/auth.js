function requireCustomer(req, res, next) {
  if (!req.session.customerId) {
    return res.status(401).json({ error: 'Você precisa estar logado.' });
  }
  next();
}

function requireAdmin(req, res, next) {
  if (!req.session.adminId) {
    return res.status(401).json({ error: 'Acesso restrito ao administrador.' });
  }
  next();
}

module.exports = { requireCustomer, requireAdmin };
