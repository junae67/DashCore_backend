// Validación de correo electrónico mediante Regex
function isValidEmail(email) {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  }
  
  // Validación de nombre (mínimo 3 caracteres)
  function isValidName(name) {
    return typeof name === 'string' && name.length >= 3;
  }
  
  // Validación de ID (numérico y único)
  function isValidId(id, users) {
    const isNumeric = !isNaN(id);
    const isUnique = !users.some(user => user.id === id);
    return isNumeric && isUnique;
  }
  
  // Función principal de validación
  function validateUser(user, users) {
    const errors = [];
    
    if (!isValidName(user.name)) {
      errors.push("El nombre debe tener al menos tres caracteres");
    }
    
    if (!isValidEmail(user.email)) {
      errors.push("El correo electrónico no es válido");
    }
    
    if (!isValidId(user.id, users)) {
      errors.push("El ID debe de ser numérico y único");
    }
    
    return {
      isValid: errors.length === 0,
      errors: errors
    };
  }

  module.exports = {
    isValidEmail,
    isValidName,
    isValidId,
    validateUser
  };
